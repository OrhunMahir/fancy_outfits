"use strict";
// Electron-side half of the store asset renderer: one offscreen window, reused
// for every page — creating and destroying a window per capture with a debugger
// attached crashed Electron 43 (SIGTRAP) on the second job. Captures go over the
// DevTools protocol so a transparent background is possible. Electron is already
// a devDependency, so this needs no browser on the machine and runs the same on
// a Mac and on the Windows CI runner.
//
//   electron scripts/lib/capture-main.cjs --manifest jobs.json
//   jobs.json: [{ "html": "/abs/page.html", "out": "/abs/file.png", "w": 920, "h": 430,
//                   "transparent": false, "scale": 1 }]
//   `scale` is the device pixel ratio: 2 renders the same layout at twice the
//   resolution, for assets that have to stay crisp on a retina screen.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const { pathToFileURL } = require("url");

const manifest = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf("--manifest") + 1], "utf8"));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800, height: 600, show: false, frame: false,
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: true }
  });
  win.webContents.setFrameRate(30);
  const dbg = win.webContents.debugger;
  dbg.attach("1.3");

  let failed = false;
  for(const job of manifest){
    try{
      win.setContentSize(job.w, job.h);
      await win.loadURL(pathToFileURL(job.html).toString());
      await win.webContents.executeJavaScript("document.fonts.ready.then(() => true)");
      await dbg.sendCommand("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h, deviceScaleFactor: job.scale || 1, mobile: false });
      if(job.transparent) await dbg.sendCommand("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
      else await dbg.sendCommand("Emulation.setDefaultBackgroundColorOverride", {});
      await new Promise(r => setTimeout(r, 200));
      const { data } = await dbg.sendCommand("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(job.out, Buffer.from(data, "base64"));
      console.log("wrote", job.out, `${job.w * (job.scale || 1)}x${job.h * (job.scale || 1)}`);
    }catch(e){
      failed = true;
      console.error("FAILED", job.out, e && e.message ? e.message : e);
    }
  }
  try{ dbg.detach(); }catch(e){}
  app.exit(failed ? 1 : 0);
});
