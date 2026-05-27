import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "extension-src/tui-tools/index.ts",
    questions: "extension-src/tui-tools/domains/questions/index.ts",
  },
  outDir: "dist",
  format: ["esm", "cjs"],
  platform: "node",
  target: "node20",
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  external: ["@mariozechner/pi-coding-agent"],
});
