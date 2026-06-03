import { join } from "node:path";
import { findWorkflow } from "@domain/registry";
import { deleteActiveWorkflowState, readActiveWorkflowState } from "@domain/state";

export type WorkflowLifecycleCommandContext = {
  cwd: string;
  ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
};

export async function showWorkflowStatus(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd);
  const state = await readActiveStateIfPresent(activeStatePath);
  if (!state) {
    ctx.ui.notify("No active workflow.", "info");
    return;
  }

  const workflow = findWorkflow(state.workflowId);
  if (!workflow) {
    ctx.ui.notify(
      `Active workflow references unknown workflow id: ${state.workflowId}. Workdir: ${state.workdir}`,
      "warning",
    );
    return;
  }

  const step = workflow.steps[state.currentStepIndex];
  const currentStep = step
    ? `Current step ${state.currentStepIndex}: ${step.id}\nCommand: ${step.command}`
    : `Current step ${state.currentStepIndex}: unknown step index`;

  ctx.ui.notify(
    [
      `Active workflow: ${state.workflowId}`,
      `Type: ${state.type}`,
      `Name: ${state.name}`,
      `Workdir: ${state.workdir}`,
      currentStep,
    ].join("\n"),
    "info",
  );
}

export async function cancelWorkflow(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd);
  const state = await readActiveStateIfPresent(activeStatePath);
  if (!state) {
    ctx.ui.notify("No active workflow to cancel.", "info");
    return;
  }

  await deleteActiveWorkflowState(activeStatePath);
  ctx.ui.notify(
    `Cancelled workflow ${state.workflowId} (${state.name}). Workflow artifacts were not deleted.`,
    "info",
  );
}

function resolveActiveStatePath(cwd: string): string {
  return join(cwd, ".pi", "tmp", "workflows", "active.json");
}

async function readActiveStateIfPresent(path: string) {
  try {
    return await readActiveWorkflowState(path);
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
