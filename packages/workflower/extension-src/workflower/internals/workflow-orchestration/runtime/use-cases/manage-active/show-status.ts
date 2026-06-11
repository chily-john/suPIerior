import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { WorkflowLifecycleCommandContext } from "./manage-active.types";

export async function showWorkflowStatus(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());
  const state = await readActiveStateIfPresent(activeStatePath);
  if (!state) {
    ctx.ui.notify("No active workflow.", "info");
    return;
  }

  const workflow = findWorkflow(state.id);
  if (!workflow) {
    ctx.ui.notify(
      `Active workflow references unknown workflow id: ${state.id}. Workdir: ${state.workdir}`,
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
      `Active workflow: ${state.id}`,
      `Name: ${state.name}`,
      `Workdir: ${state.workdir}`,
      currentStep,
    ].join("\n"),
    "info",
  );
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
