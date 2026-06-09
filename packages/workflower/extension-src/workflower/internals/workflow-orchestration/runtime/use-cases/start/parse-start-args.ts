import type { ParsedStartArgs } from "./start.types";

export function workflowStartUsage(workflowId: string): string {
  return `Usage: /wf:${workflowId} <workflow-name>`;
}

export function parseWorkflowStartArgs(workflowId: string, args: string): ParsedStartArgs {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 1) return { ok: false, message: workflowStartUsage(workflowId) };
  return { ok: true, workflowName: parts[0] };
}
