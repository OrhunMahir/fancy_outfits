// Five cabinet backgrounds for the itch page, built to survive itch's background
// options rather than to depend on them.
//
//   node scripts/store-cabinets.mjs
//
// Two measurements shape every one of them:
//
// 1. THE COLUMN IS ~1250 CSS PX, not the 960 the earlier pages assumed. Measured
//    off the live page: itch puts the screenshots in a sub-column inside the same
//    white panel, so the panel is far wider than a plain text column.
// 2. THE PAGE ZOOMS. `cover` sizes the background to whatever it is attached to,
//    and on a scrolling background that is the whole PAGE — several thousand px
//    tall — so the image is blown up until only its middle shows. That is the
//    "it zoomed into the middle" problem.
//
// The fix is in the art, so it holds whatever the theme editor offers: every page
// here is a SEAMLESS VERTICAL TILE. Drawer pitch divides 1440 exactly, so with
// Repeat = repeat (no cover, natural size) the wall runs down a page of any height
// with no scaling and therefore no zoom. Cabinets sit in the outer ~650px of each
// side, which is where the gutter falls once a 1250px column is centred.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const OUT = resolve("assets/store/backgrounds/cabinet");
const FONT = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();

const W = 2560, H = 1440;
const COL = 1250;          // measured off the live page
const CAB = 650;           // cabinet band; the gutter at a 1920 window is x 320..655

const STEEL = "#3d4763", STEEL_D = "#2a3149", STEEL_L = "#5b6a95", SHADOW = "#1c2233";
const MANILA = ["#cabea0", "#b7a98a", "#efe4cc", "#d8cbab", "#c2b491"];

const BASE = `
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Press Start 2P',monospace;image-rendering:pixelated;position:relative;background:#151a28}
.scan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 2px,transparent 2px 6px)}
`;

// THE DESIGN SURFACE IS 330px WIDE. At a 1920 window with the background at natural
// size, the visible left gutter is image x 320..655 — everything else is either off
// screen or under the column. So every drawer's paper is anchored to the cabinet's
// INNER edge and grows outward from there, which is the part that always shows.
const INNER = 30, BLOCK = CAB - INNER * 2;

// Folders standing on end in a drawer: one thin edge per file. Deterministic index
// arithmetic, no RNG, so a re-render is byte-identical.
const tops = (n, { w = 15, gap = 4, max = 70, seed = 0 } = {}) =>
  Array.from({ length: n }, (_, i) => {
    const h = Math.round(max * .48) + ((i * 11 + seed * 7) % Math.round(max * .52));
    const c = MANILA[(i + seed) % MANILA.length];
    const t = (((i * 5 + seed) % 5) - 2) * 0.7;
    const tab = (i + seed) % 7 === 0;
    return `<div style="position:absolute;left:${i * (w + gap)}px;bottom:0;width:${w}px;height:${h}px;
      background:${c};transform:rotate(${t}deg);transform-origin:bottom center;
      box-shadow:1px 0 0 rgba(0,0,0,.34)">
      ${tab ? `<div style="position:absolute;left:0;right:0;top:-9px;height:9px;background:#b13e53;opacity:.75"></div>` : ""}
    </div>`;
  }).join("");

// A file that did not fit, bent over whatever stopped it. It belongs to a drawer,
// so it is drawn inside one — a file floating free of the cabinet reads as litter.
const jam = (anchor, bottom, { w = 178, rot = -9 } = {}) => `
  <div style="position:absolute;${anchor}:${INNER + 8}px;bottom:${bottom}px;
    width:${w}px;height:${Math.round(w * .45)}px;background:#efe4cc;border:2px solid #a8996f;
    transform:rotate(${anchor === "right" ? rot : -rot}deg);transform-origin:bottom ${anchor};
    box-shadow:0 14px 26px rgba(0,0,0,.6);z-index:7">
    <div style="position:absolute;left:8%;width:34%;top:-11px;height:11px;background:#d8cbab"></div>
    ${[0, 1, 2].map(k => `<div style="position:absolute;left:9%;right:${k % 2 ? 34 : 16}%;
      top:${26 + k * 23}%;height:3px;background:#cabea0"></div>`).join("")}
  </div>`;

// One drawer. The front panel sits over the bottom two thirds; anything standing in
// the drawer rises behind it, which is what an overfull drawer looks like head-on.
// `pitch` divides 1440 exactly on every page, so the wall tiles with no seam.
const drawer = ({ label, pitch, side, open = 0, packed = 0, seam = 0, tilt = 0, stuck = 0, seed = 0 }) => {
  const anchor = side === "left" ? "right" : "left";
  const front = Math.round(pitch * .66);
  const shove = side === "left" ? open : -open;
  // How far the files may stand above the front. A little into the row above reads
  // as overfull; a lot swallows that drawer's label, which just reads as broken.
  const rise = pitch - front + 26;
  return `<div style="position:relative;height:${pitch}px;background:${STEEL_D}">
    ${packed ? `<div style="position:absolute;${anchor}:${INNER - open}px;bottom:${front - 6}px;
      width:${BLOCK}px;height:${rise}px">
      ${tops(Math.floor(BLOCK / 19), { seed, max: rise * (.6 + packed / 140) })}
    </div>` : ""}
    ${stuck ? jam(anchor, front - 16, { w: 178, rot: -11 - (seed % 3) * 3 }) : ""}

    <div style="position:absolute;left:0;right:0;bottom:0;height:${front}px;background:${STEEL};
      border-bottom:4px solid ${SHADOW};transform:translateX(${shove}px) rotate(${tilt}deg);
      transform-origin:${anchor} center;
      ${open ? `box-shadow:${side === "left" ? "-" : ""}30px 0 56px rgba(0,0,0,.7);z-index:4` : ""}">
      <div style="position:absolute;inset:0 0 auto 0;height:4px;background:${STEEL_L}"></div>
      <div style="position:absolute;inset:auto 0 0 0;height:9px;background:linear-gradient(${STEEL_D},#232a3f)"></div>

      ${seam ? `<div style="position:absolute;${anchor}:${INNER}px;top:-${seam}px;width:${BLOCK}px;
        height:${seam}px;background:${MANILA[seed % 5]};box-shadow:0 -2px 5px rgba(0,0,0,.45)"></div>
      <div style="position:absolute;${anchor}:${INNER + 40}px;top:-${seam + 7}px;width:120px;
        height:${seam + 7}px;background:${MANILA[(seed + 2) % 5]}"></div>` : ""}

      <div style="position:absolute;${anchor}:${INNER}px;top:${Math.round(front * .16)}px;
        background:#efece2;color:#2b2118;font-size:15px;padding:9px 15px;letter-spacing:.05em;
        box-shadow:0 2px 0 rgba(0,0,0,.4)">${label}</div>
      <div style="position:absolute;${anchor}:${INNER}px;bottom:${Math.round(front * .2)}px;
        width:220px;height:26px;background:#6b7bb4;border-radius:4px;
        box-shadow:0 3px 0 #4a5680, inset 0 3px 0 #8a99cc"></div>
    </div>
  </div>`;
};

const bank = (side, rows, pitch) => `
  <div style="position:absolute;${side}:0;top:0;width:${CAB}px;height:${H}px;background:${STEEL_D};
    box-shadow:inset ${side === "left" ? "-" : ""}26px 0 46px rgba(0,0,0,.5)">
    ${rows.map(r => drawer({ ...r, pitch, side })).join("")}
  </div>`;

const room = () => `
  <div style="position:absolute;left:${CAB}px;right:${CAB}px;top:0;bottom:0;
    background:linear-gradient(90deg,#10131f,#171d2e 30%,#171d2e 70%,#10131f)"></div>`;

// Eight labels per bank; the drawer the user asked for is always PEMBERTON.
const L = ["KESSLER", "ALDERGATE", "PEMBERTON", "HALCYON", "REDVALE", "NIMBUSHOST", "CORVID", "ASHGROVE"];
const R = ["BELLWETHER", "RAVENSCROFT", "ALMEIDA", "KEPLER", "SABLE & ROE", "MERIDIAN", "THORNE", "WESTBROOK"];

const pages = {
  // 1 — nothing is open and nothing closes either. Every drawer has paper standing
  //     proud of its own seam, and PEMBERTON has stopped pretending.
  "01-crammed": `<body>${room()}
    ${bank("left", L.map((label, i) => ({ label, seed: i,
      ...(label === "PEMBERTON" ? { open: 58, packed: 34, stuck: 1 } : { seam: 7 + (i % 4) * 4 }) })), 180)}
    ${bank("right", R.map((label, i) => ({ label, seed: i + 3,
      ...(i === 5 ? { seam: 22, stuck: 1 } : { seam: 6 + ((i + 2) % 4) * 4 }) })), 180)}
    <div class="scan"></div></body>`,

  // 2 — two drawers open and overflowing: the files stand well clear of the rim and
  //     one on each side has been caught by the front on the way in.
  "02-overflow": `<body>${room()}
    ${bank("left", L.map((label, i) => ({ label, seed: i,
      ...(i === 2 ? { open: 64, packed: 52, stuck: 1 } : { seam: 4 + (i % 3) * 4 }) })), 180)}
    ${bank("right", R.map((label, i) => ({ label, seed: i + 4,
      ...(i === 5 ? { open: 64, packed: 46, stuck: 1 } : { seam: 4 + (i % 3) * 4 }) })), 180)}
    <div class="scan"></div></body>`,

  // 3 — six deep drawers. PEMBERTON is out to the stop and sagging under the weight,
  //     with one file wedged where the front should close.
  "03-one-drawer-out": `<body>${room()}
    ${bank("left", L.slice(0, 6).map((label, i) => ({ label, seed: i,
      ...(label === "PEMBERTON" ? { open: 124, packed: 74, tilt: 1.5, stuck: 1 } : { seam: 5 + (i % 3) * 5 }) })), 240)}
    ${bank("right", R.slice(0, 6).map((label, i) => ({ label, seed: i + 2,
      ...(i === 3 ? { open: 74, packed: 48 } : { seam: 5 + (i % 3) * 5 }) })), 240)}
    <div class="scan"></div></body>`,

  // 4 — ten shallow drawers, every one of them showing paper at the seam. Volume
  //     rather than incident: the wall is the point, and it never stops.
  "04-floor-to-ceiling": `<body>${room()}
    ${bank("left", Array.from({ length: 10 }, (_, i) => ({ label: L[i % 8], seed: i,
      ...(i === 4 ? { open: 46, packed: 24, stuck: 1 } : { seam: 5 + (i % 5) * 3 }) })), 144)}
    ${bank("right", Array.from({ length: 10 }, (_, i) => ({ label: R[i % 8], seed: i + 5,
      ...(i === 7 ? { open: 42, packed: 22 } : { seam: 5 + ((i + 1) % 5) * 3 }) })), 144)}
    <div class="scan"></div></body>`,

  // 5 — the backlog, opened in steps. Each drawer down is further out and fuller than
  //     the one above it, which is what a week of not filing actually looks like.
  "05-backlog": `<body>${room()}
    ${bank("left", L.map((label, i) => ({ label, seed: i,
      ...(i >= 2 && i <= 5 ? { open: 26 + (i - 2) * 28, packed: 18 + (i - 2) * 16, stuck: i === 5 ? 1 : 0 }
        : { seam: 4 + (i % 3) * 4 }) })), 180)}
    ${bank("right", R.map((label, i) => ({ label, seed: i + 1,
      ...(i >= 3 && i <= 6 ? { open: 24 + (i - 3) * 26, packed: 16 + (i - 3) * 18, stuck: i === 6 ? 1 : 0 }
        : { seam: 4 + (i % 3) * 4 }) })), 180)}
    <div class="scan"></div></body>`,
};


const work = mkdtempSync(join(tmpdir(), "fo-cab-"));
mkdirSync(OUT, { recursive: true });
const jobs = Object.entries(pages).map(([name, body]) => {
  const html = join(work, name + ".html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${BASE}</style>${body}`);
  return { html, out: join(OUT, name + ".png"), w: W, h: H, transparent: false };
});
writeFileSync(join(work, "jobs.json"), JSON.stringify(jobs));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });

// Preview: each candidate at natural size in a 1920-wide window, with the REAL
// 1250px column over it — and stacked with itself, which is what Repeat does and
// the only honest way to show whether the tile seam shows.
const sheet = join(work, "sheet.html");
const shown = 1920;
writeFileSync(sheet, `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#0b0c14;padding:16px;font:12px monospace;color:#94b0c2}
.row{margin-bottom:20px}.wrap{position:relative;width:${shown}px;height:760px;overflow:hidden}
.tile{position:absolute;inset:0;background-repeat:repeat;background-position:center top}
.col{position:absolute;left:50%;transform:translateX(-50%);top:0;bottom:0;width:${COL}px;
  background:rgba(26,28,44,.97);border-inline:1px dashed #b13e53}
.col b{display:block;color:#e8dfcb;font:11px monospace;padding:8px}</style>
${jobs.map(j => `<div class="row"><div>${j.out.split("/").pop()} — natural size, repeating, in a ${shown}px window</div>
  <div class="wrap"><div class="tile" style="background-image:url('file://${j.out}')"></div>
  <div class="col"><b>itch content column (~${COL}px, measured)</b></div></div></div>`).join("")}`);
writeFileSync(join(work, "sheet.json"), JSON.stringify([{ html: sheet, out: join(OUT, "_preview.png"), w: shown + 32, h: 4030, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "sheet.json")], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log(`\n${jobs.length} cabinet candidates in ${OUT}/  (${W}x${H}, seamless vertical tile)`);
