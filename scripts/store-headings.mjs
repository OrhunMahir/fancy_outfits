// Section headings for the itch description, rendered as pictures.
//
//   node scripts/store-headings.mjs --options      three styles + a preview sheet
//   node scripts/store-headings.mjs --style pin    the chosen style, into headings/
//
// Why images and not CSS: itch sanitises the description HTML. Surveying 100 of
// the site's top-rated pages, the only style properties that survive are width,
// height, font-size, color, background, background-color, background-size,
// text-align and margin — no padding, no border, no transform, no box-shadow. A
// post-it needs all four of those, so the heading is a picture and its text is
// the alt text.
//
// Rendered at 2x for retina and placed at half size (the printed <img> lines set
// that width), so they stay crisp. Shadows are hard pixel offsets, like the game's
// own panels — the first version's soft blur was the one thing on the page that
// did not look like the game.

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
const INK = "#2b2118";

const headings = [
  "The desk is only half of it",
  "Five ways to start",
  "Before you download",
  "Known rough edges",
];
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Press Start 2P is monospaced with a 1em advance, so wrapping can be done here and
// the canvas sized exactly, instead of measuring in the browser.
const wrap = (text, perLine) => text.split(" ").reduce((ls, w) => {
  const last = ls[ls.length - 1];
  if(last && (last + " " + w).length <= perLine) ls[ls.length - 1] = last + " " + w; else ls.push(w);
  return ls;
}, []);

const M = 16; // transparent margin, room for the tilt and the hard shadow

const STYLES = {
  // A sticky note held by a red pin, adhesive band at the top.
  pin: (text, i) => {
    const W = 380, FS = 15, PAD = 26, LEAD = 28;
    const ls = wrap(text, Math.floor((W - PAD * 2) / FS));
    const H = PAD * 2 + 10 + ls.length * LEAD;
    const tone = ["#ffcd75", "#ffd98c", "#f7c05f", "#ffe0a0"][i % 4], rot = [-1.4, 1.1, -0.8, 1.5][i % 4];
    return { w: W + M * 2, h: H + M * 2 + 8, body: `
      <div style="position:absolute;left:${M}px;top:${M + 8}px;width:${W}px;height:${H}px;transform:rotate(${rot}deg)">
        <div style="position:absolute;left:8px;top:8px;width:${W}px;height:${H}px;background:rgba(10,12,22,.45)"></div>
        <div style="position:absolute;inset:0;background:${tone}"></div>
        <div style="position:absolute;left:0;top:0;width:${W}px;height:18px;background:rgba(0,0,0,.07)"></div>
        <div style="position:absolute;right:0;bottom:0;width:0;height:0;border-left:24px solid transparent;border-bottom:24px solid #1a1c2c"></div>
        <div style="position:absolute;right:0;bottom:0;width:0;height:0;border-right:24px solid transparent;border-top:24px solid rgba(0,0,0,.18)"></div>
        <div style="position:absolute;left:${W / 2 - 9}px;top:-6px;width:18px;height:18px;background:#b13e53;box-shadow:3px 3px 0 rgba(10,12,22,.45)"></div>
        <div style="position:absolute;left:${W / 2 - 5}px;top:-2px;width:6px;height:6px;background:#e0788a"></div>
        <div style="position:absolute;left:${PAD}px;top:${PAD + 10}px;font-size:${FS}px;line-height:${LEAD}px;color:${INK};white-space:pre">${ls.join("\n")}</div>
      </div>` };
  },
  // An evidence sticker: a red EXHIBIT tab and the heading typed on the label.
  exhibit: (text, i) => {
    const W = 440, TAB = 92, FS = 13, PAD = 20, LEAD = 24;
    const ls = wrap(text, Math.floor((W - TAB - PAD * 2) / FS));
    const H = Math.max(76, PAD * 2 + ls.length * LEAD);
    const rot = [-0.8, 0.6, -0.5, 0.9][i % 4];
    return { w: W + M * 2, h: H + M * 2, body: `
      <div style="position:absolute;left:${M}px;top:${M}px;width:${W}px;height:${H}px;transform:rotate(${rot}deg)">
        <div style="position:absolute;left:7px;top:7px;width:${W}px;height:${H}px;background:rgba(10,12,22,.45)"></div>
        <div style="position:absolute;inset:0;background:#f2e9d8"></div>
        <div style="position:absolute;left:0;top:0;width:${TAB}px;height:${H}px;background:#b13e53"></div>
        <div style="position:absolute;left:${TAB}px;top:0;width:2px;height:${H}px;background:repeating-linear-gradient(0deg,#f2e9d8 0 4px,#b7a98a 4px 8px)"></div>
        <div style="position:absolute;left:0;top:${H / 2 - 26}px;width:${TAB}px;text-align:center;color:#f2e9d8;font-size:8px;letter-spacing:.06em">EXHIBIT</div>
        <div style="position:absolute;left:0;top:${H / 2 - 8}px;width:${TAB}px;text-align:center;color:#ffcd75;font-size:26px;line-height:30px">${"ABCD"[i]}</div>
        <div style="position:absolute;left:${TAB + PAD}px;top:${(H - ls.length * LEAD) / 2}px;font-size:${FS}px;line-height:${LEAD}px;color:${INK};white-space:pre">${ls.join("\n")}</div>
        <div style="position:absolute;left:${TAB + 2}px;right:0;bottom:0;height:5px;background:rgba(0,0,0,.06)"></div>
      </div>` };
  },
  // The top of a manila folder in the drawer: a section tab, the heading on the fold.
  tab: (text, i) => {
    const W = 440, TABW = 150, TABH = 28, FS = 14, PAD = 20, LEAD = 26;
    const ls = wrap(text, Math.floor((W - PAD * 2) / FS));
    const H = PAD * 2 + ls.length * LEAD;
    const tx = [0, 96, 192, 288][i % 4] * .6;   // tabs step across, like real dividers
    return { w: W + M * 2, h: H + TABH + M * 2, body: `
      <div style="position:absolute;left:${M}px;top:${M}px;width:${W}px;height:${H + TABH}px">
        <div style="position:absolute;left:${tx + 7}px;top:7px;width:${TABW}px;height:${TABH}px;background:rgba(10,12,22,.45)"></div>
        <div style="position:absolute;left:7px;top:${TABH + 7}px;width:${W}px;height:${H}px;background:rgba(10,12,22,.45)"></div>
        <div style="position:absolute;left:${tx}px;top:0;width:${TABW}px;height:${TABH + 4}px;background:#c2b491"></div>
        <div style="position:absolute;left:${tx + 12}px;top:9px;font-size:9px;color:${INK}">SECTION ${i + 1}</div>
        <div style="position:absolute;left:0;top:${TABH}px;width:${W}px;height:${H}px;background:#cabea0"></div>
        <div style="position:absolute;left:0;top:${TABH}px;width:${W}px;height:4px;background:#d8cbab"></div>
        <div style="position:absolute;left:${PAD}px;top:${TABH + PAD}px;font-size:${FS}px;line-height:${LEAD}px;color:${INK};white-space:pre">${ls.join("\n")}</div>
      </div>` };
  },
};
const NAMES = { pin: "1 · pinned note", exhibit: "2 · exhibit sticker", tab: "3 · folder tab" };

const doc = body => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:transparent}
body{position:relative;font-family:'Press Start 2P',monospace;image-rendering:pixelated}
</style><body>${body}</body>`;

const arg = process.argv.indexOf("--style");
const chosen = arg > 0 ? process.argv[arg + 1] : null;
const options = process.argv.includes("--options");
if(!options && !STYLES[chosen]){
  console.error(`usage: --options | --style ${Object.keys(STYLES).join("|")}`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "fo-head-"));
const render = jobs => {
  writeFileSync(join(work, "jobs.json"), JSON.stringify(jobs));
  execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "jobs.json")], { stdio: "inherit" });
};
const build = (style, dir) => {
  mkdirSync(dir, { recursive: true });
  return headings.map((text, i) => {
    const p = STYLES[style](text, i), html = join(work, `${style}-${i}.html`);
    writeFileSync(html, doc(p.body));
    return { html, out: join(dir, slug(text) + ".png"), w: p.w, h: p.h, transparent: true, scale: 2 };
  });
};

try{
  if(options){
    const dir = join(OUT, "options");
    const all = Object.keys(STYLES).map(s => ({ s, jobs: build(s, join(dir, s)) }));
    render(all.flatMap(a => a.jobs));
    // The preview is the description column as itch draws it — 553px of DotGothic16
    // on the panel navy — with two headings and the text between them.
    const P = t => `<p style="margin:14px 0 18px">${t}</p>`;
    const img = j => `<img src="${pathToFileURL(j.out)}" style="display:block;width:${j.w}px;height:${j.h}px;margin:10px 0">`;
    const col = a => `<div style="width:600px;background:#1a1c2c;padding:18px 24px 24px">
      <div style="font:10px 'Press Start 2P';color:#ffcd75;margin-bottom:10px">${NAMES[a.s]}</div>
      <div style="width:553px;font:18px/1.6 'DotGothic16',sans-serif;color:#e8dfcb">
        ${img(a.jobs[0])}${P("You are the newest junior associate at Parson Henderson LLP, and nobody has told you where the coffee is.")}
        ${img(a.jobs[1])}${P("The Fraud never went to law school and has a photographic memory.")}${img(a.jobs[3])}</div></div>`;
    const html = join(work, "preview.html");
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=block" rel="stylesheet"><style>
      @font-face{font-family:'Press Start 2P';src:url('${FONT}') format('woff2')}*{margin:0;padding:0;box-sizing:border-box}
      body{background:#0b0d16;display:flex;gap:16px;padding:16px}</style><body>${all.map(col).join("")}</body>`);
    render([{ html, out: join(dir, "_preview.png"), w: 16 + 3 * 616, h: 760, scale: 1 }]);
    console.log(`\nthree styles in ${dir}/ — pick one, then run --style <name>`);
  }else{
    const jobs = build(chosen, OUT);
    render(jobs);
    console.log("\nPaste into the description's HTML view, one per heading:\n");
    jobs.forEach((j, i) => console.log(`  <p><img src="UPLOADED_URL/${j.out.split("/").pop()}" alt="${headings[i]}" style="width: ${j.w}px"></p>`));
    console.log(`\n  Upload each PNG with the description's image button and swap its URL in.\n  The width is half the file's pixels on purpose: they are 2x, for retina.\n`);
  }
}finally{
  rmSync(work, { recursive: true, force: true });
}
