import { join } from "node:path";

export type WorkflowPaths = {
  workdir: string;
};

export function resolveWorkflowPaths(
  cwd: string,
  workflowId: string,
  workflowName: string,
): WorkflowPaths {
  return {
    workdir: join(cwd, ".pi", "workflows", workflowId, workflowName),
  };
}
