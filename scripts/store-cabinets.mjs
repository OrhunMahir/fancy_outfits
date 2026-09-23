// Ten cabinet backgrounds for the itch page.
//
//   node scripts/store-cabinets.mjs
//
// The drawer rhythm is the original one — 180px rows, a light top edge, a dark lip
// below, the label above the handle, paper hanging out over the front of an open
// drawer. What changed is WHERE that content sits, and why:
//
//   THE VISIBLE GUTTER IS A 330px STRIP. itch's content panel measures ~1250 CSS px
//   on this page (it puts the screenshots in a sub-column inside the same panel), so
//   at a 1920 window the background only shows at image x 320..655 on the left and
//   the mirror of that on the right. The original put its labels at x 150..350 —
//   almost entirely in the half that never shows. Everything here hugs the cabinet's
//   INNER edge instead, which is the part that survives at every window width.
//
//   AND NOTHING IS SCALED. `cover` sizes the image to whatever it is attached to, and
//   a scrolling background is attached to the whole page, so a 2560x1440 image gets
//   blown up until only its middle is left — the zoom. Every page here is a seamless
//   vertical tile (8 rows x 180 = 1440) meant for Repeat = repeat at natural size.

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

// GEOMETRY, measured off the live page rather than assumed.
//
// The background sits at natural size, centred, so the image's centre lands on the
// window's centre and everything below is stated as a distance from that centre.
//
//   PANEL is itch's content panel: ~1265 CSS px, fixed, whatever the window does.
//   So it always covers x 1280 +/- 633, and its edge is at x 647.
//   A window W wide shows x 1280 +/- W/2. At 1730 that is 415..2145.
//
// The gutter is therefore the strip between those two: about 230px at a 1730 window,
// and it SHRINKS AS THE WINDOW SHRINKS, because the panel does not. Nothing wider
// than the gutter can be relied on, and content is cut from the OUTSIDE in — which
// is why the first version lost the front of every label. Everything now hugs the
// panel edge and is at most WIDE px across, which survives down to about a 1570
// window. Below that the gutter is narrower than any legible label and the page is
// showing almost no background anyway.
const PANEL = 1265;
const EDGE = Math.round((W - PANEL) / 2);   // 647 — where the panel's edge falls
const CAB = EDGE;                           // the cabinet runs out to exactly there
const IN = 6;                               // content inset from the cabinet's inner edge
const WIDE = 150;                           // and nothing in the gutter is wider than this
const PITCH = 180;                          // 8 rows fill 1440 exactly, so the wall tiles

const BASE = `
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Press Start 2P',monospace;image-rendering:pixelated;position:relative;background:#151a28}
.scan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 2px,transparent 2px 6px)}
`;

const MANILA = ["#cabea0", "#b7a98a", "#efe4cc", "#d8cbab", "#c2b491"];

// Folders standing on end, seen over the rim of a drawer that has too many of them.
// Deterministic index arithmetic — no RNG, so a re-render is byte-identical.
const tops = (span, { w = 15, gap = 4, max = 84, seed = 0 } = {}) =>
  Array.from({ length: Math.floor(span / (w + gap)) }, (_, i) => {
    const h = Math.round(max * .45) + ((i * 11 + seed * 7) % Math.round(max * .55));
    const t = (((i * 5 + seed) % 5) - 2) * .7;
    const tab = (i + seed) % 7 === 0;
    return `<div style="position:absolute;left:${i * (w + gap)}px;bottom:0;width:${w}px;height:${h}px;
      background:${MANILA[(i + seed) % 5]};transform:rotate(${t}deg);transform-origin:bottom center;
      box-shadow:1px 0 0 rgba(0,0,0,.34)">
      ${tab ? `<div style="position:absolute;left:0;right:0;top:-9px;height:9px;background:#b13e53;opacity:.7"></div>` : ""}
    </div>`;
  }).join("");

// A post-it stuck on a drawer front, in the band under the handle. It stops at the
// drawer's own bottom edge on purpose: one row lower and it covers the next
// drawer's label, and the label is how you know which case the note is about.
const POSTIT = ["#ffcd75", "#ffe0a0", "#f7c05f"];
const postit = (a, off, lines, seed) => `
  <div style="position:absolute;${a}:${off + 2}px;top:92px;width:${WIDE - 2}px;height:82px;
    background:${POSTIT[seed % 3]};color:#2b2118;font-size:10px;line-height:1.9;
    padding:9px 10px;letter-spacing:.02em;
    transform:rotate(${((seed % 5) - 2) * 1.6}deg);transform-origin:top center;
    box-shadow:0 12px 20px rgba(0,0,0,.6);z-index:9">
    <div style="position:absolute;left:0;right:0;top:0;height:11px;background:rgba(0,0,0,.08)"></div>
    ${lines.join("<br>")}
  </div>`;

// One drawer, built the way the original was: the whole row IS the drawer face.
// An open one slides out and its content is pushed back by the same amount, so the
// slide reads at the edges while the labels and paper stay inside the visible strip.
const drawer = ({ label, side, open = 0, seam = 0, note = null, tilt = 0, seed = 0 }) => {
  const a = side === "left" ? "right" : "left";
  const off = IN + open;
  const dir = side === "left" ? 1 : -1;
  return `<div style="position:relative;height:${PITCH}px;background:#3d4763;border-bottom:4px solid #1c2233;
    ${open ? `transform:translateX(${dir * open}px) rotate(${dir * tilt}deg);transform-origin:${a} center;
      box-shadow:${side === "left" ? "-" : ""}34px 0 58px rgba(0,0,0,.62);z-index:3` : ""}">
    <div style="position:absolute;inset:0 0 auto 0;height:4px;background:#5b6a95"></div>
    <div style="position:absolute;inset:auto 0 0 0;height:10px;background:linear-gradient(#2a3149,#232a3f)"></div>

    ${seam ? `<div style="position:absolute;${a}:${off}px;top:-${seam}px;width:${WIDE}px;height:${seam}px;
      background:${MANILA[seed % 5]};box-shadow:0 -2px 5px rgba(0,0,0,.45)"></div>
    <div style="position:absolute;${a}:${off + 30}px;top:-${seam + 7}px;width:74px;height:${seam + 7}px;
      background:${MANILA[(seed + 2) % 5]}"></div>` : ""}

    <div style="position:absolute;${a}:${off}px;top:52px;
      width:${WIDE - 12}px;height:24px;background:#6b7bb4;border-radius:4px;
      box-shadow:0 3px 0 #4a5680, inset 0 3px 0 #8a99cc;z-index:2"></div>
    <div style="position:absolute;${a}:${off}px;top:9px;
      background:#efece2;color:#2b2118;font-size:12px;padding:8px 12px;letter-spacing:.05em;
      box-shadow:0 2px 0 rgba(0,0,0,.35);z-index:8">${label}</div>

    ${note ? postit(a, off, note, seed) : ""}
  </div>`;
};

const bank = (side, rows) => `
  <div style="position:absolute;${side}:0;top:0;width:${CAB}px;height:${H}px;background:#2a3149;
    box-shadow:inset ${side === "left" ? "-" : ""}26px 0 46px rgba(0,0,0,.5)">
    ${rows.map(r => drawer({ ...r, side })).join("")}
  </div>`;

const room = () => `<div style="position:absolute;left:${CAB}px;right:${CAB}px;top:0;bottom:0;
  background:linear-gradient(90deg,#10131f,#171d2e 30%,#171d2e 70%,#10131f)"></div>`;

const L = ["KESSLER", "ALDERGATE", "PEMBERTON", "HALCYON", "VANCE", "REDVALE", "CORVID", "ASHGROVE"];
const R = ["MERIDIAN", "THORNE", "ALMEIDA", "KEPLER", "SABLE", "WESTBROOK", "HALLORAN", "NIMBUS"];

// What somebody wrote on the drawer before they went home. All of it is the game's
// own case material — the winning argument is in the paperwork, and these are the
// lines a reader would have underlined.
const NOTES = [
  ["VP HAD NO", "SIGNING", "AUTHORITY"],
  ["DATE COMES", "AFTER THE", "DEADLINE"],
  ["VENDOR IS", "THE CFO'S", "BROTHER"],
  ["PRIVILEGED", "DO NOT", "PRODUCE"],
  ["ASK FOR", "THE BYLAWS"],
  ["PELT HATES", "THEATRE.", "GO DRY"],
  ["DUE FRIDAY", "NO", "EXTENSION"],
  ["HE SIGNED", "IT TWICE"],
  ["WITNESS", "CHANGED", "HER STORY"],
  ["FEE SCHED.", "IS NOT", "PRIVILEGED"],
  ["CHECK", "EXHIBIT C"],
  ["THEY WILL", "SAY NO.", "ASK ANYWAY"],
];

const page = (leftPlan, rightPlan) => `<body>${room()}
  ${bank("left", L.map((label, i) => ({ label, seed: i, ...leftPlan(i, label) })))}
  ${bank("right", R.map((label, i) => ({ label, seed: i + 3, ...rightPlan(i, label) })))}
  <div class="scan"></div></body>`;

// Every drawer is too full to sit flush, which is the paper at each seam. The rest
// of the story is on the post-its.
const bulging = i => ({ seam: 6 + (i % 4) * 4 });
const plan = (notes, openAt) => (i) => ({
  ...bulging(i),
  ...(i === openAt ? { open: 58 } : {}),
  ...(notes[i] !== undefined ? { note: NOTES[notes[i]] } : {}),
});

const pages = {
  // 1 — three notes a side. The drawers carry the weight; the notes carry the case.
  "01-notes": page(
    plan({ 1: 0, 2: 10, 4: 4, 6: 8 }, 2),
    plan({ 0: 1, 3: 6, 5: 11, 6: 9 }, 5)),

  // 2 — five a side: somebody has been leaving these for weeks.
  "02-notes-dense": page(
    plan({ 0: 0, 2: 2, 3: 4, 5: 7, 7: 10 }, 2),
    plan({ 1: 1, 3: 3, 4: 5, 5: 8, 7: 9 }, 5)),

  // 3 — nothing pulled out at all: a wall that is merely full, and annotated.
  "03-notes-shut": page(
    plan({ 1: 2, 3: 0, 5: 9, 6: 4 }, -1),
    plan({ 0: 10, 2: 7, 4: 3, 6: 1 }, -1)),
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

// Preview: each candidate at natural size, repeating, in a 1920 window, with the
// REAL 1250px panel over it. Judging one of these without the panel on top is
// judging a picture nobody will ever see.
const sheet = join(work, "sheet.html");
const shown = 1730, tall = 760;
writeFileSync(sheet, `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#0b0c14;padding:14px;font:12px monospace;color:#94b0c2}
.row{margin-bottom:16px}.wrap{position:relative;width:${shown}px;height:${tall}px;overflow:hidden}
.tile{position:absolute;inset:0;background-repeat:repeat;background-position:center top}
.col{position:absolute;left:50%;transform:translateX(-50%);top:0;bottom:0;width:${PANEL}px;
  background:#1a1c2c;border-inline:1px dashed #b13e53}
.col b{display:block;color:#e8dfcb;font:11px monospace;padding:8px}</style>
${jobs.map(j => `<div class="row"><div>${j.out.split("/").pop()} — natural size, repeating, in a ${shown}px window</div>
  <div class="wrap"><div class="tile" style="background-image:url('file://${j.out}')"></div>
  <div class="col"><b>itch content panel (${PANEL}px, measured)</b></div></div></div>`).join("")}`);
writeFileSync(join(work, "sheet.json"), JSON.stringify([{ html: sheet, out: join(OUT, "_preview.png"),
  w: shown + 28, h: (tall + 36) * jobs.length + 14, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "sheet.json")], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log(`\n${jobs.length} cabinet candidates in ${OUT}/  (${W}x${H}, seamless vertical tile)`);
