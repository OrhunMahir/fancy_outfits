const { buildSync } = require("esbuild");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const workDir = mkdtempSync(join(tmpdir(), "fancy-outfits-v195-"));
const outfile = join(workDir, "v195-check.mjs");

try {
  buildSync({
    entryPoints: [join(__dirname, "v195-check.mjs")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: "inline",
    logLevel: "silent",
  });

  const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
