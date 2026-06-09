import { join } from "node:path";

export function resolveActiveStatePath(cwd: string, sessionId: string): string {
  return join(cwd, ".pi", "tmp", "workflows", "active", `${safeSessionFileName(sessionId)}.json`);
}

function safeSessionFileName(sessionId: string): string {
  return sessionId.replace(/[^A-Za-z0-9._-]/g, "_");
}
