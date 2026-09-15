// Steam store capsules, generated from the same logo builder the start screen
// draws with — so the store never shows a mark the game does not.
//
//   node scripts/store-capsules.mjs
//
// Sizes are the ones Steamworks documents (store/assets/standard and
// store/assets/libraryassets, read 2026-09-15): header 920x430, small 462x174,
// main 1232x706, vertical 748x896, library capsule 600x900, library header
// 920x430, library hero 3840x1240, library logo 1280x720 (transparent PNG),
// community icon 184x184. Plus itch.io's cover, 630x500 (its documented size;
// it is shown at 315x250 in listings, so the name is set large). Output: assets/store/capsules/.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLogo, LOGO_SIZE } from "../src/game/logo.js";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const OUT = resolve("assets/store/capsules");
const FONT = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();

const svg = (rects, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" ${extra}>` +
  rects.map(s => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`).join("") + `</svg>`;
const isGround = s => s.x === 0 && s.y === 0 && s.w === LOGO_SIZE && s.h === LOGO_SIZE;
const MARK = svg(buildLogo({}));                                       // lettered, on its navy ground
const MARK_BARE = svg(buildLogo({}).filter(s => !isGround(s)));        // same, no ground — for the transparent logo
const ICON = svg(buildLogo({ lettering: false, fill: true, frame: true }));

const CSS = `
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;}
body{background:#1a1c2c;font-family:'Press Start 2P',monospace;color:#f4f4f4;image-rendering:pixelated;
  display:flex;align-items:center;justify-content:center;position:relative;}
body.clear{background:transparent;}
body::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 2px,transparent 2px 6px);}
body.clear::after{display:none;}
.mark svg{display:block;width:100%;height:100%;}
.name{display:flex;flex-direction:column;line-height:1.05;}
.name b{font-weight:400;color:#ffcd75;} .name span{color:#f4f4f4;}
.tag{color:#94b0c2;letter-spacing:.14em;}
.rule{background:#3b5dc9;}
.row{display:flex;align-items:center;}
.col{display:flex;flex-direction:column;align-items:center;}
`;

// Every layout is written in the asset's own pixel space, no responsive guessing.
const pages = {
  "header-920x430": { w: 920, h: 430, body: `
    <div class="row" style="gap:52px">
      <div class="mark" style="width:330px;height:330px;border:6px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:58px">
        <b>FANCY</b><span>OUTFITS</span>
        <div class="tag" style="font-size:15px;margin-top:22px">A LAWYER SIMULATOR</div>
        <div class="rule" style="height:6px;width:100%;margin-top:22px"></div>
      </div>
    </div>` },
  "small-462x174": { w: 462, h: 174, body: `
    <div class="row" style="gap:24px">
      <div class="mark" style="width:128px;height:128px;border:4px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:30px"><b>FANCY</b><span>OUTFITS</span></div>
    </div>` },
  "main-1232x706": { w: 1232, h: 706, body: `
    <div class="col" style="gap:44px">
      <div class="mark" style="width:400px;height:400px;border:8px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:64px;flex-direction:row;gap:38px"><b>FANCY</b><span>OUTFITS</span></div>
      <div class="tag" style="font-size:18px">A LAWYER SIMULATOR</div>
    </div>` },
  "vertical-748x896": { w: 748, h: 896, body: `
    <div class="col" style="gap:48px">
      <div class="mark" style="width:440px;height:440px;border:8px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:60px;align-items:center"><b>FANCY</b><span>OUTFITS</span></div>
      <div class="tag" style="font-size:17px">A LAWYER SIMULATOR</div>
    </div>` },
  "library-capsule-600x900": { w: 600, h: 900, body: `
    <div class="col" style="gap:44px">
      <div class="mark" style="width:400px;height:400px;border:8px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:52px;align-items:center"><b>FANCY</b><span>OUTFITS</span></div>
      <div class="tag" style="font-size:15px">A LAWYER SIMULATOR</div>
    </div>` },
  "library-header-920x430": { w: 920, h: 430, body: `
    <div class="row" style="gap:52px">
      <div class="mark" style="width:330px;height:330px;border:6px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:58px">
        <b>FANCY</b><span>OUTFITS</span>
        <div class="tag" style="font-size:15px;margin-top:22px">A LAWYER SIMULATOR</div>
        <div class="rule" style="height:6px;width:100%;margin-top:22px"></div>
      </div>
    </div>` },
  // Steam lays the library logo over this, so it carries no text and keeps the
  // centre quiet: the mark sits off to the right, faded into the ground.
  "library-hero-3840x1240": { w: 3840, h: 1240, body: `
    <div class="mark" style="position:absolute;right:220px;top:-60px;width:1360px;height:1360px;opacity:.22">${MARK}</div>
    <div class="rule" style="position:absolute;left:0;bottom:0;height:18px;width:100%"></div>` },
  "library-logo-1280x720": { w: 1280, h: 720, transparent: true, body: `
    <div class="row" style="gap:64px">
      <div class="mark" style="width:520px;height:520px">${MARK_BARE}</div>
      <div class="name" style="font-size:84px"><b>FANCY</b><span>OUTFITS</span></div>
    </div>` },
  "itch-cover-630x500": { w: 630, h: 500, body: `
    <div class="col" style="gap:30px">
      <div class="mark" style="width:270px;height:270px;border:6px solid #3b5dc9">${MARK}</div>
      <div class="name" style="font-size:40px;flex-direction:row;gap:24px"><b>FANCY</b><span>OUTFITS</span></div>
      <div class="tag" style="font-size:12px">A LAWYER SIMULATOR</div>
    </div>` },
  "community-icon-184x184": { w: 184, h: 184, body: `
    <div class="mark" style="width:184px;height:184px">${ICON}</div>` },
};

const work = mkdtempSync(join(tmpdir(), "fo-capsules-"));
mkdirSync(OUT, { recursive: true });
const jobs = Object.entries(pages).map(([name, p]) => {
  const html = join(work, name + ".html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body class="${p.transparent ? "clear" : ""}">${p.body}</body>`);
  return { html, out: join(OUT, name + ".png"), w: p.w, h: p.h, transparent: !!p.transparent };
});
const manifest = join(work, "jobs.json");
writeFileSync(manifest, JSON.stringify(jobs));
try{
  execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", manifest], { stdio: "inherit" });
}finally{
  rmSync(work, { recursive: true, force: true });
}
console.log(`${jobs.length} capsules in ${OUT}/`);
