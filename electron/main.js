"use strict";
// Electron shell for FANCY OUTFITS. The game is a Vite+React app under src/;
// this wrapper loads the built output (dist/) for the Steam desktop target.
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

// ---- persistence ---------------------------------------------------------
// Saves live as files under userData/saves, NOT in localStorage: Steam Cloud
// syncs files by path and cannot sync Chromium's LevelDB. The store itself is
// in electron/store.js so it can be tested without booting Electron.
const { createFileStore } = require("./store.js");
let store = null;
const saveStore = () => (store || (store = createFileStore(path.join(app.getPath("userData"), "saves"))));

ipcMain.on("fo-store:read-all", e => { e.returnValue = saveStore().readAll(); });
ipcMain.on("fo-store:write", (e, key, value) => { e.returnValue = saveStore().write(String(key), String(value)); });
ipcMain.on("fo-store:remove", (e, key) => { e.returnValue = saveStore().remove(String(key)); });

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
function safeDevUrl(raw){
  if(app.isPackaged || !raw) return null;
  try{
    const url = new URL(raw);
    return (url.protocol === "http:" || url.protocol === "https:") && LOCAL_DEV_HOSTS.has(url.hostname)
      ? url.toString()
      : null;
  }catch(e){ return null; }
}

// Windows: some GPU drivers leave the Electron window unpainted/frozen when
// hardware acceleration is on. This is a 2D pixel game — software compositing
// is plenty, and it removes the most common "hangs on startup" report.
//
// FO_GPU=1 puts it back. That exists so the freeze can be A/B'd on a machine
// that actually shows it: "hangs with GPU on, fine with it off" identifies the
// cause, where "it didn't hang" only says the workaround is still in place.
const GPU_FORCED = process.env.FO_GPU === "1";
if(!GPU_FORCED) app.disableHardwareAcceleration();

// A freeze test is only worth running if you can tell the two runs apart. The
// title bar says which mode you are in, and a file written BEFORE the window
// opens means even a launch that never paints leaves evidence behind.
function writeDiagnostics(){
  const fs = require("fs");
  const file = path.join(app.getPath("userData"), "launch-diagnostics.txt");
  const head = [
    "FANCY OUTFITS launch diagnostics",
    "version:        " + app.getVersion(),
    "FO_GPU:         " + (GPU_FORCED ? "1 (hardware acceleration ON)" : "unset (hardware acceleration OFF)"),
    "platform:       " + process.platform + " " + process.arch + " / " + require("os").release(),
    "electron:       " + process.versions.electron + "  chrome " + process.versions.chrome,
    "started:        " + new Date().toISOString(),
  ].join("\n");
  const put = text => {
    try{
      fs.mkdirSync(app.getPath("userData"), { recursive: true });
      fs.writeFileSync(file, text + "\n", "utf8");
    }catch(e){}
    console.log(text);
  };
  // Write the decisive lines FIRST and synchronously: a launch that hangs before
  // painting still has to leave behind which mode it was in.
  put(head + "\ngpu status:     (waiting for the GPU process…)");
  // getGPUFeatureStatus() straight after ready reports the pre-init defaults —
  // identical in both modes, which would defeat the whole point. getGPUInfo
  // resolves only once the GPU process has actually reported in.
  // With acceleration off there is no GPU process, so getGPUInfo never settles.
  // Race it, or the file sits on "waiting…" forever and reads like a bug.
  const timeout = new Promise((_, rej) => setTimeout(() => rej("no GPU process"), 4000));
  Promise.race([app.getGPUInfo("basic"), timeout]).then(info => {
    let status = {};
    try{ status = app.getGPUFeatureStatus() || {}; }catch(e){ status = { error: String(e) }; }
    put(head +
      "\ngpu compositing: " + (status.gpu_compositing || "unknown") +
      "\n2d canvas:       " + (status.gl || status["2d_canvas"] || "unknown") +
      "\ngpu info:       " + JSON.stringify(info, null, 2) +
      "\nfeature status: " + JSON.stringify(status, null, 2));
  }).catch(e => put(head + "\ngpu compositing: none — " + e +
    (GPU_FORCED ? " (unexpected: FO_GPU=1 was set)" : " (expected: acceleration is off)")));
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 640,
    backgroundColor: "#1a1c2c",                 // matches --bg so startup doesn't flash white
    // The suffix only appears when the switch is on, so a tester can see at a
    // glance which run this is. Normal players never get it.
    title: GPU_FORCED ? "FANCY OUTFITS — GPU ON (test build)" : "FANCY OUTFITS",
    show: false,                                // reveal only once painted (no blank/frozen window)
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  // Launch MAXIMIZED, not forced-fullscreen: fullscreen-at-launch is the other
  // classic Windows freeze, and a removed menu bar makes a black fullscreen a trap.
  win.maximize();
  win.once("ready-to-show", () => win.show());

  // The game never opens windows, navigates away, or requests device/browser
  // permissions. Deny all three attack surfaces at the desktop shell boundary.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  // F11 toggles fullscreen; Esc leaves it (Esc still reaches the game otherwise).
  win.webContents.on("before-input-event", (e, input) => {
    if(input.type !== "keyDown") return;
    if(input.key === "F11"){ win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if(input.key === "Escape" && win.isFullScreen()){ win.setFullScreen(false); e.preventDefault(); }
  });

  const devUrl = safeDevUrl(process.env.VITE_DEV_SERVER_URL);
  const devOrigin = devUrl ? new URL(devUrl).origin : null;
  const appFile = path.join(__dirname, "..", "dist", "index.html");
  const appPathname = new URL(pathToFileURL(appFile)).pathname;
  win.webContents.on("will-navigate", (event, target) => {
    try{
      const url = new URL(target);
      const allowed = devOrigin ? url.origin === devOrigin : url.protocol === "file:" && url.pathname === appPathname;
      if(!allowed) event.preventDefault();
    }catch(e){ event.preventDefault(); }
  });
  if(devUrl) win.loadURL(devUrl);
  else win.loadFile(appFile);
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  writeDiagnostics();
  createWindow();
  app.on("activate", () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if(process.platform !== "darwin") app.quit(); });
