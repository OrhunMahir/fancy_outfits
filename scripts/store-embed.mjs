// The top of the itch page, now that it is a browser game: a banner, and the
// picture that sits behind itch's "Run game" button before anyone presses it.
//
//   node scripts/store-embed.mjs
//
// Surveying 444 browser games on itch (top-rated, popular and ten genre lists,
// 2026-09-25): 54% put a banner above the game, and the pages that read as
// finished never leave the pre-launch box as a flat grey rectangle. itch's theme
// carries a background image for that box (.game_frame), shown at natural size
// behind the button, so it is made at exactly the embed size, 960x600, at 1x.
//
// The banner is an <img> itch shows at max-width:100% of the 960 panel, so it is
// rendered at 2x and comes out crisp on a retina screen.
//
// Both are drawn from the game's own art — the office scene and the logo builder —
// so the page never shows a room the game does not.
//
// Output: assets/store/itch-embed/ — banner-N.png, frame-X.png, and two preview
// sheets that mock the real page (the cabinet background, the 960 panel, itch's
// button) at a 1440x900 window, because candidates judged on their own lie.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { buildLogo, LOGO_SIZE } from "../src/game/logo.js";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const { buildSync } = require("esbuild");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "assets/store/itch-embed");
const FONT = pathToFileURL(join(root, "src/fonts/press-start-2p-latin.woff2")).toString();
const CABINET = pathToFileURL(join(root, "assets/store/backgrounds/cabinet/01-notes.png")).toString();
const SHOT = pathToFileURL(join(root, "assets/store/screenshots/03-case-file.png")).toString();

const work = mkdtempSync(join(tmpdir(), "fo-embed-"));

// The office scene lives in a .jsx component; bundle just the two drawing
// functions and render them to a static SVG string.
const sceneMod = join(work, "scene.mjs");
buildSync({
  stdin: {
    contents: `
      import { createElement as h } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { buildScene, SittingChar } from "./src/components/OfficeScene.jsx";
      export function sceneSVG(rank, { decor = {}, rep = 50, sign = null, char = true } = {}){
        const { el, chairX } = buildScene(rank, rep, decor);
        const kids = el.filter(s => s.t === "r").map((s, i) => h("rect", { key: i, x: s.x, y: s.y, width: s.w, height: s.h, fill: s.f }));
        if(char) kids.push(h(SittingChar, { key: "c", x: chairX + 3, r: rank }));
        return renderToStaticMarkup(h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 320 64",
          shapeRendering: "crispEdges", preserveAspectRatio: "none", style: { display: "block", width: "100%", height: "100%" } }, kids));
      }`,
    resolveDir: root, loader: "jsx",
  },
  outfile: sceneMod, bundle: true, platform: "node", format: "esm", jsx: "automatic", logLevel: "error",
  banner: { js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);" },
});
const { sceneSVG } = await import(pathToFileURL(sceneMod).toString());

const svg = rects =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" style="display:block;width:100%;height:100%">` +
  rects.map(s => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`).join("") + `</svg>`;
const MARK = svg(buildLogo({}));

const CSS = `
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;}
body{background:#1a1c2c;font-family:'Press Start 2P',monospace;color:#f4f4f4;image-rendering:pixelated;position:relative;}
.scan::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 3px);}
.abs{position:absolute;}
.gold{color:#ffcd75;} .grey{color:#94b0c2;} .ink{color:#2b2118;}
`;

// ---------- banners (layout in 1x CSS px, captured at 2x) ----------
const WALL4 = "#3d3550";
const banners = {
  // The store capsule, laid out wide. It shares the panel's navy, so it has no edge.
  "banner-1-capsule": { h: 240, body: `
    <div class="abs scan" style="inset:0;display:flex;align-items:center;justify-content:center;gap:40px">
      <div style="width:176px;height:176px;border:5px solid #3b5dc9">${MARK}</div>
      <div style="display:flex;flex-direction:column;line-height:1.08">
        <span class="gold" style="font-size:46px">FANCY</span><span style="font-size:46px">OUTFITS</span>
        <span class="grey" style="font-size:12px;letter-spacing:.14em;margin-top:18px">A LAWYER SIMULATOR</span>
        <div style="height:5px;background:#3b5dc9;margin-top:16px"></div>
      </div>
    </div>` },
  // The name partner suite from the game, with the name on the wall above it:
  // the game's own last caption is "THE NAME IS ON THE WALL."
  "banner-2-name-on-the-wall": { h: 300, body: `
    <div class="abs" style="left:0;top:0;width:960px;height:108px;background:${WALL4}"></div>
    <div class="abs" style="left:0;top:108px;width:960px;height:192px">${sceneSVG(4, { decor: { art: true, fish: true, espresso: true, monitor: true } })}</div>
    <div class="abs" style="left:0;top:22px;width:960px;text-align:center;font-size:40px;letter-spacing:.06em;color:#ffcd75;text-shadow:4px 4px 0 #1f1a2e">FANCY OUTFITS</div>
    <div class="abs" style="left:0;top:80px;width:960px;text-align:center;font-size:10px;letter-spacing:.3em;color:#c9b8e0">A LAWYER SIMULATOR</div>
    <div class="abs scan" style="inset:0"></div>` },
  // First morning to the corner office in one strip: the whole career, left to right.
  "banner-3-the-climb": { h: 260, body: `
    <div class="abs" style="left:0;top:68px;width:480px;height:192px;overflow:hidden">
      <div style="width:960px;height:192px">${sceneSVG(0)}</div></div>
    <div class="abs" style="left:480px;top:68px;width:480px;height:192px;overflow:hidden">
      <div style="width:960px;height:192px;margin-left:-480px">${sceneSVG(4, { decor: { art: true, fish: true, espresso: true, monitor: true } })}</div></div>
    <div class="abs" style="left:477px;top:68px;width:6px;height:192px;background:#1a1c2c"></div>
    <div class="abs" style="left:0;top:0;width:960px;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 24px">
      <span style="font-size:30px"><span class="gold">FANCY</span> OUTFITS</span>
      <span class="grey" style="font-size:10px;letter-spacing:.12em">BULLPEN &#9656; NAME PARTNER</span></div>
    <div class="abs scan" style="inset:0"></div>` },
  // A drawer front from the page's own filing cabinet, with the game's name on the label.
  "banner-4-drawer": { h: 230, body: `
    <div class="abs" style="inset:0;background:repeating-linear-gradient(0deg,#2f3854 0 3px,#35405f 3px 6px)"></div>
    <div class="abs" style="left:0;top:0;width:960px;height:6px;background:#56628c"></div>
    <div class="abs" style="left:0;bottom:0;width:960px;height:10px;background:#141826"></div>
    <div class="abs" style="left:240px;top:34px;width:480px;height:92px;background:#f2e9d8;box-shadow:6px 6px 0 #141826;display:flex;align-items:center;justify-content:center;font-size:30px;white-space:nowrap"><span class="ink">FANCY OUTFITS</span></div>
    <div class="abs" style="left:380px;top:152px;width:200px;height:22px;background:#6b7bc4;box-shadow:0 5px 0 #3b4a8a"></div>
    <div class="abs" style="left:748px;top:26px;width:178px;height:120px;background:#ffcd75;transform:rotate(3deg);box-shadow:5px 6px 0 rgba(0,0,0,.35);padding:16px 14px;font-size:11px;line-height:1.8" class="ink"><span class="ink">READ THE FILE.<br>PICK YOUR<br>LINE.</span></div>
    <div class="abs scan" style="inset:0"></div>` },
};

// ---------- pre-launch frames (exactly 960x600, 1x) ----------
const frames = {
  // A real frame of the game, pushed back so the button reads first.
  "frame-A-the-desk": `
    <div class="abs" style="inset:0;background:url('${SHOT}') center/1067px 600px no-repeat"></div>
    <div class="abs" style="inset:0;background:rgba(15,15,27,.70)"></div>
    <div class="abs" style="inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(15,15,27,.75) 100%)"></div>`,
  // Day one: the clock from the game's topbar over the bullpen you start in.
  "frame-B-day-one": `
    <div class="abs" style="left:0;top:0;width:960px;height:408px;background:#3d4152"></div>
    <div class="abs" style="left:0;top:408px;width:960px;height:192px">${sceneSVG(0)}</div>
    <div class="abs" style="left:0;top:0;width:960px;height:600px;background:rgba(15,15,27,.35)"></div>
    <div class="abs gold" style="left:0;top:170px;width:960px;text-align:center;font-size:16px;letter-spacing:.12em">DAY 1 &#183; MONDAY &#183; 09:00</div>
    <div class="abs grey" style="left:0;top:376px;width:960px;text-align:center;font-size:9px;letter-spacing:.14em">THE BULLPEN &#8212; A DESK, TECHNICALLY.</div>`,
  // The first file on your desk, still closed.
  "frame-C-closed-file": `
    <div class="abs scan" style="inset:0;background:#232a3f"></div>
    <div class="abs" style="left:190px;top:92px;width:190px;height:40px;background:#c2b491"></div>
    <div class="abs" style="left:190px;top:120px;width:580px;height:388px;background:#cabea0;box-shadow:10px 10px 0 #0f0f1b"></div>
    <div class="abs" style="left:206px;top:98px;font-size:10px" ><span class="ink">FILE 001</span></div>
    <div class="abs" style="left:230px;top:152px;width:500px;height:52px;background:#f2e9d8;display:flex;align-items:center;justify-content:center;font-size:14px"><span class="ink">PARSON HENDERSON LLP</span></div>
    <div class="abs" style="left:230px;top:212px;width:500px;text-align:center;font-size:9px;letter-spacing:.1em"><span class="ink">NEW ASSOCIATE &#183; FIRST DAY</span></div>
    <div class="abs" style="left:520px;top:400px;padding:10px 14px;border:4px solid #b13e53;color:#b13e53;font-size:14px;transform:rotate(-8deg)">READ IT</div>`,
};

// ---------- the real page, mocked ----------
// itch's own rules, from its game.css: banner max-width:100%, embed centred,
// Run game = .button in the theme's button colour and font, ~120% size.
const itchButton = `<div style="display:flex;align-items:center;gap:6px;background:#ffcd75;color:#332917;font:600 19px 'DotGothic16',sans-serif;padding:7px 13px;border-radius:3px">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#332917" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>Run game</div>`;
const pageMock = (bannerFile, bannerH, frameFile) => `
  <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=block" rel="stylesheet">
  <body style="background:#151a28 url('${CABINET}') 50% 0 repeat">
  <div class="abs" style="left:240px;top:0;width:960px;height:900px;background:#1a1c2c">
    <img src="${bannerFile}" style="display:block;width:960px;height:${bannerH}px;image-rendering:auto">
    <div style="margin-top:20px;width:960px;height:600px;position:relative;background:#303242 url('${frameFile}') 50% 50%;display:flex;align-items:center;justify-content:center">${itchButton}</div>
    <div style="display:flex;justify-content:center;margin-top:18px"><div style="background:#ffcd75;color:#332917;font:17px 'DotGothic16';padding:6px 12px">Download Now</div></div>
    <p style="font:19px/1.55 'DotGothic16';color:#e8dfcb;padding:22px 25px;width:620px">Every morning, case files land in your inbox. Every file is a wall of text — and somewhere in that wall is the thing that wins it.</p>
  </div></body>`;

mkdirSync(OUT, { recursive: true });
const jobs = [];
const page = (name, w, h, body, opts = {}) => {
  const html = join(work, name + ".html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${body.startsWith("\n  <link") ? body : `<body>${body}</body>`}`);
  jobs.push({ html, out: join(OUT, name + ".png"), w, h, scale: opts.scale || 1 });
};
for(const [name, b] of Object.entries(banners)) page(name, 960, b.h, b.body, { scale: 2 });
for(const [name, body] of Object.entries(frames)) page(name, 960, 600, body);
const bannerNames = Object.keys(banners), frameNames = Object.keys(frames);
const url = n => pathToFileURL(join(OUT, n + ".png")).toString();
// Sheet 1: every banner over the same frame. Sheet 2: every frame under banner 1.
bannerNames.forEach(b => page(`_mock-${b}`, 1440, 900, pageMock(url(b), banners[b].h, url(frameNames[0]))));
frameNames.forEach(f => page(`_mock-${f}`, 1440, 900, pageMock(url(bannerNames[0]), banners[bannerNames[0]].h, url(f))));

const manifest = join(work, "jobs.json");
writeFileSync(manifest, JSON.stringify(jobs));
try{
  execFileSync(electronPath, [join(root, "scripts/lib/capture-main.cjs"), "--manifest", manifest], { stdio: "inherit" });
  // Contact sheets: mocks at half size, labelled, so a choice is made in context.
  const sheet = (name, mocks) => {
    const html = join(work, name + ".html");
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS} body{background:#0b0d16;padding:14px;display:grid;grid-template-columns:720px 720px;gap:26px 14px;overflow:hidden}
      figure{font-size:10px;color:#ffcd75} img{display:block;width:720px;height:450px;margin-top:8px;image-rendering:auto}</style><body>` +
      mocks.map(m => `<figure>${m.replace(/^_mock-/, "")}<img src="${url(m)}"></figure>`).join("") + `</body>`);
    const rows = Math.ceil(mocks.length / 2);
    return { html, out: join(OUT, name + ".png"), w: 1468, h: 14 + rows * 484, scale: 1 };
  };
  const sheets = [sheet("_preview-banners", bannerNames.map(b => `_mock-${b}`)), sheet("_preview-frames", frameNames.map(f => `_mock-${f}`))];
  writeFileSync(manifest, JSON.stringify(sheets));
  execFileSync(electronPath, [join(root, "scripts/lib/capture-main.cjs"), "--manifest", manifest], { stdio: "inherit" });
  for(const m of [...bannerNames, ...frameNames]) rmSync(join(OUT, `_mock-${m}.png`), { force: true });
}finally{
  rmSync(work, { recursive: true, force: true });
}
console.log(`banners + frames in ${OUT}/`);
