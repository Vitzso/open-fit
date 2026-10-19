// OpenFit for Windows and macOS: a desktop window onto your progress dashboard.
// It starts OpenFit's own server on a private localhost port (from your OpenFit folder,
// so it reads the same database and .env) and shows /desktop: charts for body weight,
// food and training, plus the AI coach's progress report. Logging stays on the phone app.
// On Windows it also installs OpenFit itself (shipped inside the installer) and runs its Setup.
const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { isOpenFitDir, setupProblem, startServer } = require("./server");
const { bundledDir, defaultInstallDir, installFiles, isEmptyDir, runSetup, serverRunning, updateAvailable, versionOf } = require("./install");

const CONFIG = () => path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG()), { recursive: true });
  fs.writeFileSync(CONFIG(), JSON.stringify(cfg, null, 2));
}

/** Asks for an existing OpenFit folder until one is picked (remembered) or the dialog is cancelled. */
async function pickExistingDir(win) {
  for (;;) {
    const pick = await dialog.showOpenDialog(win, {
      title: "Where is your OpenFit folder?",
      message: "Choose the OpenFit folder (the one with Setup.cmd and package.json in it).",
      properties: ["openDirectory"],
    });
    if (pick.canceled || !pick.filePaths[0]) return null;
    if (isOpenFitDir(pick.filePaths[0])) {
      writeConfig({ ...readConfig(), openfitDir: pick.filePaths[0] });
      return pick.filePaths[0];
    }
    await dialog.showMessageBox(win, { type: "warning", message: "That isn't an OpenFit folder.", detail: "Pick the folder that contains OpenFit's package.json." });
  }
}

/** Offers to install the bundled OpenFit. Returns the folder it went into, or null. */
async function offerInstall(win, bundle) {
  for (;;) {
    const { response } = await dialog.showMessageBox(win, {
      type: "question",
      title: "Install OpenFit",
      message: "Install OpenFit on this PC?",
      detail:
        `OpenFit ${versionOf(bundle)} will be installed in ${defaultInstallDir()}. Setup then opens in its own window ` +
        "and installs what OpenFit needs (Node.js, the AI coach and the rest). The first time takes about 5 to 15 " +
        "minutes. Everything stays on this PC.",
      buttons: ["Install", "Choose folder…", "I already have OpenFit", "Quit"],
      defaultId: 0,
      cancelId: 3,
      noLink: true,
    });
    if (response === 3) return null;
    if (response === 2) {
      const existing = await pickExistingDir(win);
      if (existing) return existing;
      continue;
    }
    let dir = defaultInstallDir();
    if (response === 1) {
      const pick = await dialog.showOpenDialog(win, { title: "Install OpenFit in…", properties: ["openDirectory", "createDirectory"] });
      if (pick.canceled || !pick.filePaths[0]) continue;
      dir = pick.filePaths[0];
      if (!isEmptyDir(dir) && !isOpenFitDir(dir)) dir = path.join(dir, "OpenFit");
    }
    if (!isEmptyDir(dir) && !isOpenFitDir(dir)) {
      await dialog.showMessageBox(win, { type: "warning", message: `${dir} already has other files in it.`, detail: "Choose another folder." });
      continue;
    }
    setStatus(win, "Installing OpenFit…");
    try {
      installFiles(bundle, dir);
    } catch (err) {
      await dialog.showMessageBox(win, { type: "error", message: "Couldn't install OpenFit there.", detail: err.message });
      continue;
    }
    writeConfig({ ...readConfig(), openfitDir: dir });
    return dir;
  }
}

/**
 * The OpenFit folder: OPENFIT_DIR, the one chosen last time, or the folder this app sits in when
 * run from source (desktop/ inside OpenFit). Otherwise offers to install the bundled OpenFit
 * (Windows) or asks where it is. `installed` is true for a fresh install.
 */
async function resolveOpenFitDir(win) {
  const candidates = [process.env.OPENFIT_DIR, readConfig().openfitDir, path.resolve(__dirname, "..")];
  const found = candidates.find((d) => d && isOpenFitDir(d));
  if (found) return { dir: found, installed: false };

  const bundle = bundledDir(app);
  if (bundle && process.platform === "win32") {
    const dir = await offerInstall(win, bundle);
    return dir && { dir, installed: !fs.existsSync(path.join(dir, "node_modules")) };
  }
  const dir = await pickExistingDir(win);
  return dir && { dir, installed: false };
}

/** Copies in a newer bundled OpenFit if the user agrees. Returns true when files were updated. */
async function maybeUpdate(win, dir) {
  const bundle = bundledDir(app);
  const update = updateAvailable(bundle, dir);
  if (!update) return false;
  const { response } = await dialog.showMessageBox(win, {
    type: "question",
    title: "Update OpenFit",
    message: `Update OpenFit to ${update.to}?`,
    detail:
      `This app comes with OpenFit ${update.to}; your OpenFit folder (${dir}) has ${update.from}. Updating keeps your ` +
      "data, settings and passcode, then Setup rebuilds the app (a few minutes).",
    buttons: ["Update", "Not now"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response !== 0) return false;
  // The running server locks files the update replaces (Prisma's engine), so Setup would fail.
  while (await serverRunning()) {
    const again = await dialog.showMessageBox(win, {
      type: "warning",
      title: "Update OpenFit",
      message: "Close OpenFit's server window first.",
      detail: 'OpenFit is running in its "OpenFit server" window. Close that window, then click Update. You can start it again afterwards.',
      buttons: ["Update", "Not now"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (again.response !== 0) return false;
  }
  setStatus(win, "Updating OpenFit…");
  try {
    installFiles(bundle, dir);
    return true;
  } catch (err) {
    await dialog.showMessageBox(win, { type: "error", message: "Couldn't update OpenFit.", detail: err.message });
    return false;
  }
}

/**
 * Makes sure `dir` can run: runs Setup first when asked (fresh install or update), and offers it
 * whenever packages or the build are missing. Returns false when the user gives up.
 */
async function ensureReady(win, dir, setupFirst) {
  for (let first = true; ; first = false) {
    const problem = setupProblem(dir);
    if (!problem && !(first && setupFirst)) return true;
    if (process.platform !== "win32") {
      await fail(`OpenFit isn't ready to open yet: ${problem}.`, `In a terminal, run "npm install && npm run build" in ${dir}, then open OpenFit again.`);
      return false;
    }
    if (!(first && setupFirst)) {
      const { response } = await dialog.showMessageBox(win, {
        type: "warning",
        title: "OpenFit",
        message: `OpenFit isn't ready to open yet: ${problem}.`,
        detail: "Setup installs what's missing. It opens in its own window and may ask a few questions.",
        buttons: ["Run Setup", "Quit"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (response !== 0) return false;
    }
    setStatus(win, "Setting up OpenFit… follow the steps in the Setup window.");
    await runSetup(dir);
    setStatus(win, "Opening your progress…");
  }
}

/** The line under the logo on the loading screen. */
function setStatus(win, text) {
  void loading
    .then(() => win.webContents.executeJavaScript(`document.querySelector("p").textContent = ${JSON.stringify(text)}`))
    .catch(() => {});
}

/** Shows an error and quits. */
async function fail(message, detail) {
  await dialog.showMessageBox({ type: "error", title: "OpenFit", message, detail });
  app.quit();
}

let server = null;
let quitting = false;
let loading = Promise.resolve();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: "OpenFit",
    backgroundColor: "#15181d",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  loading = win.loadFile(path.join(__dirname, "loading.html"));
  return win;
}

/** Keeps the window on OpenFit's own pages; any other link opens in the default browser. */
function lockNavigation(win, baseUrl) {
  const isOwn = (url) => url === baseUrl || url.startsWith(`${baseUrl}/`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url) && !isOwn(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (isOwn(url)) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });
}

/** For testing: OPENFIT_SCREENSHOT=<file.png> saves a full-page screenshot of the dashboard and quits. */
function maybeScreenshot(win) {
  const file = process.env.OPENFIT_SCREENSHOT;
  if (!file) return;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  win.webContents.once("did-finish-load", async () => {
    await wait(Number(process.env.OPENFIT_SCREENSHOT_DELAY ?? 4000));
    const [width] = win.getContentSize();
    const height = await win.webContents.executeJavaScript("document.documentElement.scrollHeight");
    win.setContentSize(width, Math.min(height, 6000));
    await wait(1000);
    fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG());
    app.quit();
  });
}

async function main() {
  const win = createWindow();

  const found = await resolveOpenFitDir(win);
  if (!found) return app.quit();
  const { dir } = found;
  const updated = await maybeUpdate(win, dir);
  if (!(await ensureReady(win, dir, found.installed || updated))) return app.quit();

  try {
    server = await startServer(dir);
  } catch (err) {
    return fail("OpenFit couldn't start.", `${err.message}\n\n${(err.log ?? []).slice(-12).join("\n")}`);
  }
  server.child.on("exit", (code) => {
    if (!quitting) void fail("The OpenFit server stopped unexpectedly.", `Exit code ${code}.\n\n${server.log.slice(-12).join("\n")}`);
  });

  lockNavigation(win, server.url);
  maybeScreenshot(win);
  const range = process.env.OPENFIT_RANGE ? `?range=${encodeURIComponent(process.env.OPENFIT_RANGE)}` : "";
  await win.loadURL(`${server.url}/desktop${range}`);
}

function stopServer() {
  quitting = true;
  if (server?.child && server.child.exitCode === null) server.child.kill();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(main);
  // One window and its own server: closing the window quits the app (on macOS too).
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", stopServer);
}
