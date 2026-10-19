// The only things the setup screen (setup.html) can do: receive a screen, send back a choice,
// open a folder picker and open OpenFit's source code or license page.
// Only on that local page: the dashboard pages the OpenFit server serves get nothing.
const { contextBridge, ipcRenderer } = require("electron");

if (location.protocol === "file:") contextBridge.exposeInMainWorld("openfit", {
  onScreen: (show) => ipcRenderer.on("setup:screen", (_event, screen) => show(screen)),
  ready: () => ipcRenderer.send("setup:ready"),
  choose: (choice) => ipcRenderer.send("setup:choice", choice),
  pickFolder: () => ipcRenderer.invoke("setup:pick-folder"),
  openSource: (page) => ipcRenderer.send("setup:open-source", page),
});
