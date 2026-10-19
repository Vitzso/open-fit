// Installs and updates OpenFit from the copy the Windows installer ships (desktop/scripts/bundle.mjs),
// and runs OpenFit's own Setup (Setup.cmd) in its own window: Node.js, packages, the AI coach and the rest.
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const MANIFEST = "openfit-files.json";

/** The OpenFit copy shipped with this app, or null (macOS, or run from source without `npm run bundle`). */
function bundledDir(app) {
  const dir = app.isPackaged ? path.join(process.resourcesPath, "openfit") : path.join(__dirname, "bundle", "openfit");
  return fs.existsSync(path.join(dir, MANIFEST)) ? dir : null;
}

function readManifest(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), "utf8"));
  } catch {
    return null;
  }
}

function versionOf(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** -1, 0 or 1, comparing "x.y.z" versions. */
function compareVersions(a, b) {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/** Where a new install goes by default (OPENFIT_INSTALL_DIR overrides it, for testing). */
const defaultInstallDir = () => process.env.OPENFIT_INSTALL_DIR || path.join(os.homedir(), "OpenFit");

/** True when `dir` is missing or empty, so OpenFit can be installed straight into it. */
function isEmptyDir(dir) {
  try {
    return fs.readdirSync(dir).length === 0;
  } catch {
    return !fs.existsSync(dir);
  }
}

/**
 * A newer OpenFit is bundled than the one in `dir`. A git checkout is updated with git instead,
 * so it's never overwritten; any other copy (this app's install, or a downloaded zip) can be.
 */
function updateAvailable(bundle, dir) {
  if (!bundle || fs.existsSync(path.join(dir, ".git"))) return null;
  const from = versionOf(dir);
  const to = versionOf(bundle);
  return compareVersions(to, from) > 0 ? { from, to } : null;
}

/**
 * Copies the bundled OpenFit into `dir` (new install or update). Only OpenFit's own files are
 * written: .env, the database, data/ and certs/ aren't in the bundle, so they're kept. Files an
 * older version installed and the new one no longer has are removed.
 */
function installFiles(bundle, dir) {
  const old = readManifest(dir);
  const prebuilt = fs.existsSync(path.join(bundle, ".next", "BUILD_ID"));
  fs.mkdirSync(dir, { recursive: true });
  // A prebuilt app replaces the old build entirely (no stale pages from an older version).
  if (prebuilt) fs.rmSync(path.join(dir, ".next"), { recursive: true, force: true });
  // New modification times on purpose: Setup sees the changed files and reinstalls packages.
  fs.cpSync(bundle, dir, { recursive: true, force: true });
  // The prebuilt app matches these files: mark it newer than them, so Setup doesn't build it again.
  if (prebuilt) {
    const now = new Date();
    fs.utimesSync(path.join(dir, ".next", "BUILD_ID"), now, now);
  }
  const keep = new Set(readManifest(bundle).files);
  for (const f of old?.files ?? []) {
    if (keep.has(f)) continue;
    const target = path.resolve(dir, f);
    if (target.startsWith(path.resolve(dir) + path.sep)) fs.rmSync(target, { force: true });
  }
}

/** True while OpenFit's own server (the launcher window, port 3000 or 3443) is running on this PC. */
function serverRunning() {
  const open = (port) =>
    new Promise((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port, timeout: 1000 });
      socket.once("connect", () => (socket.destroy(), resolve(true)));
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => (socket.destroy(), resolve(false)));
    });
  return Promise.all([open(3000), open(3443)]).then((r) => r.some(Boolean));
}

/**
 * Runs Setup.cmd in its own console window (it asks questions there) and resolves with its exit
 * code when that window closes. Windows only.
 */
function runSetup(dir, { proTraining } = {}) {
  const setup = path.join(dir, "Setup.cmd");
  // The answer from the app's checkbox, so Setup doesn't ask again (undefined: Setup asks if it needs to).
  const pro = proTraining === undefined ? "" : ` -ProTraining ${proTraining ? "yes" : "no"}`;
  return new Promise((resolve) => {
    // cmd /s /c ""C:\path with spaces\Setup.cmd" -FromDesktop": /s strips the outer quotes.
    const child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `""${setup}" -FromDesktop${pro}"`], {
      cwd: dir,
      detached: true, // its own console window
      stdio: "ignore",
      windowsHide: false,
      windowsVerbatimArguments: true,
    });
    child.on("error", () => resolve(-1));
    child.on("exit", (code) => resolve(code ?? -1));
  });
}

/** A value from the folder's .env, or "" (e.g. PRO_TRAINING_OFFERED). */
function envValue(dir, key) {
  try {
    const m = fs.readFileSync(path.join(dir, ".env"), "utf8").match(new RegExp(`^${key}=["']?([^"'\\r\\n]*)`, "m"));
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

/**
 * OpenFit folders already on this PC (Windows), newest version first: where the OpenFit shortcuts on
 * the Desktop, in the Start menu and in Startup point (Setup makes those), and the default folder.
 */
function findExistingOpenFit(isOpenFitDir) {
  const dirs = new Set([defaultInstallDir()]);
  if (process.platform === "win32") {
    const ps = [
      "$sh = New-Object -ComObject WScript.Shell",
      "foreach ($d in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'), [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Startup')) {",
      "  Get-ChildItem -LiteralPath $d -Filter '*OpenFit*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {",
      "    $l = $sh.CreateShortcut($_.FullName); $l.WorkingDirectory; $l.Arguments } }",
    ].join("\n");
    const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
    for (const line of (r.stdout ?? "").split(/\r?\n/)) {
      const fromArgs = line.match(/"([^"]+)\\launcher\\launch\.ps1"/i);
      const dir = (fromArgs ? fromArgs[1] : line).trim();
      if (dir) dirs.add(path.resolve(dir));
    }
  }
  return [...dirs].filter((d) => isOpenFitDir(d)).sort((a, b) => compareVersions(versionOf(b), versionOf(a)));
}

module.exports = {
  bundledDir,
  compareVersions,
  defaultInstallDir,
  envValue,
  findExistingOpenFit,
  installFiles,
  isEmptyDir,
  runSetup,
  serverRunning,
  updateAvailable,
  versionOf,
};
