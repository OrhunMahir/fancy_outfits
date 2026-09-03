// Writes the logo SVG pack from src/game/logo.js — the same builder the start
// screen draws with, so a file on disk can never disagree with the game.
//
//   node scripts/build-logo.mjs [outDir]     (default: assets/logo)
//
// SVG only, on purpose: the PNG/.ico/.icns set is a packaging concern that needs
// tools not every machine has (a browser to rasterise, iconutil for .icns). Those
// are built once at release time from these masters and committed alongside them.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildLogo, LOGO_SIZE } from "../src/game/logo.js";

const VARIANTS = [
  ["fancy-outfits-mark", {},
    "FANCY OUTFITS — a suit with a case file standing in the breast pocket, the name running down it and cut by the pocket line"],
  ["fancy-outfits-icon", { lettering:false, fill:true, frame:true },
    "FANCY OUTFITS icon — the suit and pocket file inside a gold bevel frame"],
  ["fancy-outfits-icon-plain", { lettering:false, fill:true },
    "FANCY OUTFITS icon — the suit and pocket file, no frame"],
];

const svg = (opts, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" role="img" aria-label="${label}">\n` +
  buildLogo(opts).map(s => `  <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`).join("\n") +
  `\n</svg>\n`;

const out = process.argv[2] || "assets/logo";
mkdirSync(out, { recursive: true });
for (const [name, opts, label] of VARIANTS) {
  const file = join(out, name + ".svg");
  writeFileSync(file, svg(opts, label));
  console.log("wrote", file);
}
