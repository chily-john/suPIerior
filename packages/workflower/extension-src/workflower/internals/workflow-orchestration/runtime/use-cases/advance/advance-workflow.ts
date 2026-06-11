import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
} from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import type { CurrentSessionPromptSender } from "../workflow-runtime.types";
import type { AdvanceWorkflowOptions, WorkflowAdvanceContext } from "./advance.types";
import { completeWorkflow } from "./complete-workflow";

export async function advanceWorkflow(
  ctx: WorkflowAdvanceContext & { newSession: NonNullable<WorkflowAdvanceContext["newSession"]> },
  currentSession?: CurrentSessionPromptSender,
): Promise<void> {
  await advanceWorkflowInternal(ctx, {
    currentSession,
    allowSessionReplacementOnCompletion: true,
  });
}

export async function advanceWorkflowFromAutoNext(
  ctx: WorkflowAdvanceContext,
  currentSession: CurrentSessionPromptSender,
): Promise<void> {
  await advanceWorkflowInternal(ctx, {
    currentSession,
    allowSessionReplacementOnCompletion: false,
  });
}

async function advanceWorkflowInternal(
  ctx: WorkflowAdvanceContext,
  options: AdvanceWorkflowOptions,
): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  let state: ActiveWorkflowState;
  try {
    state = await readActiveWorkflowState(activeStatePath);
  } catch {
    ctx.ui.notify("No active workflow.", "info");
    return;
  }

  const workflow = findWorkflow(state.id);
  if (!workflow) {
    ctx.ui.notify(`Active workflow definition not found: ${state.id}.`, "error");
    return;
  }

  const nextStepIndex = state.currentStepIndex + 1;
  const nextStep = workflow.steps[nextStepIndex];
  if (!nextStep) {
    await completeWorkflow(ctx, state, workflow, activeStatePath, options);
    return;
  }

  const previousStep = workflow.steps[state.currentStepIndex];
  const nextState: ActiveWorkflowState = {
    ...state,
    currentStepIndex: nextStepIndex,
    updatedAt: new Date().toISOString(),
  };

  if (previousStep?.clearOnNext !== false && ctx.sessionManager) {
    nextState.contextBoundaryEntryId = ctx.sessionManager.getLeafId();
  }

  try {
    await writeActiveWorkflowState(activeStatePath, nextState);
  } catch (error) {
    ctx.ui.notify(`Failed to update active workflow state: ${formatError(error)}`, "error");
    return;
  }

  if (!options.currentSession) return;

  try {
    const sent = await startWorkflowStep(
      workflow,
      nextState,
      nextStepIndex,
      options.currentSession,
    );
    if (sent) ctx.ui.notify(`Advanced workflow ${workflow.id} to step ${nextStepIndex}.`, "info");
  } catch {
    return;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
