// Five candidate page backgrounds for the itch project page, rendered through
// the same offscreen Electron pipeline as the capsules.
//
//   node scripts/store-backgrounds.mjs
//
// Output: assets/store/backgrounds/NN-name.png (2560x1440) and a preview sheet
// with itch's ~960px content column mocked on top — judging a page background
// without the column covering its middle is judging the wrong picture.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLogo, LOGO_SIZE } from "../src/game/logo.js";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const OUT = resolve("assets/store/backgrounds");
const FONT = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();
const W = 2560, H = 1440, COL = 960;            // itch's content column is ~960 wide

const svg = rects => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">` +
  rects.map(s => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`).join("") + `</svg>`;
const isGround = s => s.x === 0 && s.y === 0 && s.w === LOGO_SIZE && s.h === LOGO_SIZE;
const MARK = svg(buildLogo({}));
const MARK_BARE = svg(buildLogo({}).filter(s => !isGround(s)));

const BASE = `
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Press Start 2P',monospace;image-rendering:pixelated;position:relative}
.scan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 2px,transparent 2px 6px)}
.mark svg{display:block;width:100%;height:100%}
`;

// A case file, drawn the way the game draws one: manila shell, paper, a tab,
// ruled lines, and sometimes the stamp that ends a career.
const file = ({ x, y, rot, w = 330, stamp = false, o = 1 }) => `
<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w * .72}px;
  transform:rotate(${rot}deg);opacity:${o};background:#b7a98a;
  box-shadow:0 18px 40px rgba(0,0,0,.45);border:2px solid #9c8f74">
  <div style="position:absolute;left:${w * .08}px;top:-${w * .05}px;width:${w * .3}px;height:${w * .05}px;background:#b7a98a"></div>
  <div style="position:absolute;inset:${w * .045}px;background:#f2e9d8">
    ${[0, 1, 2, 3, 4].map(i => `<div style="position:absolute;left:8%;right:${i % 2 ? 28 : 12}%;top:${18 + i * 15}%;height:3px;background:#cabea0"></div>`).join("")}
    ${stamp ? `<div style="position:absolute;left:14%;top:38%;transform:rotate(-9deg);
      border:4px solid #b13e53;color:#b13e53;font-size:${w * .07}px;padding:${w * .03}px ${w * .05}px;
      letter-spacing:.08em">HENDERED</div>` : ""}
  </div>
</div>`;

const drawer = ({ label, open = false, side = "left" }) => `
<div style="position:relative;height:178px;background:#3d4763;
  border-bottom:4px solid #1c2233;${open ? "transform:translateX(" + (side === "left" ? 62 : -62) + "px);box-shadow:-34px 0 58px rgba(0,0,0,.6);z-index:3" : ""}">
  <div style="position:absolute;inset:0 0 auto 0;height:4px;background:#5b6a95"></div>
  <div style="position:absolute;inset:auto 0 0 0;height:10px;background:linear-gradient(#2a3149,#232a3f)"></div>
  <div style="position:absolute;${side === "left" ? "left:54px" : "right:54px"};top:58%;transform:translateY(-50%);
    width:236px;height:30px;background:#6b7bb4;border-radius:4px;
    box-shadow:0 3px 0 #4a5680, inset 0 3px 0 #8a99cc"></div>
  <div style="position:absolute;${side === "left" ? "left:54px" : "right:54px"};top:19%;
    background:#efece2;color:#2b2118;font-size:16px;padding:10px 18px;letter-spacing:.06em;
    box-shadow:0 2px 0 rgba(0,0,0,.35)">${label}</div>
  ${open ? `
    <div style="position:absolute;left:34px;right:-40px;top:-54px;height:34px;background:#cabea0;
      box-shadow:0 3px 0 #a8996f"></div>
    <div style="position:absolute;left:66px;right:-14px;top:-30px;height:34px;background:#b7a98a;
      box-shadow:0 3px 0 #9c8f74"></div>
    <div style="position:absolute;left:98px;right:10px;top:-8px;height:30px;background:#f2e9d8;
      box-shadow:0 3px 0 #cabea0"></div>` : ""}
</div>`;

// The Kessler file, verbatim from content.js. Set full-bleed so itch's column
// hides the middle of every line and the reader is left with the edges of a
// document — which is exactly what the game asks of them.
const CASE_TITLE = "CASE: Kessler NDA breach";
const CASE_BODY = "Client Kessler Corp is being sued for breaching an NDA. Reading the file: " +
  "the NDA was signed by a Vice President of the counterparty who — per exhibit C — " +
  "had NO signing authority under their own bylaws. Opposing counsel hasn't noticed.";

const pages = {
  // 1 — the player's idea: files sliding past in the gutters, logo as a watermark
  "01-docket-wall": `<body style="background:#1a1c2c">
    <div class="mark" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:820px;height:820px;opacity:.085">${MARK_BARE}</div>
    ${file({ x: -110, y: -40, rot: -7, w: 360 })}
    ${file({ x: -60, y: 250, rot: -11, w: 330, stamp: true })}
    ${file({ x: -130, y: 560, rot: -15, w: 380 })}
    ${file({ x: -50, y: 880, rot: -19, w: 340 })}
    ${file({ x: -120, y: 1180, rot: -24, w: 360, stamp: true })}
    ${file({ x: 2320, y: -60, rot: 8, w: 350, stamp: true })}
    ${file({ x: 2270, y: 240, rot: 12, w: 380 })}
    ${file({ x: 2340, y: 570, rot: 16, w: 330 })}
    ${file({ x: 2260, y: 870, rot: 21, w: 370, stamp: true })}
    ${file({ x: 2330, y: 1170, rot: 26, w: 340 })}
    <div class="scan"></div></body>`,

  // 2 — the page is the office: wall, windows, floor, desk along the bottom
  "02-desk-extended": `<body style="background:#44526b">
    <div style="position:absolute;inset:0 0 38% 0;background:#44526b"></div>
    <div style="position:absolute;top:62%;inset-inline:0;bottom:0;background:#75694f"></div>
    <div style="position:absolute;top:62%;inset-inline:0;height:6px;background:#5d5440"></div>
    ${[140, 900, 1660].map(x => `
      <div style="position:absolute;left:${x}px;top:150px;width:520px;height:420px;background:#0f0f1b;padding:14px">
        <div style="position:absolute;inset:14px;background:#1a2b4a"></div>
        ${[0, 1, 2].map(i => `<div style="position:absolute;left:14px;right:14px;top:${70 + i * 64}px;height:5px;background:#3d4152;opacity:.8"></div>`).join("")}
        <div style="position:absolute;left:70px;bottom:14px;width:90px;height:150px;background:#0f0f1b"></div>
        <div style="position:absolute;left:190px;bottom:14px;width:110px;height:230px;background:#141b33"></div>
        <div style="position:absolute;left:330px;bottom:14px;width:86px;height:120px;background:#0f0f1b"></div>
        <div style="position:absolute;left:214px;bottom:150px;width:26px;height:26px;background:#ffcd75"></div>
        <div style="position:absolute;left:96px;bottom:60px;width:24px;height:24px;background:#ffcd75"></div>
      </div>`).join("")}
    <div style="position:absolute;left:0;top:210px;width:210px;height:610px;background:#241a10"></div>
    <div style="position:absolute;left:24px;top:238px;width:162px;height:560px;background:#5a4430"></div>
    <div style="position:absolute;left:152px;top:540px;width:22px;height:34px;background:#ffcd75"></div>
    <div style="position:absolute;right:120px;top:600px;width:250px;height:290px;background:#6a7080"></div>
    ${[0, 1, 2].map(i => `<div style="position:absolute;right:140px;top:${640 + i * 92}px;width:210px;height:7px;background:#3d4152"></div>`).join("")}
    <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:#8a7550"></div>
    <div style="position:absolute;left:0;right:0;bottom:300px;height:14px;background:#6e5a44"></div>
    <div style="position:absolute;left:300px;bottom:300px;width:300px;height:170px;background:#3b5dc9"></div>
    <div style="position:absolute;left:316px;bottom:316px;width:268px;height:138px;background:#1a1c2c"></div>
    <div style="position:absolute;right:420px;bottom:300px;width:120px;height:56px;background:#b13e53"></div>
    ${file({ x: 1880, y: 1060, rot: -4, w: 300 })}
    <div class="scan"></div></body>`,

  // 3 — the page as the terminal the game runs inside
  "03-crt": `<body style="background:#1a1c2c">
    <div style="position:absolute;inset:0;
      background:radial-gradient(ellipse at 50% 45%, rgba(59,93,201,.14) 0%, rgba(26,28,44,0) 62%)"></div>
    <div style="position:absolute;inset:0;box-shadow:inset 0 0 340px 120px rgba(0,0,0,.85)"></div>
    <div style="position:absolute;inset:0;
      background:linear-gradient(90deg, rgba(177,62,83,.12) 0 3px, transparent 3px 100%),
                 linear-gradient(270deg, rgba(59,93,201,.12) 0 3px, transparent 3px 100%)"></div>
    <div class="mark" style="position:absolute;left:96px;top:86px;width:150px;height:150px;
      border:4px solid #3b5dc9;opacity:.9">${MARK}</div>
    <div style="position:absolute;left:96px;top:262px;color:#94b0c2;font-size:15px;letter-spacing:.2em">
      PARSON HENDERSON LLP</div>
    <div style="position:absolute;left:96px;top:294px;width:150px;height:5px;background:#3b5dc9"></div>
    <div style="position:absolute;right:96px;bottom:92px;color:#3d4763;font-size:13px;letter-spacing:.24em">
      DON'T GET HENDERED</div>
    <div class="scan"></div></body>`,

  // 4 — the archive itself: drawers up both gutters, one pulled open
  // 4 — the archive itself, with depth and the labels kept off the crop edge
  "04-filing-cabinet": `<body style="background:#151a28">
    <div style="position:absolute;left:0;top:-40px;width:620px;height:calc(100% + 80px);background:#2a3149;
      box-shadow:inset -26px 0 46px rgba(0,0,0,.55)">
      ${drawer({ label: "KESSLER" })}${drawer({ label: "ALDERGATE", open: true })}
      ${drawer({ label: "HALCYON" })}${drawer({ label: "VANCE" })}
      ${drawer({ label: "REDVALE" })}${drawer({ label: "NIMBUSHOST" })}
      ${drawer({ label: "PEMBERTON" })}${drawer({ label: "CORVID" })}
      ${drawer({ label: "ASHGROVE" })}
    </div>
    <div style="position:absolute;right:0;top:-118px;width:620px;height:calc(100% + 200px);background:#2a3149;
      box-shadow:inset 26px 0 46px rgba(0,0,0,.55)">
      ${drawer({ label: "BELLWETHER", side: "right" })}${drawer({ label: "RAVENSCROFT", side: "right" })}
      ${drawer({ label: "ALMEIDA", side: "right" })}${drawer({ label: "KEPLER TOWER", side: "right" })}
      ${drawer({ label: "SABLE & ROE", open: true, side: "right" })}${drawer({ label: "MERIDIAN", side: "right" })}
      ${drawer({ label: "THORNE", side: "right" })}${drawer({ label: "HALLORAN", side: "right" })}
      ${drawer({ label: "WESTBROOK", side: "right" })}
    </div>
    <div class="mark" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:760px;height:760px;opacity:.055">${MARK_BARE}</div>
    <div style="position:absolute;left:620px;right:620px;bottom:0;height:210px;
      background:linear-gradient(transparent,rgba(0,0,0,.55))"></div>
    <div class="scan"></div></body>`,

  // 5 — invert it: the whole page is one enormous case file
  "05-blotter": `<body style="background:#f2e9d8">
    ${Array.from({ length: 30 }, (_, i) => `<div style="position:absolute;left:0;right:0;top:${196 + i * 42}px;height:2px;background:#dfd3b7"></div>`).join("")}
    <div style="position:absolute;left:232px;top:0;bottom:0;width:3px;background:#e2a5ad"></div>
    <div style="position:absolute;right:232px;top:0;bottom:0;width:3px;background:#e2a5ad"></div>

    <div style="position:absolute;left:96px;right:96px;top:84px;color:#2b2118;font-size:34px;
      letter-spacing:.04em">${CASE_TITLE}</div>
    <div style="position:absolute;left:96px;right:96px;top:150px;height:3px;background:#b7a98a"></div>
    <div style="position:absolute;left:96px;right:96px;top:206px;color:#2b2118;font-size:27px;
      line-height:2.28;opacity:.72;word-spacing:-2px">${CASE_BODY}</div>
    <div style="position:absolute;left:96px;right:96px;top:640px;color:#8a6a1f;font-size:21px;
      opacity:.85">DEADLINE: DAY 3 · BASE TIME: 2h (careful plays take longer)</div>

    <!-- The body is full-bleed, so the column eats the middle of every line and the
         gutters keep only line-starts. These exhibit tabs are short enough to stay
         whole at any width — the gutter always has something it can finish saying. -->
    ${["EXHIBIT A", "EXHIBIT B", "EXHIBIT C", "EXHIBIT D"].map((t, i) => `
      <div style="position:absolute;left:0;top:${1050 + i * 78}px;background:#cabea0;color:#2b2118;
        font-size:17px;padding:11px 20px 11px 30px;letter-spacing:.08em;
        box-shadow:0 3px 0 #a8996f">${t}</div>`).join("")}
    ${["FILED", "SEALED", "ON APPEAL"].map((t, i) => `
      <div style="position:absolute;right:0;top:${1080 + i * 78}px;background:#cabea0;color:#2b2118;
        font-size:17px;padding:11px 30px 11px 20px;letter-spacing:.08em;
        box-shadow:0 3px 0 #a8996f">${t}</div>`).join("")}

    <div style="position:absolute;left:96px;top:820px;transform:rotate(-13deg);
      border:9px solid #b13e53;color:#b13e53;font-size:50px;padding:28px 38px;letter-spacing:.08em;
      opacity:.9">HENDERED</div>
    <div style="position:absolute;right:150px;top:760px;width:300px;height:300px;border-radius:50%;
      border:20px solid rgba(120,84,44,.2)"></div>
    <div style="position:absolute;right:236px;top:846px;width:128px;height:128px;border-radius:50%;
      border:8px solid rgba(120,84,44,.12)"></div>
    <div style="position:absolute;left:58px;top:132px;width:30px;height:210px;
      border:11px solid #8fa3b6;border-radius:60px;transform:rotate(11deg)"></div>

    <div style="position:absolute;left:270px;bottom:120px;color:#2b2118;font-size:19px;
      letter-spacing:.18em;opacity:.5">PARSON HENDERSON LLP</div>
    <div class="mark" style="position:absolute;right:120px;bottom:110px;width:180px;height:180px;
      border:6px solid #2b2118;opacity:.92">${MARK}</div>
  </body>`,
};

const work = mkdtempSync(join(tmpdir(), "fo-bg-"));
mkdirSync(OUT, { recursive: true });
const jobs = Object.entries(pages).map(([name, body]) => {
  const html = join(work, name + ".html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${BASE}</style>${body}`);
  return { html, out: join(OUT, name + ".png"), w: W, h: H, transparent: false };
});
writeFileSync(join(work, "jobs.json"), JSON.stringify(jobs));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });

// Preview: every candidate with itch's content column mocked over its middle.
const sheet = join(work, "sheet.html");
writeFileSync(sheet, `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#0b0c14;padding:18px;font:12px monospace;color:#94b0c2}
.row{margin-bottom:18px}.wrap{position:relative;width:900px}
img{display:block;width:900px;border:1px solid #3b5dc9}
.col{position:absolute;left:50%;transform:translateX(-50%);top:0;bottom:0;width:${(COL / W * 900).toFixed(0)}px;
  background:rgba(255,255,255,.90);border-inline:1px dashed #b13e53}
.col b{display:block;color:#333;font:11px monospace;padding:8px}</style>
${jobs.map(j => `<div class="row"><div>${j.out.split("/").pop()}</div>
  <div class="wrap"><img src="file://${j.out}"><div class="col"><b>itch content column (~960px)</b></div></div></div>`).join("")}`);
writeFileSync(join(work, "sheet.json"), JSON.stringify([{ html: sheet, out: join(OUT, "_preview.png"), w: 960, h: 2400, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "sheet.json")], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log(`\n${jobs.length} backgrounds in ${OUT}/  (${W}x${H})`);
