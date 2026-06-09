import { defineConfig } from "tsup";

const external = ["@mariozechner/pi-coding-agent"];

export default defineConfig({
  entry: { index: "extension-src/workflower/index.ts" },
  outDir: "dist",
  format: ["esm", "cjs"],
  platform: "node",
  target: "node20",
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  external,
});
