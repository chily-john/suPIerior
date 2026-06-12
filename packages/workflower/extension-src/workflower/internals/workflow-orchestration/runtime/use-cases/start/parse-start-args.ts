import type { ParsedStartArgs } from "./start.types";

export function workflowStartUsage(workflowId: string): string {
  return `Usage: /wf:${workflowId} <garden-name>`;
}

export function workflowHandoffUsage(workflowId: string): string {
  return `Usage: /wf:${workflowId} (no garden-name while a workflow is active)`;
}

export function parseWorkflowStartArgs(
  workflowId: string,
  args: string,
  mode: "initial" | "handoff" = "initial",
): ParsedStartArgs {
  const parts = args.trim().split(/\s+/).filter(Boolean);

  if (mode === "handoff") {
    if (parts.length !== 0) return { ok: false, message: workflowHandoffUsage(workflowId) };
    return { ok: true };
  }

  if (parts.length !== 1) return { ok: false, message: workflowStartUsage(workflowId) };
  return { ok: true, workflowName: parts[0] };
}
