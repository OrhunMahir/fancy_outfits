// A trailer, recorded from the running game rather than edited by hand.
//
//   npm run dev                      (in another terminal)
//   node scripts/store-trailer.mjs
//
// Output: assets/store/trailer/fancy-outfits-trailer.mp4 (1920x1080, ~28s, SILENT —
//           the game's ambience is Web Audio and CDP screencast carries no sound)
//         assets/store/trailer/cover.gif (630x500, animated itch cover)
//
// Recording is done in SEGMENTS: the screencast runs only while a beat is on
// screen and is stopped while the dev panel is used to set up the next one, so
// the panel never appears in the film and no post-editing is needed. Frames
// arrive only when the page changes, so each one is written with the wall-clock
// gap before it and ffmpeg's concat demuxer replays the real timing.

import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLogo, LOGO_SIZE } from "../src/game/logo.js";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const PORT = 9611 + (process.pid % 80);
const urlArg = process.argv.indexOf("--url");
const DEV_URL = urlArg > 0 ? process.argv[urlArg + 1] : "http://localhost:5173";
const OUT = resolve("assets/store/trailer");
const W = 1280, H = 720, SCALE = 1.5;          // frames land at 1920x1080
const FPS = 30;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForTarget(timeoutMs = 60000){
  const deadline = Date.now() + timeoutMs;
  while(Date.now() < deadline){
    try{
      const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = t.find(x => x.type === "page" && x.webSocketDebuggerUrl);
      if(page) return page;
    }catch(e){}
    await sleep(500);
  }
  throw new Error("no devtools target");
}

async function connect(page, onFrame){
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if(m.method === "Page.screencastFrame"){
      onFrame(m.params);
      ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck",
        params: { sessionId: m.params.sessionId } }));
      return;
    }
    if(pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expr => {
    const m = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if(m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.text + " :: " + expr);
    return m.result?.result?.value;
  };
  const waitFor = async (expr, what, ms = 20000) => {
    const end = Date.now() + ms;
    while(Date.now() < end){ const v = await evaluate(expr); if(v) return v; await sleep(200); }
    throw new Error("timed out waiting for " + what);
  };
  return { ws, send, evaluate, waitFor };
}

const click = (cdp, expr) => cdp.evaluate(`(() => { const el = ${expr}; if(!el) return false; el.click(); return true; })()`);
const byText = (sel, re) => `[...document.querySelectorAll('${sel}')].find(b => ${re}.test(b.textContent || ''))`;

// ---- end card, rendered with the same offscreen pipeline as the capsules ----
function renderEndCard(work){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">` +
    buildLogo({}).map(s => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`).join("") + `</svg>`;
  const font = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();
  const html = join(work, "endcard.html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:'Press Start 2P';src:url('${font}') format('woff2');font-display:block;}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    body{background:#1a1c2c;font-family:'Press Start 2P',monospace;color:#f4f4f4;
      display:flex;align-items:center;justify-content:center;gap:90px;image-rendering:pixelated}
    body::after{content:"";position:absolute;inset:0;
      background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 2px,transparent 2px 6px)}
    .m{width:430px;height:430px;border:8px solid #3b5dc9}
    .m svg{display:block;width:100%;height:100%}
    .n{display:flex;flex-direction:column;line-height:1.08;font-size:78px}
    .n b{font-weight:400;color:#ffcd75}
    .t{color:#94b0c2;font-size:19px;letter-spacing:.14em;margin-top:34px}
    .r{height:8px;background:#3b5dc9;margin-top:26px}
  </style><body>
    <div class="m">${svg}</div>
    <div class="n"><b>FANCY</b><span>OUTFITS</span>
      <div class="t">A LAWYER SIMULATOR</div><div class="r"></div></div>
  </body>`);
  const out = join(work, "endcard.png");
  const manifest = join(work, "endcard.json");
  writeFileSync(manifest, JSON.stringify([{ html, out, w: 1920, h: 1080, transparent: false }]));
  execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", manifest], { stdio: "ignore" });
  return out;
}

// ---------------------------------------------------------------------------
const work = mkdtempSync(join(tmpdir(), "fo-trailer-"));
mkdirSync(OUT, { recursive: true });
console.log("end card…");
const endCard = renderEndCard(work);

const userData = mkdtempSync(join(tmpdir(), "fo-trailer-ud-"));
// Chromium throttles requestAnimationFrame to nothing in a window it thinks is
// occluded, while CSS compositor animations keep running. That is exactly what a
// first pass looked like: the character walk-in gave 100 frames and every board
// gave one frozen frame. These switches keep the boards actually turning.
const child = spawn(electronPath, [".",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`,
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=CalculateNativeWinOcclusion"],
  { stdio: "ignore", env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL } });

const timeline = [];        // { file, duration }
const beats = [];           // { label, start, end } in seconds
let frameNo = 0, capturing = false, lastAt = 0, segStart = 0;

try{
  const cdp = await connect(await waitForTarget(), params => {
    if(!capturing) return;
    const now = Date.now();
    const gap = lastAt ? (now - lastAt) / 1000 : 1 / FPS;
    lastAt = now;
    const file = join(work, `f${String(++frameNo).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(params.data, "base64"));
    // A long gap means the screen simply held — that is the pause, not a stall.
    // Clamping it here is what collapsed the first cut from 27s to 14.8s.
    // Only ever adjust a frame from THIS segment: the previous segment's last
    // frame carries a stretched duration that the next segment must not clobber.
    if(timeline.length > segStart) timeline[timeline.length - 1].duration = Math.min(gap, 4);
    timeline.push({ file, duration: 1 / FPS });
  });

  await cdp.send("Page.bringToFront");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await cdp.waitFor(`document.querySelector('h2') ? 1 : 0`, "start screen");
  await cdp.evaluate(`document.head.insertAdjacentHTML('beforeend','<style>.dev-open{display:none!important}</style>')`);

  // Record only while a beat is on screen; set-up happens with the camera off.
  const record = async (label, ms) => {
    console.log("  film:", label, ms + "ms");
    const start = timeline.reduce((a, f) => a + f.duration, 0);
    const first = segStart = timeline.length;
    lastAt = 0;
    // An occluded window stops rAF outright — the boards freeze and the
    // screencast starves. Front it before every beat, not just once.
    await cdp.send("Page.bringToFront");
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    capturing = true;
    const t0 = Date.now();
    await sleep(ms);
    capturing = false;
    const elapsed = (Date.now() - t0) / 1000;
    await cdp.send("Page.stopScreencast");
    await sleep(120);
    // The last frame of a segment never gets a duration — no next frame arrives
    // to measure the gap against — so a beat that holds on one still would take
    // 1/30s instead of its four seconds. Stretch it to the real elapsed time.
    const seg = timeline.slice(first);
    if(seg.length){
      const have = seg.reduce((a, f) => a + f.duration, 0);
      if(elapsed > have) seg[seg.length - 1].duration += elapsed - have;
    }
    beats.push({ label, start, end: timeline.reduce((a, f) => a + f.duration, 0), frames: seg.length });
    if(seg.length < ms / 1000 * 4) console.warn(`    ! only ${seg.length} frames — was the window covered?`);
  };
  // Some boards only move when the player does. The lockpick's cylinder sits
  // perfectly still until the tension bar is pushed, which is why a first pass
  // captured exactly one frame of it. Nudge it while the camera runs.
  const drive = async (expr, times, everyMs) => {
    for(let i = 0; i < times; i++){ await click(cdp, expr); await sleep(everyMs); }
  };
  const board = async label => {
    await click(cdp, `document.querySelector('.dev-open')`);
    await cdp.waitFor(`document.querySelector('.dev-x') ? 1 : 0`, "dev panel");
    await click(cdp, byText("button", "/Close open board/"));
    await sleep(200);
    if(!await click(cdp, byText("button", label))) throw new Error("no dev button " + label);
    await sleep(350);
    await click(cdp, `document.querySelector('.dev-x')`);
    await sleep(350);
  };

  await record("start screen", 2200);

  await click(cdp, byText("button", "/THE LEGACY/"));
  await cdp.waitFor(`document.querySelector('.intro-skip') ? 1 : 0`, "walkthrough");
  await click(cdp, `document.querySelector('.intro-skip')`);
  await cdp.waitFor(`document.querySelector('.inbox-item') ? 1 : 0`, "inbox");
  await record("the desk", 2000);

  await click(cdp, `document.querySelector('.inbox-item')`);
  await record("case file", 4200);                 // the text has to be allowed to sit

  await board("/^Power Cut$/");        await record("power cut", 5000);
  await board("/^Objection \\(court\\)/"); await record("objection", 4200);
  await board("/^Lockpick · SNEAKY 2/");
  const pushing = drive(byText("button.lock-nudge-btn", "/^PUSH$/"), 14, 230);
  await record("lockpick", 3600);
  await pushing;

  await click(cdp, `document.querySelector('.dev-open')`);
  await cdp.waitFor(`document.querySelector('.dev-x') ? 1 : 0`, "dev panel");
  await click(cdp, byText("button", "/Close open board/"));
  await click(cdp, `document.querySelector('.dev-x')`);
  await sleep(350);
  await board("/^Trial · /");          await record("trial", 4200);

  cdp.ws.close();
}finally{
  child.kill();
  await sleep(300);
  rmSync(userData, { recursive: true, force: true });
}

if(!timeline.length) throw new Error("no frames captured");
console.log(`${timeline.length} frames`);
for(const b of beats) console.log(`   ${b.label.padEnd(14)} ${b.start.toFixed(1)}s → ${b.end.toFixed(1)}s  (${(b.end - b.start).toFixed(1)}s, ${b.frames} frames)`);

// concat demuxer: real per-frame durations, so pauses stay pauses
const concat = join(work, "concat.txt");
writeFileSync(concat,
  timeline.map(f => `file '${f.file}'\nduration ${f.duration.toFixed(4)}`).join("\n") +
  `\nfile '${timeline[timeline.length - 1].file}'\n`);

const mp4 = join(OUT, "fancy-outfits-trailer.mp4");
console.log("encoding…");
execFileSync("ffmpeg", ["-y", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", concat,
  "-loop", "1", "-t", "3", "-i", endCard,
  "-filter_complex",
  `[0:v]fps=${FPS},scale=1920:1080:flags=neighbor,setsar=1[g];` +
  `[1:v]fps=${FPS},scale=1920:1080:flags=neighbor,setsar=1[e];` +
  `[g][e]xfade=transition=fade:duration=0.5:offset=${(timeline.reduce((a, f) => a + f.duration, 0) - 0.5).toFixed(2)}[v]`,
  "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });

// Animated cover for itch: the most kinetic beat, at the cover's own size.
const gif = join(OUT, "cover.gif");
const kinetic = beats.find(b => b.label === "power cut") || beats[beats.length - 1];
const gifLen = Math.min(5, Math.max(2, kinetic.end - kinetic.start - 0.3));
console.log(`cover gif from "${kinetic.label}" at ${kinetic.start.toFixed(1)}s for ${gifLen.toFixed(1)}s`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error",
  "-ss", kinetic.start.toFixed(2), "-t", gifLen.toFixed(2), "-i", mp4,
  "-filter_complex",
  "fps=14,scale=-1:500:flags=neighbor,crop=630:500,split[a][b];" +
  "[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none",
  gif], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", mp4]).toString().trim();
console.log(`\ntrailer: ${mp4}  ${(+dur).toFixed(1)}s`);
console.log(`cover:   ${gif}`);
