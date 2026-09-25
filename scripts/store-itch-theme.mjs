// The itch page theme that goes with the blotter background, and a preview of it.
//
//   node scripts/store-itch-theme.mjs
//
// itch's "Edit theme" panel writes CSS custom properties onto the page. The live
// page currently carries itch's stock values, so this file is both the proposal
// and the record of what was typed in. Output: assets/store/backgrounds/_theme.png

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const OUT = resolve("assets/store/backgrounds");
const BG = pathToFileURL(join(OUT, "cabinet", "01-notes.png")).toString();
// itch serves exactly two body fonts, Lato and the pixel one. This is the pixel
// one, pulled from itch's own CDN so the preview renders the real thing — it is
// never committed, and the published page loads it from itch anyway.
const FONT_CSS = "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap";
const HEAD_FONT = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();
const COVER = pathToFileURL(resolve("assets/store/capsules/itch-cover-630x500.png")).toString();
const SHOTS = ["03-case-file", "09-trial", "07-lockpick", "06-contradiction"].map(n =>
  pathToFileURL(resolve(`assets/store/screenshots/${n}.png`)).toString());

// The page is a case file; the column is the game sitting on top of it. Values are
// the game's own palette (src/styles.css :root), not new colours invented for itch.
// Keyed exactly as itch's Edit theme panel labels them, so this can be copied
// field by field without translating anything.
export const THEME = {
  "BG":                 "#151a28",        // the room behind the cabinets
  "BG 2":               "#1a1c2c",        // the content panel; the game's own --bg
  "Text":               "#e8dfcb",
  "Link":               "#ffcd75",        // --gold, the logo's colour
  "Headers":            "#ffcd75",
  "Buttons":            "#ffcd75",
  "BG2 Alpha":          "max (opaque)",   // 76 of the top 100 pages are fully opaque
  "Font":               "DotGothic16",    // the user's pick: a dot face, readable at length
  "Size":               "Large",
  "Header font":        "Press Start 2P", // the game's own face, on headings only
  "Screenshots":        "Auto",
  "Background image":   "cabinet/01-notes.png",
  "  Repeat":           "Both",
  "  Align":            "Center",
  "  Fixed":            "OFF — let the wall scroll",
};


const t = THEME;

// background-attachment:fixed pins the image to the VIEWPORT, so it never moves
// as the page scrolls and there is no "below the background" to run out of. A
// single tall screenshot cannot show that, and one that tries reads as an empty
// bottom half. So: two real viewports, page top and page scrolled, same band.
// 960 is itch's real panel width; an earlier 1265 came from reading a screenshot
// as if it were 1:1. The window here is 1440, a fair middle.
const VW = 1440, VH = 900, PANEL = 960;

const column = (top) => `<div class="page" style="top:${top}px">
  <div class="col">
    <h1>FANCY OUTFITS</h1>
    <div class="by">A downloadable game for Windows and macOS</div>
    <div class="hero">
      <img src="${COVER}">
      <div>
        <div class="tag">Read the file. Pick your line. Don't get HENDERED. A pixel-art
        lawyer career sim where the winning argument is hidden in the paperwork — and the
        safe play always works, but slowly kills you.</div>
        <a class="btn">Download Now</a>
      </div>
    </div>
    <table>
      <tr><td>Status</td><td>In development</td></tr>
      <tr><td>Author</td><td><a>scaphoid</a></td></tr>
      <tr><td>Genre</td><td><a>Simulation</a></td></tr>
      <tr><td>Tags</td><td><a>pixel-art</a>, <a>narrative</a>, <a>management</a></td></tr>
    </table>
    <hr>
    <p><b>You are the newest junior associate at Parson Henderson LLP, and nobody has told
    you where the coffee is.</b></p>
    <p>Every morning, case files land in your inbox. Every file is a wall of text — and
    somewhere in that wall is the thing that wins it: the signature from someone who had no
    authority to sign, the date that comes <i>after</i> the date it is supposed to come
    before. Read carefully and you will find it. Skim, and you will pick the confident
    option that loses.</p>
    <h2>The desk is only half of it</h2>
    <p>Take a case to a jury. Object by naming the ground, from a fixed list, and be right.
    Put a chronology in order from memory. Match a witness's contradictions to the exhibits.
    Redact the privileged pages, and only those, because hiding an ordinary record is
    document concealment.</p>
    <div class="shots">${SHOTS.map(x => `<img src="${x}">`).join("")}</div>
    <h2>Five ways to start</h2>
    <p>The Fraud never went to law school. The Debtor owes a payment every three days. The
    Legacy has a parent's name on the wall. The Defector jumped ship. The Boomerang was
    fired once, and hired back.</p>
  </div></div>`;

const viewport = (label, top) => `<div class="cap">${label}</div>
<div class="vp"><div class="bg"></div>${column(top)}</div>`;

const work = mkdtempSync(join(tmpdir(), "fo-theme-"));

// itch serves the pixel face itself, so pull the real one rather than approximating
// it. Never committed — the published page loads it from itch the same way.
// The page loads its face from Google Fonts, so the preview does too.
let face = "";
try {
  const ua = { "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130.0 Safari/537.36" };
  const css = await (await fetch(FONT_CSS, { headers: ua })).text();
  const u = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]).pop();
  const f = join(work, "body.woff2");
  writeFileSync(f, Buffer.from(await (await fetch(u)).arrayBuffer()));
  face = `@font-face{font-family:'DotGothic16';src:url('${pathToFileURL(f)}') format('woff2');font-display:block}` +
    `@font-face{font-family:'Press Start 2P';src:url('${HEAD_FONT}') format('woff2');font-display:block}`;
} catch { console.log("  (could not fetch the face; preview falls back to monospace)"); }
const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
${face}\nbody{background:#0b0c14;font:16px/1.6 'DotGothic16',monospace}
.cap{color:#94b0c2;font:12px monospace;padding:9px 4px}
.vp{position:relative;width:${VW}px;height:${VH}px;overflow:hidden}
.bg{position:absolute;inset:0;background:${t["BG"]} url('${BG}') center top repeat}
.page{position:absolute;left:0;right:0}
.bar{height:52px;background:#585858}
.col{width:${PANEL}px;margin:0 auto;background:${t["BG 2"]};color:${t["Text"]};
  font-family:'DotGothic16',Lato,monospace;font-size:18px;line-height:1.6;
  padding:34px 40px 60px}
h1{font-family:'Press Start 2P',monospace;font-size:26px;font-weight:normal;margin-bottom:8px;color:${t["Headers"]}}
.by{color:${t["Link"]};margin-bottom:26px}
.hero{display:flex;gap:28px;margin-bottom:28px}
.hero img{width:330px;border:1px solid #3d4763}
.tag{font-size:17px;line-height:1.7;margin-bottom:22px}
.btn{display:inline-block;background:${t["Buttons"]};color:${t["BG"]};
  font-weight:700;padding:13px 26px;border-radius:3px;text-shadow:0 1px 0 #d9a44f}
table{border-collapse:collapse;margin:26px 0;font-size:15px}
td{border:1px solid #3d4763;padding:7px 14px}
td:first-child{opacity:.6}
a{color:${t["Link"]};text-decoration:none}
hr{border:0;height:1px;background:#3d4763;margin:26px 0}
h2{font-family:'Press Start 2P',monospace;font-size:19px;font-weight:normal;margin:30px 0 12px;color:${t["Headers"]}}
p{margin-bottom:14px}
.shots{display:flex;gap:10px;margin-top:26px}
.shots img{width:${Math.round((PANEL - 110) / 4)}px;border:1px solid #3d4763}
</style>
${viewport("1440x900 — the page as it opens", 52)}
${viewport("1440x900 — scrolled. natural size + repeat, so nothing is ever scaled", -760)}`;

const page = join(work, "theme.html");
writeFileSync(page, html);
const out = join(OUT, "_theme.png");
writeFileSync(join(work, "jobs.json"), JSON.stringify([{ html: page, out, w: VW, h: VH * 2 + 76, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });
rmSync(work, { recursive: true, force: true });

console.log("\nEdit theme → paste these:\n");
for(const [k, v] of Object.entries(THEME)) console.log(`  ${k.padEnd(20)} ${v}`);
console.log("");
