import { join } from "node:path";
import { resolveActiveWorkflowStatesRoot } from "@orchestration/runtime/workflower-home";

export function resolveActiveStatePath(cwd: string, sessionId: string): string {
  return join(resolveActiveWorkflowStatesRoot(cwd), `${safeSessionFileName(sessionId)}.json`);
}

function safeSessionFileName(sessionId: string): string {
  return sessionId.replace(/[^A-Za-z0-9._-]/g, "_");
}
