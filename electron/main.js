"use strict";
// Electron shell for FANCY OUTFITS. The game is a Vite+React app under src/;
// this wrapper loads the built output (dist/) for the Steam desktop target.
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow(){
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 640,
    backgroundColor: "#1a1c2c",                 // matches --bg so startup doesn't flash white
    title: "FANCY OUTFITS",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
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
