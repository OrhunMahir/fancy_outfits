const { buildSync } = require("esbuild");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

// Bundle the browser-oriented game modules for a disposable Node process.
// The simulation entry supplies the tiny localStorage/window shims it needs.
const workDir = mkdtempSync(join(tmpdir(), "fancy-outfits-soak-"));
const outfile = join(workDir, "soak-balance.mjs");

try {
  buildSync({
    entryPoints: [join(__dirname, "soak-balance.mjs")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: "inline",
    logLevel: "silent",
  });

  const result = spawnSync(process.execPath, ["--enable-source-maps", outfile, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
