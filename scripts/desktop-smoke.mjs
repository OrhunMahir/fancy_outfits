// End-to-end check of the PACKAGED-SHAPED desktop app: launches the Electron
// shell, drives the real renderer over the DevTools protocol, and proves the
// things a unit test cannot — that the window actually painted, that the
// bundled font resolved, that nothing reached for the network, and that a save
// written to the user-data folder is still there after a restart.
//
// Cross-platform on purpose: it is the body of the Windows CI job, but it has to
// be runnable on the maintainer's Mac too, or the job could only be debugged by
// pushing to CI and waiting.
//
//   node scripts/desktop-smoke.mjs [--keep]
//
// Runs against an isolated --user-data-dir, so it never touches real saves.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const PORT = 9411 + (process.pid % 90);
const KEEP = process.argv.includes("--keep");

const fail = msg => { console.error("FAIL  " + msg); process.exitCode = 1; };
const pass = msg => console.log("ok    " + msg);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForTarget(timeoutMs = 60000){
  const deadline = Date.now() + timeoutMs;
  while(Date.now() < deadline){
    try{
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if(page) return page;
    }catch(e){ /* devtools not up yet */ }
    await sleep(500);
  }
  return null;
}

// Minimal CDP client. Node 22 has a global WebSocket, so no dependency.
async function connect(page){
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if(pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}) => new Promise(res => {
    const mine = ++id;
    pending.set(mine, res);
    ws.send(JSON.stringify({ id: mine, method, params }));
  });
  const evaluate = async expr => {
    const m = await send("Runtime.evaluate",
      { expression: expr, returnByValue: true, awaitPromise: true });
    if(m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.text + " :: " + expr);
    return m.result?.result?.value;
  };
  // The devtools target exists before React has mounted; poll rather than race.
  const waitFor = async (expr, what, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while(Date.now() < deadline){
      const v = await evaluate(expr);
      if(v) return v;
      await sleep(250);
    }
    throw new Error("timed out waiting for " + what);
  };
  return { ws, send, evaluate, waitFor };
}

function launch(userDataDir){
  const child = spawn(electronPath,
    [".", `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`],
    { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, VITE_DEV_SERVER_URL: "" } });
  let log = "";
  child.stdout.on("data", d => { log += d; });
  child.stderr.on("data", d => { log += d; });
  return { child, log: () => log };
}

const userData = mkdtempSync(join(tmpdir(), "fo-smoke-"));
console.log("user-data-dir:", userData);
console.log("electron:     ", electronPath);
console.log("platform:     ", process.platform, process.arch);
console.log("");

let first, second;
try{
  // ---- first launch -------------------------------------------------------
  first = launch(userData);
  const page = await waitForTarget();
  if(!page){
    console.error(first.log());
    fail("the app never exposed a page target — the window did not load");
    throw new Error("no target");
  }
  pass("window opened and loaded a page");

  const cdp = await connect(page);
  await cdp.send("Page.bringToFront");

  // The renderer really painted: this is the check a freeze would break.
  let title = "";
  try{
    title = await cdp.waitFor(`document.querySelector('h2')?.textContent || ""`, "the start screen");
  }catch(e){
    title = await cdp.evaluate(`document.body ? document.body.innerText.slice(0,200) : "(no body)"`);
    fail("start screen never rendered; body was " + JSON.stringify(title));
    title = "";
  }
  title.includes("FANCY OUTFITS") ? pass("start screen rendered: " + title)
    : (title && fail("unexpected heading: " + JSON.stringify(title)));

  const marks = await cdp.evaluate(`JSON.stringify({
    bridge: !!window.foStore,
    storeOk: window.foStore ? window.foStore.readAll().ok : null,
    font: document.fonts.check('10px "Press Start 2P"'),
    remote: performance.getEntriesByType('resource').map(r => r.name).filter(n => /^https?:/.test(n)),
    logoRects: document.querySelectorAll('.titlerow svg rect').length,
    devPanel: !!document.querySelector('.dev-open')
  })`);
  const m = JSON.parse(marks);
  m.bridge ? pass("context bridge present") : fail("window.foStore missing — saves would fall back to localStorage");
  m.storeOk === true ? pass("file store readable") : fail("file store reported " + JSON.stringify(m.storeOk));
  m.font ? pass("bundled font loaded") : fail("Press Start 2P did not load — the layout depends on it");
  m.remote.length === 0 ? pass("zero network requests") : fail("app reached the network: " + m.remote.join(", "));
  m.logoRects > 0 ? pass(`logo drawn (${m.logoRects} rects)`) : fail("logo did not draw");
  m.devPanel ? fail("DEV panel shipped in a production build") : pass("no DEV panel");

  // ---- write a save -------------------------------------------------------
  const clicked = await cdp.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /THE LEGACY/.test(x.textContent));
    if(!b) return "";
    b.click();
    return b.textContent.slice(0, 30);
  })()`);
  clicked ? pass("started a run: " + clicked) : fail("could not find a scenario button to start a run");
  await sleep(2500);

  const savesDir = join(userData, "saves");
  const saved = existsSync(savesDir) ? readdirSync(savesDir).filter(f => f.endsWith(".json")) : [];
  saved.length ? pass("save written: " + saved.join(", ")) : fail("no save file appeared under " + savesDir);

  const diag = join(userData, "launch-diagnostics.txt");
  if(existsSync(diag)){
    pass("launch diagnostics written");
    console.log(readFileSync(diag, "utf8").split("\n").slice(0, 6).map(l => "      " + l).join("\n"));
  } else fail("no launch-diagnostics.txt — a hung launch would leave no evidence");

  cdp.ws.close();
  first.child.kill();
  await sleep(2500);

  // ---- relaunch: the save has to come back --------------------------------
  second = launch(userData);
  const page2 = await waitForTarget();
  if(!page2){ fail("the app did not come back up on a second launch"); throw new Error("no target"); }
  const cdp2 = await connect(page2);
  await cdp2.send("Page.bringToFront");
  await cdp2.waitFor(`document.querySelector('h2') ? 1 : 0`, "the start screen on relaunch").catch(() => {});
  const resumed = await cdp2.evaluate(`(() => {
    const c = [...document.querySelectorAll('button')].find(x => /CONTINUE SLOT/.test(x.textContent));
    return c ? c.textContent.slice(0, 40) : "";
  })()`);
  resumed ? pass("save read back after restart: " + resumed)
    : fail("the career did not survive a restart — CONTINUE was not offered");
  cdp2.ws.close();
}catch(e){
  fail("smoke run threw: " + (e && e.message ? e.message : e));
}finally{
  first?.child.kill();
  second?.child.kill();
  await sleep(500);
  if(!KEEP) rmSync(userData, { recursive: true, force: true });
}

console.log("");
console.log(process.exitCode ? "desktop smoke FAILED" : "desktop smoke passed");
