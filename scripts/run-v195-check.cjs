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
    // electron/store.js is CommonJS and requires node builtins; bundling it into
    // an ESM file leaves `require` undefined without this shim.
    banner: { js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);" },
    sourcemap: "inline",
    logLevel: "silent",
  });

  const result = spawnSync(process.execPath, ["--enable-source-maps", outfile], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
