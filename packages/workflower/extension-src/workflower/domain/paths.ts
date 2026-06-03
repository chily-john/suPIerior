import { join } from "node:path";

export type WorkflowPaths = {
  workdir: string;
  activeStatePath: string;
};

export function resolveWorkflowPaths(
  cwd: string,
  workflowType: string,
  workflowName: string,
): WorkflowPaths {
  return {
    workdir: join(cwd, ".pi", "workflows", workflowType, workflowName),
    activeStatePath: join(cwd, ".pi", "tmp", "workflows", "active.json"),
  };
}

export function isSafeWorkflowName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);
}
