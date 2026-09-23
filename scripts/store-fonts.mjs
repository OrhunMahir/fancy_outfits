// The same block of the page set five ways, so the body/heading pairing gets judged
// instead of argued about.
//
//   node scripts/store-fonts.mjs   ->  assets/store/backgrounds/_fonts.png
//
// itch's font picker takes any Google Fonts family name typed into it, so the
// choice is the whole Google library rather than a dropdown. The game's own face,
// Press Start 2P, is in there — which is why the top row exists: to show what it
// does to a paragraph, and why it belongs on headings only.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const work = mkdtempSync(join(tmpdir(), "fo-font-"));

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
async function face(family, name = family){
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
  const css = await (await fetch(url, { headers: UA })).text();
  const u = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
  if(!u.length){ console.error("no font url for", family, css.slice(0, 200)); return ""; }
  const f = join(work, name.replace(/\W/g, "") + ".woff2");
  writeFileSync(f, Buffer.from(await (await fetch(u[u.length - 1])).arrayBuffer()));
  return `@font-face{font-family:'${name}';src:url('${pathToFileURL(f)}') format('woff2');font-display:block}`;
}

const LOCAL = pathToFileURL(resolve("src/fonts/press-start-2p-latin.woff2"));
const faces = [
  `@font-face{font-family:'Press Start 2P';src:url('${LOCAL}') format('woff2');font-display:block}`,
  await face("VT323"), await face("Anonymous Pro"), await face("Silkscreen"),
  await face("Pixelify Sans"), await face("DotGothic16"),
].join("");

const BODY = `Every morning, case files land in your inbox. Every file is a wall of text — and
somewhere in that wall is the thing that wins it: the signature from someone who had no
authority to sign, the date that comes after the date it is supposed to come before.`;

// [label, body font, body size, line-height, heading font, heading size]
const opts = [
  ["Press Start 2P everywhere — the game's own face, and why it does not work at length",
   "Press Start 2P", 13, 2.2, "Press Start 2P", 20],
  ["Press Start 2P headings + VT323 body — pixel all the way down, still readable",
   "VT323", 22, 1.35, "Press Start 2P", 20],
  ["Press Start 2P headings + Anonymous Pro body — the most readable of the three",
   "Anonymous Pro", 16, 1.7, "Press Start 2P", 20],
  ["Silkscreen headings + Anonymous Pro body — pixel, but lighter than Press Start",
   "Anonymous Pro", 16, 1.7, "Silkscreen", 19],
  ["Pixelify Sans headings + Anonymous Pro body — pixel outline, softer shapes",
   "Anonymous Pro", 16, 1.7, "Pixelify Sans", 26],
];

const block = ([label, bf, bs, lh, hf, hs]) => `
<div class="cap">${label}</div>
<div class="panel">
  <h2 style="font-family:'${hf}';font-size:${hs}px">The desk is only half of it</h2>
  <p style="font-family:'${bf}';font-size:${bs}px;line-height:${lh}">${BODY}</p>
</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>${faces}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0b0c14;padding:18px;font:12px monospace;color:#94b0c2}
.cap{padding:10px 2px}
.panel{width:960px;background:#1a1c2c;color:#e8dfcb;padding:26px 34px;margin-bottom:10px}
h2{color:#ffcd75;margin-bottom:16px;font-weight:normal}
</style>${opts.map(block).join("")}`;

const page = join(work, "f.html");
writeFileSync(page, html);
const out = resolve("assets/store/backgrounds/_fonts.png");
writeFileSync(join(work, "j.json"), JSON.stringify([{ html: page, out, w: 1032, h: 1500, transparent: false }]));
execFileSync(electronPath, ["scripts/lib/capture-main.cjs", "--manifest", join(work, "j.json")], { stdio: "inherit" });
rmSync(work, { recursive: true, force: true });
