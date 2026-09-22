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
const BG = pathToFileURL(join(OUT, "05-blotter.png")).toString();
const COVER = pathToFileURL(resolve("assets/store/capsules/itch-cover-630x500.png")).toString();
const SHOTS = ["03-case-file", "09-trial", "07-lockpick", "06-contradiction"].map(n =>
  pathToFileURL(resolve(`assets/store/screenshots/${n}.png`)).toString());

// The page is a case file; the column is the game sitting on top of it. Values are
// the game's own palette (src/styles.css :root), not new colours invented for itch.
export const THEME = {
  "Background":         "#f2e9d8",              // the blotter's own paper, so nothing flashes white
  "Content background": "rgba(26,28,44,.94)",   // --bg, a little translucent so the rules ghost through
  "Text":               "#e8dfcb",
  "Link":               "#ffcd75",              // --gold
  "Border":             "#3d4763",
  "Button background":  "#ffcd75",
  "Button text":        "#1a1c2c",
  "Button shadow":      "#d9a44f",
};

const t = THEME;
const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
/* background-attachment:fixed sizes the background to the VIEWPORT, not the page, so a visitor on a
   1600x900 screen sees this 1600x900 band and it never moves as they scroll. The
   mock is taller than that, so pin the band to the top rather than letting cover
   zoom it to the mock's height — otherwise the preview lies about the scale. */
body{font:16px/1.6 -apple-system,Helvetica,Arial,sans-serif;
  background:${t["Background"]} url('${BG}') center top/1600px 900px no-repeat}
.bar{height:52px;background:#585858}
.col{width:960px;margin:0 auto;background:${t["Content background"]};color:${t["Text"]};
  padding:34px 40px 48px}
h1{font-size:40px;font-weight:900;letter-spacing:-.01em;margin-bottom:4px}
.by{color:${t["Link"]};margin-bottom:26px}
.hero{display:flex;gap:28px;margin-bottom:28px}
.hero img{width:380px;border:1px solid ${t["Border"]}}
.tag{font-size:19px;line-height:1.5;margin-bottom:22px}
.btn{display:inline-block;background:${t["Button background"]};color:${t["Button text"]};
  font-weight:700;padding:13px 26px;border-radius:3px;text-shadow:0 1px 0 ${t["Button shadow"]}}
table{border-collapse:collapse;margin:26px 0;font-size:15px}
td{border:1px solid ${t["Border"]};padding:7px 14px}
td:first-child{opacity:.6}
a{color:${t["Link"]};text-decoration:none}
hr{border:0;height:1px;background:${t["Border"]};margin:26px 0}
h2{font-size:25px;font-weight:900;margin:30px 0 12px}
p{margin-bottom:14px}
.shots{display:flex;gap:10px;margin-top:26px}
.shots img{width:222px;border:1px solid ${t["Border"]}}
</style>
<div class="bar"></div>
<div class="col">
  <h1>FANCY OUTFITS</h1>
  <div class="by">A downloadable game for Windows and macOS</div>
  <div class="hero">
    <img src="${COVER}">
    <div>
      <div class="tag">Read the file. Pick your line. Don't get HENDERED. A pixel-art lawyer
      career sim where the winning argument is hidden in the paperwork — and the safe play
      always works, but slowly kills you.</div>
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
  authority to sign, the date that comes <i>after</i> the date it is supposed to come before.
  Read carefully and you will find it. Skim, and you will pick the confident option that loses.</p>
  <h2>The desk is only half of it</h2>
  <p>Take a case to a jury. Object by naming the ground, from a fixed list, and be right.
  Put a chronology in order from memory. Redact the privileged pages, and only those.</p>
  <div class="shots">${SHOTS.map(s => `<img src="${s}">`).join("")}</div>
</div>`;

const work = mkdtempSync(join(tmpdir(), "fo-theme-"));
const page = join(work, "theme.html");
writeFileSync(page, html);
const out = join(OUT, "_theme.png");
writeFileSync(join(work, "jobs.json"), JSON.stringify([{ html: page, out, w: 1600, h: 1500, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });
rmSync(work, { recursive: true, force: true });

console.log("\nEdit theme → paste these:\n");
for(const [k, v] of Object.entries(THEME)) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`\n  Background image     05-blotter.gif   ·  repeat: cover  ·  fixed: on\n`);
