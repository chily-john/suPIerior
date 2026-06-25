import type { ParsedStartArgs } from "./start.types";

type ParsedPipelineArgs =
  | { ok: true; commandArgs: string; queuedWorkflowIds: string[] }
  | { ok: false; message: string };

export function workflowStartUsage(workflowId: string): string {
  return `Usage: /wf:${workflowId} <garden-name>`;
}

export function workflowHandoffUsage(workflowId: string): string {
  return `Usage: /wf:${workflowId} (no garden-name while a workflow is active)`;
}

export function parseWorkflowPipelineArgs(args: string): ParsedPipelineArgs {
  const segments = args.split("|");
  if (segments.length === 1) return { ok: true, commandArgs: args, queuedWorkflowIds: [] };

  const queuedWorkflowIds: string[] = [];
  for (const segment of segments.slice(1)) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean);
    if (tokens.length !== 1) {
      return {
        ok: false,
        message: "Usage: pipeline syntax requires exactly one workflow id after each |.",
      };
    }
    queuedWorkflowIds.push(tokens[0]);
  }

  return { ok: true, commandArgs: segments[0] ?? "", queuedWorkflowIds };
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
