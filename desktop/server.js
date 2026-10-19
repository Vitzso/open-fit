// Finds the OpenFit folder and runs its Next.js server on a private localhost port.
// The desktop app reads the same database as the phone app because it runs the same
// server code from the same folder (and .env) — nothing is copied or synced.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
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
      const req = http.get(url, (res) => {
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

module.exports = { isOpenFitDir, setupProblem, startServer };
