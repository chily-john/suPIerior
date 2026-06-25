import { defineConfig } from "tsup";

const external = [
  "@mariozechner/pi-coding-agent",
  "@mariozechner/pi-ai",
  "@mariozechner/pi-agent-core",
  "@mariozechner/pi-tui",
  "typebox",
];

export default defineConfig([
  {
    entry: {
      index: "extension-src/pi-rules/index.ts",
    },
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "node20",
    dts: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    external,
  },
  {
    entry: {
      "extensions/pi-rules": "extension-src/pi-rules/index.ts",
    },
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
