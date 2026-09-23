// Section headings for the itch description, rendered as post-its.
//
//   node scripts/store-headings.mjs
//
// Why images and not CSS: itch sanitises the description HTML. Surveying 100 of
// the site's top-rated pages, the only style properties that survive are width,
// height, font-size, color, background, background-color, background-size,
// text-align and margin — no padding, no border, no transform, no box-shadow. A
// post-it needs all four of those, so the post-it is a picture and the heading is
// its alt text.
//
// Rendered at 2x for retina and placed at half size, so they stay crisp.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const OUT = resolve("assets/store/headings");
const FONT = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2")).toString();

// The game's own gold, and the ink it uses on paper.
const TONES = ["#ffcd75", "#ffe0a0", "#f7c05f", "#ffd98c"];
const INK = "#2b2118";
const FS = 17, PAD = 32, LEAD = 34, NOTE = 420, MARGIN = 28;
// NOTE is fixed so every heading is the same width and the page keeps a rhythm;
// the long ones wrap to two lines and simply come out taller, the way a note does.

const headings = [
  "The desk is only half of it",
  "Five ways to start",
  "Before you download",
  "Known rough edges",
];

const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const lines = t => Math.max(1, Math.ceil(t.length / Math.floor((NOTE - PAD * 2) / FS)));

const page = (text, i) => {
  const h = PAD * 2 + lines(text) * LEAD;
  const rot = ((i % 3) - 1) * 1.7 || 1.2;
  return {
    w: NOTE + MARGIN * 2, h: h + MARGIN * 2,
    html: `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:transparent}
body{display:flex;align-items:center;justify-content:center;
  font-family:'Press Start 2P',monospace;image-rendering:pixelated}
.note{position:relative;width:${NOTE}px;height:${h}px;background:${TONES[i % TONES.length]};
  color:${INK};font-size:${FS}px;line-height:${LEAD}px;padding:${PAD}px;
  transform:rotate(${rot}deg);box-shadow:0 12px 22px rgba(0,0,0,.5)}
.tape{position:absolute;left:0;right:0;top:0;height:10px;background:rgba(0,0,0,.1)}
/* the corner somebody has picked at */
.curl{position:absolute;right:0;bottom:0;width:30px;height:30px;
  background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,.22) 50%)}
.curl2{position:absolute;right:0;bottom:0;width:0;height:0;
  border-left:30px solid transparent;border-bottom:30px solid rgba(255,255,255,.34)}
</style><div class="note"><div class="tape"></div>${text}<div class="curl"></div><div class="curl2"></div></div>`,
  };
};

const work = mkdtempSync(join(tmpdir(), "fo-head-"));
mkdirSync(OUT, { recursive: true });
const jobs = headings.map((text, i) => {
  const p = page(text, i);
  const html = join(work, slug(text) + ".html");
  writeFileSync(html, p.html);
  return { html, out: join(OUT, slug(text) + ".png"), w: p.w, h: p.h, transparent: true, scale: 2, _css: p };
});
writeFileSync(join(work, "jobs.json"), JSON.stringify(jobs));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });
rmSync(work, { recursive: true, force: true });

console.log("\nPaste into the description's HTML view, in place of each <h2>:\n");
for(const j of jobs){
  const name = j.out.split("/").pop();
  console.log(`  <p><img src="UPLOADED_URL/${name}" alt="${headings[jobs.indexOf(j)]}" style="width: ${j.w}px"></p>`);
}
console.log(`\n  Upload each PNG with the image button in the description toolbar, then\n  swap its src into the line above. Width is set to half the pixels on purpose:\n  they render at 2x so they stay sharp on a retina screen.\n`);
