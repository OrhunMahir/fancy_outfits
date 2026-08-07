"use strict";
// Electron shell for FANCY OUTFITS. The game is a Vite+React app under src/;
// this wrapper loads the built output (dist/) for the Steam desktop target.
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

// Windows: some GPU drivers leave the Electron window unpainted/frozen when
// hardware acceleration is on. This is a 2D pixel game — software compositing
// is plenty, and it removes the most common "hangs on startup" report.
app.disableHardwareAcceleration();

function createWindow(){
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 640,
    backgroundColor: "#1a1c2c",                 // matches --bg so startup doesn't flash white
    title: "FANCY OUTFITS",
    show: false,                                // reveal only once painted (no blank/frozen window)
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  // Launch MAXIMIZED, not forced-fullscreen: fullscreen-at-launch is the other
  // classic Windows freeze, and a removed menu bar makes a black fullscreen a trap.
  win.maximize();
  win.once("ready-to-show", () => win.show());

  // F11 toggles fullscreen; Esc leaves it (Esc still reaches the game otherwise).
  win.webContents.on("before-input-event", (e, input) => {
    if(input.type !== "keyDown") return;
    if(input.key === "F11"){ win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if(input.key === "Escape" && win.isFullScreen()){ win.setFullScreen(false); e.preventDefault(); }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if(devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if(process.platform !== "darwin") app.quit(); });
