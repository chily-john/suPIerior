import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
} from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { updateFlowerPollen } from "@orchestration/runtime/artifacts/flower-index-store";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { handoffWorkflowInSession } from "../start/handoff-workflow-session";
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

  const previousStep = workflow.steps[state.currentStepIndex];
  try {
    await updateFlowerPollen({
      flowerPath: state.activeFlowerPath ?? state.workdir,
      workflow,
      completedStep: previousStep,
    });
  } catch (error) {
    ctx.ui.notify(`Failed to update flower pollen: ${formatError(error)}`, "error");
    return;
  }

  const nextStepIndex = state.currentStepIndex + 1;
  const nextStep = workflow.steps[nextStepIndex];
  if (!nextStep) {
    if (state.queuedWorkflowIds?.length) {
      await handoffQueuedWorkflowInSession(ctx, state, options);
      return;
    }

    await completeWorkflow(ctx, state, workflow, activeStatePath, options);
    return;
  }

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
      { cwd: ctx.cwd },
    );
    if (sent) ctx.ui.notify(`Advanced workflow ${workflow.id} to step ${nextStepIndex}.`, "info");
  } catch {
    return;
  }
}

async function handoffQueuedWorkflowInSession(
  ctx: WorkflowAdvanceContext,
  state: ActiveWorkflowState,
  options: AdvanceWorkflowOptions,
): Promise<void> {
  const [queuedWorkflowId, ...remainingQueuedWorkflowIds] = state.queuedWorkflowIds ?? [];
  if (!queuedWorkflowId) return;

  const workflow = findWorkflow(queuedWorkflowId);
  if (!workflow) {
    ctx.ui.notify(`Queued workflow definition not found: ${queuedWorkflowId}.`, "error");
    return;
  }

  const handoff = await handoffWorkflowInSession(
    workflow,
    {
      ...state,
      queuedWorkflowIds: remainingQueuedWorkflowIds,
    },
    ctx,
  );
  if (!handoff || !options.currentSession) return;

  try {
    const sent = await startWorkflowStep(workflow, handoff.state, 0, options.currentSession, {
      cwd: ctx.cwd,
      incomingPollen: handoff.incomingPollen,
      promptDisplayKind: "workflow",
    });
    if (sent) {
      ctx.ui.notify(
        `Started workflow ${workflow.id} as next flower in ${handoff.state.gardenName ?? handoff.state.name}.`,
        "info",
      );
    }
  } catch {
    return;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
