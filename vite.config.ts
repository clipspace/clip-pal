import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server for the demo page only; the library itself is built by tsup.
export default defineConfig({
  root: "demo",
  plugins: [react()],
  server: { port: 5178, strictPort: true },
});
