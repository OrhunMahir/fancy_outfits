import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React Fast Refresh injects one inline module preamble in development. Permit
// only that dev-time path; production keeps the strict script-src policy from
// index.html unchanged.
const devCsp = {
  name: "fancy-outfits-dev-csp",
  transformIndexHtml: {
    order: "pre",
    handler(html,ctx){
      return ctx.server ? html
        .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
        .replace("connect-src 'self';", "connect-src 'self' ws://localhost:* ws://127.0.0.1:* ws://[::1]:*;") : html;
    },
  },
};

// base:'./' keeps asset paths relative so the built game also works from
// file:// inside the Electron shell and on GitHub Pages subpaths.
export default defineConfig({
  plugins: [devCsp, react()],
  base: "./",
  server: { port: Number(process.env.PORT) || 5173 },
});
