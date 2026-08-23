import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("./src/entry.ts", import.meta.url)),
      fileName: "ai-orchestrator-panel",
      formats: ["es"],
    },
    minify: true,
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
  },
});
