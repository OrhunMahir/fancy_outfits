import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base:'./' keeps asset paths relative so the built game also works from
// file:// inside the Electron shell and on GitHub Pages subpaths.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: Number(process.env.PORT) || 5173 },
});
