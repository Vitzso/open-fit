// OpenFit for Windows and macOS: a desktop window onto your progress dashboard.
// It starts OpenFit's own server on a private localhost port (from your OpenFit folder,
// so it reads the same database and .env) and shows /desktop: charts for body weight,
// food and training, plus the AI coach's progress report. Logging stays on the phone app.
const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { isOpenFitDir, setupProblem, startServer } = require("./server");

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

/**
 * The OpenFit folder: OPENFIT_DIR, the one chosen last time, or the folder this app sits
 * in when run from source (desktop/ inside OpenFit). Otherwise asks once and remembers.
 */
async function resolveOpenFitDir() {
  const candidates = [process.env.OPENFIT_DIR, readConfig().openfitDir, path.resolve(__dirname, "..")];
  const found = candidates.find((d) => d && isOpenFitDir(d));
  if (found) return found;

  for (;;) {
    const pick = await dialog.showOpenDialog({
      title: "Where is your OpenFit folder?",
      message: "Choose the OpenFit folder (the one with Setup.cmd and package.json in it).",
      properties: ["openDirectory"],
    });
    if (pick.canceled || !pick.filePaths[0]) return null;
    if (isOpenFitDir(pick.filePaths[0])) {
      writeConfig({ ...readConfig(), openfitDir: pick.filePaths[0] });
      return pick.filePaths[0];
    }
    await dialog.showMessageBox({ type: "warning", message: "That isn't an OpenFit folder.", detail: "Pick the folder that contains OpenFit's package.json." });
  }
}

/** Shows an error and quits. */
async function fail(message, detail) {
  await dialog.showMessageBox({ type: "error", title: "OpenFit", message, detail });
  app.quit();
}

let server = null;
let quitting = false;

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
  win.loadFile(path.join(__dirname, "loading.html"));
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

  const dir = await resolveOpenFitDir();
  if (!dir) return app.quit();
  const problem = setupProblem(dir);
  if (problem) {
    return fail(
      `OpenFit isn't ready to open yet: ${problem}.`,
      process.platform === "win32"
        ? `Double-click Setup.cmd in ${dir}, then open OpenFit again.`
        : `In a terminal, run "npm install && npm run build" in ${dir}, then open OpenFit again.`,
    );
  }

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
