import { defineConfig } from "tsup";

const external = ["@mariozechner/pi-coding-agent", "@supierior/workflower"];

export default defineConfig({
  entry: { index: "extension-src/experimental-workflows/index.ts" },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  external,
});
