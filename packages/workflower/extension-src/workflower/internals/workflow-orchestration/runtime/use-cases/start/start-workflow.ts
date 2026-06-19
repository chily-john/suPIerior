import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { isSafeWorkflowName as isSafeGardenName } from "@orchestration/runtime/artifacts/workflow-name-validation";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { handoffWorkflowInSession } from "./handoff-workflow-session";
import { initializeWorkflowInSession } from "./initialize-workflow-session";
import { parseWorkflowStartArgs, workflowStartUsage } from "./parse-start-args";
import type { CurrentSessionPromptSender, WorkflowCommandContext } from "./start.types";

export { workflowStartUsage };

export async function startWorkflow(
  workflowId: string,
  args: string,
  ctx: WorkflowCommandContext,
  currentSession: CurrentSessionPromptSender,
): Promise<void> {
  const activeState = await readActiveStateIfPresent(ctx);
  const mode = activeState ? "handoff" : "initial";
  const parsed = parseWorkflowStartArgs(workflowId, args, mode);
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
    const result = await handoffWorkflowInSession(workflow, activeState, ctx);
    if (!result) return;

    const sent = await startWorkflowStep(workflow, result.state, 0, currentSession, {
      incomingPollen: result.incomingPollen,
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

  const startBoundaryEntryId =
    workflow.clearOnStart === false ? undefined : (ctx.sessionManager.getLeafId?.() ?? undefined);
  const runtimeDefaults = currentSession.captureRuntimeDefaults?.();
  const state = await initializeWorkflowInSession(
    workflow,
    parsed.workflowName,
    ctx,
    startBoundaryEntryId,
    runtimeDefaults,
  );
  if (!state) return;

  const sent = await startWorkflowStep(workflow, state, 0, currentSession).catch(() => false);
  if (sent) ctx.ui.notify(`Started workflow ${workflow.id} as ${parsed.workflowName}.`, "info");
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
