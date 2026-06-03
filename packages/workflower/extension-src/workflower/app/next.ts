import { unlink } from "node:fs/promises";
import { resolveWorkflowPaths } from "@domain/paths";
import { findWorkflow } from "@domain/registry";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
  type ActiveWorkflowState,
} from "@domain/state";
import { renderKickoffPrompt } from "@templates/kickoff";
import type { WorkflowCommandContext } from "./start";

export async function advanceWorkflow(ctx: WorkflowCommandContext): Promise<void> {
  const activeStatePath = resolveWorkflowPaths(ctx.cwd, "", "").activeStatePath;

  let state: ActiveWorkflowState;
  try {
    state = await readActiveWorkflowState(activeStatePath);
  } catch {
    ctx.ui.notify("No active workflow.", "info");
    return;
  }

  const workflow = findWorkflow(state.workflowId);
  if (!workflow) {
    ctx.ui.notify(`Active workflow definition not found: ${state.workflowId}.`, "error");
    return;
  }

  const nextStepIndex = state.currentStepIndex + 1;
  const nextStep = workflow.steps[nextStepIndex];
  if (!nextStep) {
    await unlink(activeStatePath).catch(() => undefined);
    ctx.ui.notify(`Workflow ${state.workflowId} complete.`, "info");
    return;
  }

  const previousStep = workflow.steps[state.currentStepIndex];
  const nextState: ActiveWorkflowState = {
    ...state,
    currentStepIndex: nextStepIndex,
    updatedAt: new Date().toISOString(),
  };
  const kickoffPrompt = renderKickoffPrompt({
    workflowId: workflow.id,
    type: state.type,
    name: state.name,
    workdir: state.workdir,
    currentStepIndex: nextStepIndex,
    step: nextStep,
    previousStep,
  });

  try {
    await writeActiveWorkflowState(activeStatePath, nextState);
  } catch (error) {
    ctx.ui.notify(`Failed to update active workflow state: ${formatError(error)}`, "error");
    return;
  }

  try {
    const result = await ctx.newSession({
      withSession: async (replacementCtx) => {
        await replacementCtx.sendUserMessage(kickoffPrompt);
      },
    });
    if (result.cancelled) {
      ctx.ui.notify(
        "Session creation was cancelled after workflow state advanced. Run /next only after completing the prompted step, or inspect active state before retrying.",
        "error",
      );
      return;
    }
  } catch (error) {
    ctx.ui.notify(
      `Session creation failed: ${formatError(error)}. Workflow state remains advanced to step ${nextStepIndex}.`,
      "error",
    );
    return;
  }

  ctx.ui.notify(`Advanced workflow ${workflow.id} to step ${nextStepIndex}.`, "info");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
