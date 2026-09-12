import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Every component in here runs in the browser, so the whole bundle is a
  // client module for frameworks that draw the server/client line (Next.js).
  banner: { js: '"use client";' },
});
