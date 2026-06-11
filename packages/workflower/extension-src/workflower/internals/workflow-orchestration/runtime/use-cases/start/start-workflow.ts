import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { isSafeWorkflowName } from "@orchestration/runtime/artifacts/workflow-name-validation";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
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
  const parsed = parseWorkflowStartArgs(workflowId, args);
  if (!parsed.ok) {
    ctx.ui.notify(parsed.message, "error");
    return;
  }

  const workflow = findWorkflow(workflowId);
  if (!workflow) {
    ctx.ui.notify(`Unknown workflow id: ${workflowId}`, "error");
    return;
  }

  if (!isSafeWorkflowName(parsed.workflowName)) {
    ctx.ui.notify("Invalid workflow-name: workflow-name must be a safe path segment.", "error");
    return;
  }

  const startBoundaryEntryId =
    workflow.clearOnStart === false ? undefined : (ctx.sessionManager.getLeafId?.() ?? undefined);
  const state = await initializeWorkflowInSession(
    workflow,
    parsed.workflowName,
    ctx,
    startBoundaryEntryId,
  );
  if (!state) return;

  const sent = await startWorkflowStep(workflow, state, 0, currentSession).catch(() => false);
  if (sent) ctx.ui.notify(`Started workflow ${workflow.id} as ${parsed.workflowName}.`, "info");
}
