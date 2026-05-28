import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { projectStateDir } from "@shared/paths";

export function maintainerQueuePath(cwd: string): string {
  return path.join(projectStateDir(cwd), "queue.json");
}
export function maintainerActivePath(cwd: string): string {
  return path.join(projectStateDir(cwd), "active.json");
}
export function maintainerLockPath(cwd: string): string {
  return path.join(projectStateDir(cwd), "maintainer.lock");
}
export function maintainerLogPath(cwd: string): string {
  return path.join(projectStateDir(cwd), "maintainer.log");
}
function moduleDir(): string {
  return typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
}

export function maintainerSkillPath(): string {
  const here = moduleDir();
  const candidates = [
    // Built package entry: dist/index.{js,mjs} -> package root skills.
    path.resolve(here, "..", "skills", "rules-maintainer"),
    // Built extension entry: dist/extensions/pi-rules.mjs -> package root skills.
    path.resolve(here, "..", "..", "skills", "rules-maintainer"),
    // Source extension: extension-src/pi-rules/features/rule-maintenance/paths.ts -> package root skills.
    path.resolve(here, "..", "..", "..", "..", "skills", "rules-maintainer"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}
