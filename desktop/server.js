// Finds the OpenFit folder and runs its server: on Windows the one your phone uses (startPhoneServer,
// through the launcher), elsewhere a private localhost one (startServer). Either way it is the same
// server code from the same folder (and .env), so nothing is copied or synced.
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const path = require("node:path");

/** True if `dir` is an OpenFit project folder. */
function isOpenFitDir(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name === "openfit";
  } catch {
    return false;
  }
}

/** What's missing before the server can start in `dir`, or null when it's ready. */
function setupProblem(dir) {
  if (!fs.existsSync(path.join(dir, "node_modules", "next", "package.json"))) return "its packages aren't installed";
  if (!fs.existsSync(path.join(dir, ".next", "BUILD_ID"))) return "the app hasn't been built yet";
  return null;
}

/** A free TCP port on 127.0.0.1. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Resolves once `url` answers (any HTTP status), or rejects after `timeoutMs`. */
function waitForServer(url, child, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    let exited = false;
    child.once("exit", (code) => {
      exited = true;
      reject(new Error(`The OpenFit server stopped (exit code ${code}).`));
    });
    const attempt = () => {
      if (exited) return;
      // OpenFit's HTTPS certificate comes from its own local CA; this only ever asks this PC.
      const req = (url.startsWith("https:") ? https : http).get(url, { rejectUnauthorized: false }, (res) => {
        res.resume();
        resolve();
      });
      req.setTimeout(2000, () => req.destroy());
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("The OpenFit server didn't start in time."));
        else setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

/**
 * Starts `next start` for the OpenFit folder on 127.0.0.1 only (never reachable from the
 * network). Runs on Electron's own Node.js, so the desktop app needs no separate install.
 * Returns the child process, the base URL and the last lines it printed (for error messages).
 */
async function startServer(dir) {
  const port = await freePort();
  const nextBin = path.join(dir, "node_modules", "next", "dist", "bin", "next");
  const log = [];
  const child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: dir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const keep = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) log.push(line);
    if (log.length > 40) log.splice(0, log.length - 40);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  const url = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${url}/manifest.webmanifest`, child);
  } catch (err) {
    if (child.exitCode === null) child.kill();
    err.log = log;
    throw err;
  }
  return { child, url, log };
}

/**
 * Windows: starts OpenFit the way its launcher does (launcher\launch.ps1 -Headless, in a hidden
 * window): the server your phone uses, on your network, with HTTPS when certificates exist, after
 * refreshing them, applying database updates and starting Ollama. If OpenFit is already running
 * (its own window, or log-on autostart), it's used as is and `child` is null.
 * Returns { child, url, phoneUrls: [{ url, label }], log }.
 */
async function startPhoneServer(dir) {
  const ps = fs.existsSync(path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WindowsApps", "pwsh.exe")) ? "pwsh.exe" : "powershell.exe";
  const child = spawn(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(dir, "launcher", "launch.ps1"), "-Headless"], {
    cwd: dir,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const log = [];
  const phoneUrls = [];
  let url = null;
  let already = false;
  let error = null;
  const keep = (chunk) => {
    for (const raw of String(chunk).split(/\r?\n/)) {
      const line = raw.replace(/\x1b\[[0-9;]*m/g, "").trim();
      if (!line) continue;
      let m;
      if ((m = line.match(/^OPENFIT-URL (\S+)/))) url = m[1];
      else if ((m = line.match(/^OPENFIT-READY (\S+)/))) (url = m[1]), (already = true);
      else if ((m = line.match(/^OPENFIT-PHONE (\S+) (.+)$/))) phoneUrls.push({ url: m[1], label: m[2] });
      else if ((m = line.match(/^OPENFIT-ERROR (.+)$/))) error = m[1];
      else log.push(line);
    }
    if (log.length > 60) log.splice(0, log.length - 60);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  const exited = new Promise((resolve) => child.once("exit", resolve));

  // The launcher prints the address before starting the server (or READY and exits if it's running).
  for (let i = 0; !url; i++) {
    const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r(undefined), 250))]);
    if (url) break;
    if (code !== undefined || i > 4 * 180) {
      const err = new Error(error ?? (code === undefined ? "OpenFit didn't start in time." : `OpenFit stopped (exit code ${code}).`));
      err.log = log;
      if (child.exitCode === null) stopTree(child);
      throw err;
    }
  }
  if (already) return { child: null, url, phoneUrls, log };
  try {
    await waitForServer(`${url}/manifest.webmanifest`, child, 180_000);
  } catch (err) {
    stopTree(child);
    err.log = log;
    throw err;
  }
  return { child, url, phoneUrls, log };
}

/** Stops a process and everything it started (the launcher runs npm, which runs node). */
function stopTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill();
}

module.exports = { isOpenFitDir, setupProblem, startPhoneServer, startServer, stopTree };
