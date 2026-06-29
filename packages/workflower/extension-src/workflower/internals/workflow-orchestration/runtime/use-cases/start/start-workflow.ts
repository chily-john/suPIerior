import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { validateWorkflowId } from "@orchestration/definitions/validation/workflow-id-validation";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { isSafeWorkflowName as isSafeGardenName } from "@orchestration/runtime/artifacts/workflow-name-validation";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { handoffWorkflowInSession } from "./handoff-workflow-session";
import { initializeWorkflowInSession } from "./initialize-workflow-session";
import {
  parseWorkflowPipelineArgs,
  parseWorkflowStartArgs,
  workflowStartUsage,
} from "./parse-start-args";
import type { CurrentSessionPromptSender, WorkflowCommandContext } from "./start.types";

export { workflowStartUsage };

export async function startWorkflow(
  workflowId: string,
  args: string,
  ctx: WorkflowCommandContext,
  currentSession: CurrentSessionPromptSender,
  pi?: ExtensionAPI,
): Promise<void> {
  const activeState = await readActiveStateIfPresent(ctx);
  const mode = activeState ? "handoff" : "initial";
  const pipeline = parseWorkflowPipelineArgs(args);
  if (!pipeline.ok) {
    ctx.ui.notify(pipeline.message, "error");
    return;
  }

  const parsed = parseWorkflowStartArgs(workflowId, pipeline.commandArgs, mode);
  if (!parsed.ok) {
    ctx.ui.notify(parsed.message, "error");
    return;
  }

  const workflow = findWorkflow(workflowId);
  if (!workflow) {
    ctx.ui.notify(`Unknown workflow id: ${workflowId}`, "error");
    return;
  }

  if (activeState) {
    const queuedWorkflowIds = resolveQueuedWorkflowIds(pipeline.queuedWorkflowIds, ctx);
    if (!queuedWorkflowIds) return;

    const result = await handoffWorkflowInSession(
      workflow,
      activeState,
      ctx,
      queuedWorkflowIds.length ? queuedWorkflowIds : undefined,
    );
    if (!result) return;

    const sent = await startWorkflowStep(workflow, result.state, 0, currentSession, {
      cwd: ctx.cwd,
      incomingPollen: result.incomingPollen,
      promptDisplayKind: "workflow",
      ui: ctx.ui,
    }).catch(() => false);
    if (sent) {
      ctx.ui.notify(
        `Started workflow ${workflow.id} as next flower in ${result.state.gardenName ?? result.state.name}.`,
        "info",
      );
    }
    return;
  }

  if (!parsed.workflowName) {
    ctx.ui.notify(workflowStartUsage(workflowId), "error");
    return;
  }

  if (!isSafeGardenName(parsed.workflowName)) {
    ctx.ui.notify("Invalid garden-name: garden-name must be a safe path segment.", "error");
    return;
  }

  const queuedWorkflowIds = resolveQueuedWorkflowIds(pipeline.queuedWorkflowIds, ctx);
  if (!queuedWorkflowIds) return;

  const startBoundaryEntryId =
    workflow.clearOnStart === false ? undefined : (ctx.sessionManager.getLeafId?.() ?? undefined);
  const runtimeDefaults = currentSession.captureRuntimeDefaults?.();
  const state = await initializeWorkflowInSession(
    workflow,
    parsed.workflowName,
    ctx,
    startBoundaryEntryId,
    runtimeDefaults,
    queuedWorkflowIds,
    pi,
  );
  if (!state) return;

  const sent = await startWorkflowStep(workflow, state, 0, currentSession, {
    cwd: ctx.cwd,
    promptDisplayKind: "workflow",
    ui: ctx.ui,
  }).catch(() => false);
  if (sent) ctx.ui.notify(`Started workflow ${workflow.id} as ${parsed.workflowName}.`, "info");
}

function resolveQueuedWorkflowIds(
  workflowIds: string[],
  ctx: WorkflowCommandContext,
): string[] | undefined {
  for (const queuedWorkflowId of workflowIds) {
    try {
      validateWorkflowId(queuedWorkflowId);
    } catch {
      ctx.ui.notify(`Invalid workflow id in pipeline: ${queuedWorkflowId}`, "error");
      return undefined;
    }

    const queuedWorkflow = findWorkflow(queuedWorkflowId);
    if (!queuedWorkflow) {
      ctx.ui.notify(`Unknown workflow id in pipeline: ${queuedWorkflowId}`, "error");
      return undefined;
    }

    if (queuedWorkflow.userInvocable === false) {
      ctx.ui.notify(`Workflow is not user-invocable in pipeline: ${queuedWorkflowId}`, "error");
      return undefined;
    }
  }
  return workflowIds;
}

async function readActiveStateIfPresent(
  ctx: WorkflowCommandContext,
): Promise<ActiveWorkflowState | undefined> {
  try {
    return await readActiveWorkflowState(
      resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId()),
    );
  } catch {
    return undefined;
  }
}
