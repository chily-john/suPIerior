import * as path from "node:path";

export function projectStateDir(cwd: string): string {
  return path.join(cwd, ".pi", ".pi-rules");
}

export function normalizeProjectPath(cwd: string, filePath: string): string | undefined {
  if (!filePath || typeof filePath !== "string") return undefined;
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const relative = path.relative(cwd, absolute).replace(/\\/g, "/");
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  if (relative.startsWith(".pi/")) return undefined;
  return relative;
}
