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
// Output: assets/store/itch-embed/ — banner.png, run-game-frame.png, and _preview.png,
// a mock of the real page (the cabinet background, the 960 panel, itch's button) at
// a 1440x900 window, because a picture judged on its own lies.

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

// ---------- the banner (layout in 1x CSS px, captured at 2x) ----------
// A drawer front from the page's own filing cabinet, with the game's name in its
// label holder — the page background is that cabinet, so the banner is one of its
// drawers pulled into the panel. Chosen from four candidates on 2026-09-25.
const BANNER_H = 230;
const BANNER = `
  <div class="abs" style="inset:0;background:repeating-linear-gradient(0deg,#2f3854 0 3px,#35405f 3px 6px)"></div>
  <div class="abs" style="left:0;top:0;width:960px;height:6px;background:#56628c"></div>
  <div class="abs" style="left:0;bottom:0;width:960px;height:10px;background:#141826"></div>
  <div class="abs" style="left:226px;top:22px;width:508px;height:116px;background:#8a8fa5;box-shadow:6px 6px 0 #141826"></div>
  <div class="abs" style="left:230px;top:26px;width:500px;height:108px;background:#6a7080"></div>
  <div class="abs" style="left:240px;top:34px;width:480px;height:92px;background:#f2e9d8;display:flex;align-items:center;justify-content:center;font-size:30px;white-space:nowrap"><span class="ink">FANCY OUTFITS</span></div>
  <div class="abs" style="left:240px;top:34px;width:480px;height:4px;background:rgba(0,0,0,.08)"></div>
  <div class="abs" style="left:232px;top:76px;width:6px;height:6px;background:#2a2f45"></div>
  <div class="abs" style="left:722px;top:76px;width:6px;height:6px;background:#2a2f45"></div>
  <div class="abs" style="left:380px;top:158px;width:200px;height:22px;background:#6b7bc4;box-shadow:0 5px 0 #3b4a8a"></div>
  <div class="abs" style="left:748px;top:26px;width:178px;height:120px;background:#ffcd75;transform:rotate(3deg);box-shadow:5px 6px 0 rgba(0,0,0,.35);padding:16px 14px;font-size:11px;line-height:1.8"><span class="ink">READ THE FILE.<br>PICK YOUR<br>LINE.</span></div>
  <div class="abs" style="left:748px;top:26px;width:178px;height:12px;background:rgba(0,0,0,.07);transform:rotate(3deg);transform-origin:89px 60px"></div>
  <div class="abs scan" style="inset:0"></div>`;

// ---------- behind "Run game" (exactly 960x600, 1x) ----------
// The first file on your desk, still closed, on a leather blotter. itch centres
// its gold button in the frame, so the middle of the folder carries a dark plate
// for it to sit on — gold on manila would lose its edge. The folder is turned a
// little; the plate is not, because the button it frames never is.
const cx = 480, cy = 300;           // where itch puts the button
const FRAME = `
  <div class="abs" style="inset:0;background:repeating-linear-gradient(0deg,#2e2318 0 5px,#291f15 5px 9px,#31261a 9px 12px)"></div>
  <div class="abs" style="left:120px;top:40px;width:720px;height:520px;background:#232a3f;box-shadow:8px 8px 0 #140f0a"></div>
  <div class="abs" style="left:128px;top:48px;width:704px;height:504px;border:2px solid #2f3854"></div>
  ${[[120,40],[804,40],[120,524],[804,524]].map(([x,y]) => `<div class="abs" style="left:${x}px;top:${y}px;width:36px;height:36px;background:#4a3828"></div>`).join("")}
  <div class="abs" style="left:26px;top:120px;width:74px;height:210px;background:#b7a98a;box-shadow:4px 4px 0 #140f0a"></div>
  <div class="abs" style="left:30px;top:128px;width:66px;height:4px;background:#cabea0"></div>
  <div class="abs" style="left:30px;top:150px;width:66px;height:4px;background:#cabea0"></div>
  <div class="abs" style="left:30px;top:172px;width:66px;height:4px;background:#cabea0"></div>
  <div class="abs" style="left:862px;top:86px;width:64px;height:64px;border-radius:50%;background:#efece2;box-shadow:4px 4px 0 #140f0a"></div>
  <div class="abs" style="left:872px;top:96px;width:44px;height:44px;border-radius:50%;background:#3a2410"></div>
  <div class="abs" style="left:880px;top:250px;width:10px;height:190px;background:#1a1c2c;box-shadow:3px 3px 0 #140f0a"></div>
  <div class="abs" style="left:880px;top:430px;width:10px;height:14px;background:#ffcd75"></div>
  <div class="abs" style="left:0;top:0;width:960px;height:600px;transform:rotate(-1.2deg);transform-origin:${cx}px ${cy}px">
    <div class="abs" style="left:236px;top:112px;width:492px;height:30px;background:#f2e9d8"></div>
    <div class="abs" style="left:250px;top:106px;width:470px;height:30px;background:#efe4cc"></div>
    <div class="abs" style="left:210px;top:112px;width:180px;height:40px;background:#c2b491"></div>
    <div class="abs" style="left:226px;top:122px;font-size:10px"><span class="ink">FILE No. 001</span></div>
    <div class="abs" style="left:210px;top:138px;width:540px;height:350px;background:#cabea0;box-shadow:10px 10px 0 #0f0f1b"></div>
    <div class="abs" style="left:210px;top:138px;width:540px;height:4px;background:#d8cbab"></div>
    <div class="abs" style="left:250px;top:164px;width:460px;height:44px;background:#f2e9d8;display:flex;align-items:center;justify-content:center;font-size:13px"><span class="ink">PARSON HENDERSON LLP</span></div>
    <div class="abs" style="left:210px;top:220px;width:540px;text-align:center;font-size:8px;letter-spacing:.14em"><span class="ink">CASE FILE &#183; NEW ASSOCIATE &#183; DAY ONE</span></div>
    <div class="abs" style="left:210px;top:${cy+50}px;width:540px;text-align:center;font-size:8px;letter-spacing:.14em"><span class="ink">OPEN IT. READ IT. DON'T GET HENDERED.</span></div>
    <div class="abs" style="left:242px;top:380px;width:84px;height:84px;border-radius:50%;border:6px solid rgba(74,40,16,.28)"></div>
    <div class="abs" style="left:664px;top:98px;width:14px;height:56px;border:4px solid #a8adbd;border-bottom:none"></div>
    <div class="abs" style="left:670px;top:106px;width:6px;height:40px;border:3px solid #c9cdd8;border-bottom:none"></div>
    <div class="abs" style="left:560px;top:404px;padding:10px 14px;border:4px solid #b13e53;color:#b13e53;font-size:14px;transform:rotate(-8deg);opacity:.9">READ IT</div>
  </div>
  <div class="abs" style="left:${cx-150}px;top:${cy-38}px;width:300px;height:76px;background:#1a1c2c;border:4px solid #3b5dc9;box-shadow:4px 4px 0 rgba(15,15,27,.5)"></div>
  <div class="abs scan" style="inset:0"></div>`;

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
const page = (name, w, h, body, scale = 1) => {
  const html = join(work, name + ".html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${body.startsWith("\n  <link") ? body : `<body>${body}</body>`}`);
  jobs.push({ html, out: join(OUT, name + ".png"), w, h, scale });
};
const url = n => pathToFileURL(join(OUT, n + ".png")).toString();
page("banner", 960, BANNER_H, BANNER, 2);
page("run-game-frame", 960, 600, FRAME);
page("_preview", 1440, 900, pageMock(url("banner"), BANNER_H, url("run-game-frame")));

const manifest = join(work, "jobs.json");
writeFileSync(manifest, JSON.stringify(jobs.slice(0, 2)));
try{
  execFileSync(electronPath, [join(root, "scripts/lib/capture-main.cjs"), "--manifest", manifest], { stdio: "inherit" });
  writeFileSync(manifest, JSON.stringify(jobs.slice(2)));   // the mock needs the two files above
  execFileSync(electronPath, [join(root, "scripts/lib/capture-main.cjs"), "--manifest", manifest], { stdio: "inherit" });
}finally{
  rmSync(work, { recursive: true, force: true });
}
console.log(`banner + run-game frame in ${OUT}/`);
