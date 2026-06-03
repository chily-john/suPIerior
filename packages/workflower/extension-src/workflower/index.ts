import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerWorkflowCommand } from "@pi/register";

export default function workflower(pi: ExtensionAPI): void {
  registerWorkflowCommand(pi);
}

export { advanceWorkflow } from "@app/next";
export { startWorkflow } from "@app/start";
export { defineWorkflow } from "@domain/workflow";
export type { WorkflowDefinition, WorkflowStep } from "@domain/workflow";
export { findWorkflow, listWorkflows } from "@domain/registry";
export { resolveWorkflowPaths } from "@domain/paths";
export { readActiveWorkflowState, writeActiveWorkflowState } from "@domain/state";
export type { ActiveWorkflowState } from "@domain/state";
export { renderKickoffPrompt } from "@templates/kickoff";
