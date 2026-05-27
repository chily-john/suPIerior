import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "extension-src/tui-tools") } },
  test: { include: ["tests/**/*.test.ts"] },
});
