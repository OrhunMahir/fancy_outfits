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
const COL = 1250;      // measured off the live page
const CAB = 660;       // cabinet band
const PITCH = 180;     // 8 rows fill 1440 exactly, so the wall tiles with no seam
const IN = 40;         // content inset from the cabinet's INNER edge

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

// One drawer, built the way the original was: the whole row IS the drawer face.
// An open one slides out and its content is pushed back by the same amount, so the
// slide reads at the edges while the labels and paper stay inside the visible strip.
const drawer = ({ label, side, open = 0, packed = 0, spill = 0, stuck = 0, seam = 0, tilt = 0, seed = 0 }) => {
  const a = side === "left" ? "right" : "left";
  const off = IN + open;
  const dir = side === "left" ? 1 : -1;
  return `<div style="position:relative;height:${PITCH}px;background:#3d4763;border-bottom:4px solid #1c2233;
    ${open ? `transform:translateX(${dir * open}px) rotate(${dir * tilt}deg);transform-origin:${a} center;
      box-shadow:${side === "left" ? "-" : ""}34px 0 58px rgba(0,0,0,.62);z-index:3` : ""}">
    <div style="position:absolute;inset:0 0 auto 0;height:4px;background:#5b6a95"></div>
    <div style="position:absolute;inset:auto 0 0 0;height:10px;background:linear-gradient(#2a3149,#232a3f)"></div>

    ${seam ? `<div style="position:absolute;${a}:${off}px;top:-${seam}px;width:330px;height:${seam}px;
      background:${MANILA[seed % 5]};box-shadow:0 -2px 5px rgba(0,0,0,.45)"></div>
    <div style="position:absolute;${a}:${off + 52}px;top:-${seam + 7}px;width:126px;height:${seam + 7}px;
      background:${MANILA[(seed + 2) % 5]}"></div>` : ""}

    ${spill ? `
      <!-- The drawer is packed edge to edge and the files stand clear of the rim.
           This is the "so much has piled up in there" read the whole page is for. -->
      <div style="position:absolute;${a}:${off}px;bottom:${PITCH - 24}px;width:492px;height:${packed || 92}px">
        ${tops(492, { seed, max: packed || 92 })}</div>
      <!-- and a few that came over the front on the way in -->
      ${[0, 1, 2].map(i => `<div style="position:absolute;${a}:${off + 4 + i * 54}px;
        top:${30 + i * 12}px;width:${210 - i * 18}px;height:${190 - i * 20}px;
        background:${["#f2e9d8", "#e8dcc2", "#cabea0"][i]};
        transform:rotate(${(i - 1) * 2.6 * dir}deg);transform-origin:top center;
        box-shadow:0 16px 30px rgba(0,0,0,.5);z-index:${4 + i}">
        ${[0, 1, 2, 3].map(k => `<div style="position:absolute;left:12%;right:${k % 2 ? 34 : 16}%;
          top:${16 + k * 17}%;height:3px;background:#c9bda2"></div>`).join("")}
      </div>`).join("")}` : ""}

    <div style="position:absolute;${a}:${off}px;top:58%;transform:translateY(-50%);
      width:250px;height:30px;background:#6b7bb4;border-radius:4px;
      box-shadow:0 3px 0 #4a5680, inset 0 3px 0 #8a99cc;z-index:2"></div>
    <!-- A spilled drawer's label sits on cream paper, so it inverts — a cream plate
         on cream paper is unreadable, and the label is how you know which drawer. -->
    <div style="position:absolute;${a}:${off}px;${spill ? "bottom:18px" : "top:19%"};
      background:${spill ? "#1c2233" : "#efece2"};color:${spill ? "#efece2" : "#2b2118"};
      font-size:16px;padding:10px 18px;letter-spacing:.06em;
      box-shadow:0 2px 0 rgba(0,0,0,.45);z-index:8">${label}</div>

    ${stuck ? `<div style="position:absolute;${a}:${off + 6}px;bottom:${PITCH - 44}px;
      width:186px;height:84px;background:#efe4cc;border:2px solid #a8996f;
      transform:rotate(${-11 * dir}deg);transform-origin:bottom ${a};
      box-shadow:0 14px 26px rgba(0,0,0,.6);z-index:9">
      <div style="position:absolute;left:8%;width:34%;top:-11px;height:11px;background:#d8cbab"></div>
      ${[0, 1, 2].map(k => `<div style="position:absolute;left:9%;right:${k % 2 ? 34 : 16}%;
        top:${26 + k * 23}%;height:3px;background:#cabea0"></div>`).join("")}
    </div>` : ""}
  </div>`;
};

const bank = (side, rows) => `
  <div style="position:absolute;${side}:0;top:0;width:${CAB}px;height:${H}px;background:#2a3149;
    box-shadow:inset ${side === "left" ? "-" : ""}26px 0 46px rgba(0,0,0,.5)">
    ${rows.map(r => drawer({ ...r, side })).join("")}
  </div>`;

const room = () => `<div style="position:absolute;left:${CAB}px;right:${CAB}px;top:0;bottom:0;
  background:linear-gradient(90deg,#10131f,#171d2e 30%,#171d2e 70%,#10131f)"></div>`;

const L = ["KESSLER", "ALDERGATE", "PEMBERTON", "HALCYON", "VANCE", "REDVALE", "NIMBUSHOST", "CORVID"];
const R = ["BELLWETHER", "RAVENSCROFT", "ALMEIDA", "KEPLER TOWER", "SABLE & ROE", "MERIDIAN", "THORNE", "WESTBROOK"];

// `plan` returns the per-row options for a bank. Every page is one of these applied
// to both sides, which keeps the ten variants honestly comparable.
const page = (leftPlan, rightPlan) => `<body>${room()}
  ${bank("left", L.map((label, i) => ({ label, seed: i, ...leftPlan(i, label) })))}
  ${bank("right", R.map((label, i) => ({ label, seed: i + 3, ...rightPlan(i, label) })))}
  <div class="scan"></div></body>`;

const shut = i => ({ seam: 0 });
const bulging = i => ({ seam: 6 + (i % 4) * 4 });
const openAt = (n, o = 58, p = 0) => i => i === n ? { open: o, spill: 1, packed: p } : null;

const pages = {
  // ——— five takes on the cabinet ———————————————————————————————————————
  // 1 — the original beat: one drawer open on each side, everything else shut.
  "01-one-open": page(
    i => i === 2 ? { open: 58, spill: 1 } : shut(i),
    i => i === 5 ? { open: 58, spill: 1 } : shut(i)),

  // 2 — nothing is open and nothing closes either: paper standing proud of every
  //     seam, and one drawer that has given up.
  "02-crammed": page(
    i => i === 2 ? { open: 58, spill: 1, packed: 88 } : bulging(i),
    i => i === 5 ? { seam: 24, stuck: 1 } : bulging(i)),

  // 3 — two open a side, both of them overfull.
  "03-overflow": page(
    i => (i === 1 || i === 5) ? { open: 62, spill: 1, packed: 104 } : bulging(i),
    i => (i === 2 || i === 6) ? { open: 62, spill: 1, packed: 96 } : bulging(i)),

  // 4 — PEMBERTON is out to the stop and sagging under the weight, with a file
  //     wedged where the front should close. Everything else is shut and tidy.
  "04-pemberton": page(
    (i, label) => label === "PEMBERTON" ? { open: 96, spill: 1, packed: 120, tilt: 1.4, stuck: 1 } : shut(i),
    i => i === 4 ? { seam: 18 } : shut(i)),

  // 5 — volume rather than incident: every drawer showing paper, one open.
  "05-wall": page(
    i => i === 6 ? { open: 54, spill: 1, packed: 76 } : { seam: 8 + (i % 5) * 4 },
    i => i === 1 ? { open: 54, spill: 1, packed: 76 } : { seam: 8 + ((i + 2) % 5) * 4 }),

  // ——— and five on the backlog: opened in steps, each one worse ————————————
  // 6 — three drawers, opened a little further down the column.
  "06-backlog-soft": page(
    i => (i >= 2 && i <= 4) ? { open: 34 + (i - 2) * 22, spill: 1, packed: 40 + (i - 2) * 18 } : bulging(i),
    i => (i >= 3 && i <= 5) ? { open: 32 + (i - 3) * 22, spill: 1, packed: 38 + (i - 3) * 18 } : bulging(i)),

  // 7 — four, and the last one is most of the way out.
  "07-backlog-deep": page(
    i => (i >= 1 && i <= 4) ? { open: 30 + (i - 1) * 30, spill: 1, packed: 44 + (i - 1) * 22 } : bulging(i),
    i => (i >= 2 && i <= 5) ? { open: 28 + (i - 2) * 30, spill: 1, packed: 42 + (i - 2) * 22 } : bulging(i)),

  // 8 — mirrored, so both gutters read the same way at the same height.
  "08-backlog-mirror": page(
    i => (i >= 2 && i <= 5) ? { open: 30 + (i - 2) * 26, spill: 1, packed: 48 + (i - 2) * 20 } : bulging(i),
    i => (i >= 2 && i <= 5) ? { open: 30 + (i - 2) * 26, spill: 1, packed: 48 + (i - 2) * 20 } : bulging(i)),

  // 9 — five open, all of them overflowing. The week nobody filed anything.
  "09-backlog-heavy": page(
    i => (i >= 1 && i <= 5) ? { open: 26 + (i - 1) * 24, spill: 1, packed: 70 + (i - 1) * 16 } : { seam: 14 },
    i => (i >= 2 && i <= 6) ? { open: 26 + (i - 2) * 24, spill: 1, packed: 70 + (i - 2) * 16 } : { seam: 14 }),

  // 10 — the backlog plus the collapse: the bottom drawer is out to the stop,
  //      sagging, with a file jammed in the front.
  "10-backlog-collapse": page(
    i => i === 5 ? { open: 104, spill: 1, packed: 126, tilt: 1.5, stuck: 1 }
      : (i >= 2 && i <= 4) ? { open: 30 + (i - 2) * 24, spill: 1, packed: 46 + (i - 2) * 20 } : bulging(i),
    i => i === 6 ? { open: 104, spill: 1, packed: 126, tilt: 1.5, stuck: 1 }
      : (i >= 3 && i <= 5) ? { open: 30 + (i - 3) * 24, spill: 1, packed: 46 + (i - 3) * 20 } : bulging(i)),
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
const shown = 1920, tall = 820;
writeFileSync(sheet, `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#0b0c14;padding:14px;font:12px monospace;color:#94b0c2}
.row{margin-bottom:16px}.wrap{position:relative;width:${shown}px;height:${tall}px;overflow:hidden}
.tile{position:absolute;inset:0;background-repeat:repeat;background-position:center top}
.col{position:absolute;left:50%;transform:translateX(-50%);top:0;bottom:0;width:${COL}px;
  background:#1a1c2c;border-inline:1px dashed #b13e53}
.col b{display:block;color:#e8dfcb;font:11px monospace;padding:8px}</style>
${jobs.map(j => `<div class="row"><div>${j.out.split("/").pop()} — natural size, repeating, in a ${shown}px window</div>
  <div class="wrap"><div class="tile" style="background-image:url('file://${j.out}')"></div>
  <div class="col"><b>itch content panel (~${COL}px, measured)</b></div></div></div>`).join("")}`);
writeFileSync(join(work, "sheet.json"), JSON.stringify([{ html: sheet, out: join(OUT, "_preview.png"),
  w: shown + 28, h: (tall + 36) * jobs.length + 14, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "sheet.json")], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log(`\n${jobs.length} cabinet candidates in ${OUT}/  (${W}x${H}, seamless vertical tile)`);
