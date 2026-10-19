// OpenFit for Windows and macOS: a desktop window onto your progress dashboard.
// It starts OpenFit's own server on a private localhost port (from your OpenFit folder,
// so it reads the same database and .env) and shows /desktop: charts for body weight,
// food and training, plus the AI coach's progress report. Logging stays on the phone app.
// On Windows it also installs OpenFit itself (shipped inside the installer) and runs its Setup.
// Choices before the dashboard (install, update, errors) are screens in the window (setup.html).
const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, shell, Tray } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { isOpenFitDir, setupProblem, startPhoneServer, startServer, stopTree } = require("./server");
const {
  bundledDir,
  defaultInstallDir,
  envValue,
  findExistingOpenFit,
  installFiles,
  isEmptyDir,
  runSetup,
  serverRunning,
  updateAvailable,
  versionOf,
} = require("./install");

const SOURCE_URL = "https://github.com/Vitzso/open-fit";
// From package.json, not app.getVersion(): that says the Electron version when run from source.
const APP_VERSION = require("./package.json").version;
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

// ── The setup screen (setup.html): show(), ask() for a choice, status() for progress ──

let uiReady = Promise.resolve();
let pendingChoice = null;

ipcMain.on("setup:choice", (_event, choice) => {
  const resolve = pendingChoice;
  pendingChoice = null;
  resolve?.(choice);
});
ipcMain.handle("setup:pick-folder", async (event) => {
  const pick = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: "Install OpenFit in…",
    properties: ["openDirectory", "createDirectory"],
  });
  return pick.canceled ? null : (pick.filePaths[0] ?? null);
});
// Only these two addresses: the page can't ask for any other.
ipcMain.on("setup:open-source", (_event, page) => void shell.openExternal(page === "license" ? `${SOURCE_URL}/blob/main/LICENSE` : SOURCE_URL));

function loadSetupUi(win) {
  uiReady = new Promise((resolve) => ipcMain.once("setup:ready", resolve));
  return win.loadFile(path.join(__dirname, "setup.html"));
}

function show(win, screen) {
  void uiReady.then(() => win.webContents.send("setup:screen", { appVersion: APP_VERSION, ...screen }));
}

/** Shows a screen and resolves with the choice: { action, folder, pro }. */
function ask(win, screen) {
  return new Promise((resolve) => {
    pendingChoice = resolve;
    if (!win.isVisible()) showWindow(win); // started hidden, but something needs an answer
    show(win, screen);
  });
}

const status = (win, title, text) => show(win, { screen: "status", title, text });

/** A message with buttons ({ id, label, kind }); resolves with the id of the one clicked. */
async function message(win, tone, title, text, actions, detail) {
  return (await ask(win, { screen: "message", tone, title, text, detail, actions })).action;
}

// ── Finding, installing and updating OpenFit ──

/** Asks for an existing OpenFit folder until one is picked (remembered) or the picker is cancelled. */
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
    const again = await message(win, "warning", "That isn't an OpenFit folder", "Pick the folder with OpenFit's Setup.cmd and package.json in it.", [
      { id: "again", label: "Choose again", kind: "primary" },
      { id: "cancel", label: "Cancel", kind: "quiet" },
    ]);
    if (again !== "again") return null;
  }
}

/**
 * Offers to install the bundled OpenFit. Returns { dir, proTraining } (proTraining is the switch,
 * undefined for an existing folder picked instead), or null to quit.
 */
async function offerInstall(win, bundle) {
  let folder = defaultInstallDir();
  let pro = true;
  for (;;) {
    const choice = await ask(win, { screen: "install", folder, pro });
    folder = choice.folder;
    pro = choice.pro;
    if (choice.action === "quit") return null;
    if (choice.action === "existing") {
      const existing = await pickExistingDir(win);
      if (existing) return { dir: existing };
      continue;
    }
    // A folder that already holds other things gets an OpenFit folder inside it.
    let dir = folder;
    if (!isEmptyDir(dir) && !isOpenFitDir(dir)) dir = path.join(dir, "OpenFit");
    if (!isEmptyDir(dir) && !isOpenFitDir(dir)) {
      await message(win, "warning", "That folder isn't empty", `${dir} already has other files in it. Choose an empty folder, or a new one.`, [
        { id: "ok", label: "Choose another folder", kind: "primary" },
      ]);
      continue;
    }
    status(win, "Installing OpenFit…", dir);
    try {
      installFiles(bundle, dir);
    } catch (err) {
      await message(win, "error", "Couldn't install OpenFit there", err.message, [{ id: "ok", label: "Choose another folder", kind: "primary" }]);
      continue;
    }
    writeConfig({ ...readConfig(), openfitDir: dir });
    return { dir, proTraining: pro };
  }
}

/**
 * OpenFit found on this PC (from its shortcuts or the default folder) the first time the app opens:
 * use it (an update is offered next if this app has a newer one), install a new copy, or pick
 * another folder. Returns { dir } to use, "install", or null to quit.
 */
async function offerExisting(win, dir, bundle) {
  const update = updateAvailable(bundle, dir);
  const { action } = await ask(win, { screen: "existing", folder: dir, found: versionOf(dir), update: update?.to ?? null });
  if (action === "quit") return null;
  if (action === "install") return "install";
  if (action === "other") {
    const other = await pickExistingDir(win);
    return other ? { dir: other } : "install";
  }
  writeConfig({ ...readConfig(), openfitDir: dir });
  return { dir };
}

/**
 * The OpenFit folder: OPENFIT_DIR, the one chosen last time, or the folder this app sits in when
 * run from source (desktop/ inside OpenFit). Otherwise offers one already on this PC, or to install
 * the bundled OpenFit (Windows), or asks where it is. Returns { dir, installed, proTraining } or null.
 */
async function resolveOpenFitDir(win) {
  const candidates = [process.env.OPENFIT_DIR, readConfig().openfitDir, path.resolve(__dirname, "..")];
  const found = candidates.find((d) => d && isOpenFitDir(d));
  if (found) return { dir: found, installed: false };

  const bundle = bundledDir(app);
  if (bundle && process.platform === "win32") {
    const [existing] = findExistingOpenFit(isOpenFitDir);
    if (existing) {
      const choice = await offerExisting(win, existing, bundle);
      if (!choice) return null;
      if (choice !== "install") return { dir: choice.dir, installed: false };
    }
    const picked = await offerInstall(win, bundle);
    return picked && { ...picked, installed: !fs.existsSync(path.join(picked.dir, "node_modules")) };
  }
  const dir = await pickExistingDir(win);
  return dir && { dir, installed: false };
}

/**
 * Copies in a newer bundled OpenFit if the user agrees, with the Pro training switch unless it's
 * already on. Returns { updated, proTraining }.
 */
async function maybeUpdate(win, dir) {
  const bundle = bundledDir(app);
  const update = updateAvailable(bundle, dir);
  if (!update) return { updated: false };
  const proAnswer = envValue(dir, "PRO_TRAINING_OFFERED");
  const choice = await ask(win, {
    screen: "update",
    folder: dir,
    from: update.from,
    to: update.to,
    pro: proAnswer === "yes" ? null : proAnswer !== "no",
  });
  if (choice.action !== "update") return { updated: false };
  // The running server locks files the update replaces (Prisma's engine), so Setup would fail.
  while (await serverRunning()) {
    const again = await message(
      win,
      "warning",
      "Close OpenFit's server window first",
      'OpenFit is running in its "OpenFit server" window, which locks files the update replaces. Close that window, then click Update. You can start it again afterwards.',
      [
        { id: "retry", label: "Update", kind: "primary" },
        { id: "skip", label: "Not now", kind: "quiet" },
      ],
    );
    if (again !== "retry") return { updated: false };
  }
  status(win, "Updating OpenFit…", dir);
  try {
    installFiles(bundle, dir);
    return { updated: true, proTraining: proAnswer === "yes" ? undefined : choice.pro };
  } catch (err) {
    await message(win, "error", "Couldn't update OpenFit", err.message, [{ id: "ok", label: "Continue", kind: "primary" }]);
    return { updated: false };
  }
}

/**
 * Makes sure `dir` can run: runs Setup first when asked (fresh install or update, passing the Pro
 * training answer), and offers it whenever packages or the build are missing. Returns false when
 * the user gives up.
 */
async function ensureReady(win, dir, setupFirst, proTraining) {
  for (let first = true; ; first = false) {
    const problem = setupProblem(dir);
    if (!problem && !(first && setupFirst)) return true;
    if (process.platform !== "win32") {
      await fail(win, "OpenFit isn't ready to open yet", `${problem}. In a terminal, run "npm install && npm run build" in ${dir}, then open OpenFit again.`);
      return false;
    }
    if (!(first && setupFirst)) {
      const choice = await message(
        win,
        "warning",
        "OpenFit isn't ready to open yet",
        `${problem[0].toUpperCase()}${problem.slice(1)}. Setup installs what's missing: it opens in its own window and may ask a few questions.`,
        [
          { id: "setup", label: "Run Setup", kind: "primary" },
          { id: "quit", label: "Quit", kind: "quiet" },
        ],
      );
      if (choice !== "setup") return false;
    }
    status(win, "Setting up OpenFit…", "Follow the steps in the Setup window. This screen carries on by itself when Setup is done.");
    await runSetup(dir, { proTraining: first && setupFirst ? proTraining : undefined });
  }
}

/** Shows an error on the setup screen (switching back to it from the dashboard if needed) and quits. */
async function fail(win, title, text, detail) {
  if (!win.webContents.getURL().startsWith("file:")) await loadSetupUi(win);
  await message(win, "error", title, text, [{ id: "quit", label: "Quit", kind: "primary" }], detail);
  app.quit();
}

// ── The window, the server and the tray ──

let server = null;
let quitting = false;
let tray = null;
// Started with Windows (Start with Windows passes --hidden): run in the tray until opened.
const startHidden = process.argv.includes("--hidden");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: "OpenFit",
    show: !startHidden,
    backgroundColor: "#15181d",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, "preload.js") },
  });
  void loadSetupUi(win);
  status(win, "Opening OpenFit…");
  // Closing the window keeps OpenFit running in the tray, so your phone can still reach it.
  win.on("close", (e) => {
    if (quitting || !tray) return;
    e.preventDefault();
    win.hide();
    if (!readConfig().trayHintShown && process.platform === "win32") {
      tray.displayBalloon({
        iconType: "info",
        title: "OpenFit is still running",
        content: "Your phone can keep using it. To stop OpenFit, right-click its icon here and choose Quit.",
      });
      writeConfig({ ...readConfig(), trayHintShown: true });
    }
  });
  return win;
}

function showWindow(win) {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** True when OpenFit starts with Windows (in the tray). */
const startsWithWindows = () => app.getLoginItemSettings({ args: ["--hidden"] }).openAtLogin;

/** The tray icon: open the dashboard, your phone's addresses (click to copy), Start with Windows, Quit. */
function createTray(win) {
  const icon = nativeImage.createFromPath(path.join(__dirname, "build", "icon.png")).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("OpenFit is running: your phone can connect");
  const build = () =>
    Menu.buildFromTemplate([
      { label: "Open OpenFit", click: () => showWindow(win) },
      { type: "separator" },
      ...(server.phoneUrls?.length
        ? [
            { label: "On your phone (click to copy):", enabled: false },
            ...server.phoneUrls.map((p) => ({ label: `${p.url}  (${p.label})`, click: () => clipboard.writeText(p.url) })),
            { type: "separator" },
          ]
        : []),
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: startsWithWindows(),
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, args: ["--hidden"] });
          tray.setContextMenu(build());
        },
      },
      { type: "separator" },
      { label: server.child ? "Quit OpenFit (stops it for your phone too)" : "Quit OpenFit", click: () => app.quit() },
    ]);
  tray.setContextMenu(build());
  tray.on("click", () => showWindow(win));
}

/**
 * Keeps the window on OpenFit's own pages; any other link opens in the default browser.
 * localhost and 127.0.0.1 on the same port count as our own: Next.js writes redirects (like the one
 * to the passcode page) with "localhost", and unlocking then sent you to the browser.
 */
function lockNavigation(win, baseUrl) {
  const { protocol, port } = new URL(baseUrl);
  const own = [baseUrl, `${protocol}//localhost:${port}`, `${protocol}//127.0.0.1:${port}`];
  const isOwn = (url) => own.some((b) => url === b || url.startsWith(`${b}/`) || url.startsWith(`${b}?`));
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

/**
 * The phone server uses OpenFit's own HTTPS certificate (from its local CA, which Windows doesn't
 * know). The window accepts exactly that certificate, and only from this PC's own server.
 */
function trustOwnCertificate(dir, baseUrl) {
  const { port } = new URL(baseUrl);
  const norm = (pem) => pem.replace(/\r/g, "").trim();
  let ours = null;
  try {
    ours = norm(fs.readFileSync(path.join(dir, "certs", "cert.pem"), "utf8"));
  } catch {
    return;
  }
  app.on("certificate-error", (event, _webContents, url, _error, certificate, callback) => {
    const u = new URL(url);
    if (["localhost", "127.0.0.1"].includes(u.hostname) && u.port === port && norm(certificate.data) === ours) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
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
  const update = await maybeUpdate(win, dir);
  const proTraining = update.updated ? update.proTraining : found.proTraining;
  if (!(await ensureReady(win, dir, found.installed || update.updated, proTraining))) return app.quit();

  status(win, "Starting OpenFit…", "Your phone can connect as soon as it's running.");
  try {
    // Windows: the server your phone uses, so this app is all you need to start. Elsewhere: a private one.
    server = process.platform === "win32" ? await startPhoneServer(dir) : await startServer(dir);
  } catch (err) {
    return fail(win, "OpenFit couldn't start", err.message, (err.log ?? []).slice(-12).join("\n"));
  }
  server.child?.on("exit", (code) => {
    if (!quitting) void fail(win, "The OpenFit server stopped unexpectedly", `Exit code ${code}.`, server.log.slice(-12).join("\n"));
  });

  trustOwnCertificate(dir, server.url);
  lockNavigation(win, server.url);
  createTray(win);
  maybeScreenshot(win);
  const range = process.env.OPENFIT_RANGE ? `?range=${encodeURIComponent(process.env.OPENFIT_RANGE)}` : "";
  await win.loadURL(`${server.url}/desktop${range}`);
}

/** Stops the server this app started (one that was already running is left alone). */
function stopServer() {
  quitting = true;
  stopTree(server?.child);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Opening OpenFit again (its shortcut) brings back the window, even from the tray.
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) showWindow(win);
  });
  app.whenReady().then(main);
  // Closing the window hides it while the tray icon exists (see createWindow); before that (setup
  // cancelled, an error) closing it quits.
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", stopServer);
}
