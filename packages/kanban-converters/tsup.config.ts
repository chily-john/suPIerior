import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "extension-src/kanban-converters/index.ts" },
  outDir: "dist",
  format: ["esm", "cjs"],
  platform: "node",
  target: "node20",
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
});
