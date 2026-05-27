import { defineConfig } from "tsup";

const external = ["@mariozechner/pi-ai", "@mariozechner/pi-coding-agent"];

export default defineConfig([
  {
    entry: { index: "extension-src/feature-flow/index.ts" },
    outDir: "dist",
    format: ["esm", "cjs"],
    platform: "node",
    target: "node20",
    dts: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    external,
  },
  {
    entry: { "extensions/feature-flow": "extension-src/feature-flow/index.ts" },
    outDir: "dist",
    format: ["esm"],
    outExtension() {
      return { js: ".mjs" };
    },
    platform: "node",
    target: "node20",
    dts: false,
    sourcemap: true,
    clean: false,
    bundle: true,
    external,
  },
]);
