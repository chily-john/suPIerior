import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { handoffWorkflowInSession } from "../start/handoff-workflow-session";
import type { WorkflowCommandContext } from "../start/start.types";
import type { CurrentSessionPromptSender } from "../workflow-runtime.types";

export type WorkflowHandoffSource = {
  workflowId: string;
  flowerPath: string;
  stepIndex: number;
};

export type WorkflowHandoffSuccess = {
  ok: true;
  message: string;
  workflowId: string;
  gardenName: string;
  gardenPath: string;
  activeFlowerName: string;
  activeFlowerPath: string;
  workdir: string;
  incomingPollen: string[];
  source: WorkflowHandoffSource;
};

export type WorkflowHandoffFailure = {
  ok: false;
  message: string;
};

export type WorkflowHandoffUseCaseResult = WorkflowHandoffSuccess | WorkflowHandoffFailure;

export async function handoffWorkflowById(
  workflowId: string,
  ctx: WorkflowCommandContext,
  currentSession: CurrentSessionPromptSender,
): Promise<WorkflowHandoffUseCaseResult> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  let activeState: ActiveWorkflowState;
  try {
    activeState = await readActiveWorkflowState(activeStatePath);
  } catch {
    return failure(
      "No active Workflower workflow. workflower_handoff can only be used inside an active garden.",
    );
  }

  const workflow = findWorkflow(workflowId);
  if (!workflow) return failure(`Unknown workflow id: ${workflowId}`);
  if (workflow.modelInvocable === false) {
    return failure(`Workflow ${workflowId} is not model-invokable.`);
  }

  const source: WorkflowHandoffSource = {
    workflowId: activeState.id,
    flowerPath: activeState.activeFlowerPath ?? activeState.workdir,
    stepIndex: activeState.currentStepIndex,
  };

  const handoff = await handoffWorkflowInSession(workflow, activeState, ctx);
  if (!handoff) return failure(`Failed to hand off to workflow ${workflowId}.`);

  let sent = false;
  try {
    sent = await startWorkflowStep(workflow, handoff.state, 0, currentSession, {
      incomingPollen: handoff.incomingPollen,
      promptDisplayKind: "workflow",
    });
  } catch (error) {
    return failure(`Failed to send workflow kickoff prompt: ${formatError(error)}`);
  }

  if (!sent) return failure(`Failed to start workflow ${workflowId}.`);

  const gardenName = handoff.state.gardenName ?? handoff.state.name;
  return {
    ok: true,
    message: `Handed off active Workflower garden ${gardenName} to workflow ${workflow.id}.`,
    workflowId: workflow.id,
    gardenName,
    gardenPath: handoff.state.gardenPath ?? "",
    activeFlowerName: handoff.state.activeFlowerName ?? "",
    activeFlowerPath: handoff.state.activeFlowerPath ?? handoff.state.workdir,
    workdir: handoff.state.workdir,
    incomingPollen: handoff.incomingPollen,
    source,
  };
}

function failure(message: string): WorkflowHandoffFailure {
  return { ok: false, message };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
