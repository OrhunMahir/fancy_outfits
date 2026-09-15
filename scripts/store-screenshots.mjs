// Store screenshots, taken from the real game rather than mocked up: launches
// the Electron shell against the dev server (so the DEV panel can deal any
// board on demand), sets the viewport to Steam's 1920x1080, walks through the
// states worth showing and captures each over the DevTools protocol.
//
//   npm run dev            (in another terminal)
//   node scripts/store-screenshots.mjs [--url http://localhost:5173]
//
// Output: assets/store/screenshots/NN-name.png. Re-run whenever the UI changes;
// the shots are generated, not hand-made, like everything else in assets/.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const PORT = 9511 + (process.pid % 90);
const urlArg = process.argv.indexOf("--url");
const DEV_URL = urlArg > 0 ? process.argv[urlArg + 1] : "http://localhost:5173";
const OUT = "assets/store/screenshots";
// Steam wants 1920x1080. Rendering 1280x720 at 1.5x device pixels gives exactly
// that file size with a UI that fills it, instead of a 1080p desk lost in navy.
const W = 1280, H = 720, SCALE = 1.5;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForTarget(timeoutMs = 60000){
  const deadline = Date.now() + timeoutMs;
  while(Date.now() < deadline){
    try{
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if(page) return page;
    }catch(e){}
    await sleep(500);
  }
  throw new Error("no devtools target");
}

async function connect(page){
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = e => { const m = JSON.parse(e.data); if(pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}) => new Promise(res => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expr => {
    const m = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if(m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.text + " :: " + expr);
    return m.result?.result?.value;
  };
  const waitFor = async (expr, what, timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    while(Date.now() < deadline){ const v = await evaluate(expr); if(v) return v; await sleep(200); }
    throw new Error("timed out waiting for " + what);
  };
  return { ws, send, evaluate, waitFor };
}

const click = (cdp, expr) => cdp.evaluate(`(() => { const el = ${expr}; if(!el) return false; el.click(); return true; })()`);
const byText = (sel, re) => `[...document.querySelectorAll('${sel}')].find(b => ${re}.test(b.textContent || ''))`;

const userData = mkdtempSync(join(tmpdir(), "fo-shots-"));
const child = spawn(electronPath, [".", `--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`],
  { stdio: "ignore", env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL } });
mkdirSync(OUT, { recursive: true });

let shots = 0;
try{
  const cdp = await connect(await waitForTarget());
  await cdp.send("Page.bringToFront");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await cdp.waitFor(`document.querySelector('h2') ? 1 : 0`, "start screen");
  // The DEV button is a development affordance; a store shot must not show it.
  await cdp.evaluate(`document.head.insertAdjacentHTML('beforeend','<style>.dev-open{display:none!important}</style>')`);

  const shot = async (name, settleMs = 700) => {
    await sleep(settleMs);
    const m = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(OUT, `${String(++shots).padStart(2, "0")}-${name}.png`);
    writeFileSync(file, Buffer.from(m.result.data, "base64"));
    console.log("shot ", file);
  };
  const dev = async label => {
    await click(cdp, `document.querySelector('.dev-open')`);
    await cdp.waitFor(`document.querySelector('.dev-x') ? 1 : 0`, "dev panel");
    await click(cdp, byText("button", "/Close open board/"));   // clear whatever the last shot left open
    await sleep(200);
    if(!await click(cdp, byText("button", label))) throw new Error("no dev button matching " + label);
    await sleep(300);
    await click(cdp, `document.querySelector('.dev-x')`);
    await sleep(300);
  };

  await shot("start-screen", 400);

  await click(cdp, byText("button", "/THE LEGACY/"));
  await cdp.waitFor(`document.querySelector('.intro-skip, .action-primary') ? 1 : 0`, "first-day walkthrough");
  await shot("first-day");
  await click(cdp, `document.querySelector('.intro-skip')`);
  await sleep(400);

  await cdp.waitFor(`document.querySelector('.inbox-item') ? 1 : 0`, "inbox");
  await click(cdp, `document.querySelector('.inbox-item')`);
  await shot("case-file");

  // Boards first: "Close open board" clears an action challenge but not a
  // trial, so the trial has to be the last thing opened.
  await dev("/^Objection \\(court\\)/"); await shot("objection", 900);
  await dev("/^Power Cut$/");           await shot("power-cut", 900);
  await dev("/^Contradiction Board/");  await shot("contradiction");
  await dev("/^Lockpick · SNEAKY 2/");  await shot("lockpick");
  await dev("/^Evidence Timeline/");    await shot("timeline");

  // Clear the last board so the trial opens on a clean desk.
  await click(cdp, `document.querySelector('.dev-open')`);
  await cdp.waitFor(`document.querySelector('.dev-x') ? 1 : 0`, "dev panel");
  await click(cdp, byText("button", "/Close open board/"));
  await click(cdp, `document.querySelector('.dev-x')`);
  await sleep(300);

  await dev("/^Trial · /");            await shot("trial", 900);

  cdp.ws.close();
}finally{
  child.kill();
  await sleep(300);
  rmSync(userData, { recursive: true, force: true });
}
console.log(`${shots} screenshots in ${OUT}/ at ${W*SCALE}x${H*SCALE}`);
