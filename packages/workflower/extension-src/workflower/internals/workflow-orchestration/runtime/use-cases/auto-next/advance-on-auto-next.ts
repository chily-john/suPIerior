import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { advanceWorkflowFromAutoNext } from "../advance/advance-workflow";
import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";

type AutoNextContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getLeafId(): string | null | undefined;
  };
};

export async function advanceOnAutoNext(
  ctx: AutoNextContext,
  currentSession: CurrentSessionPromptSender,
): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  let state: ActiveWorkflowState;
  try {
    state = await readActiveWorkflowState(activeStatePath);
  } catch {
    return;
  }

  const currentStep = findWorkflow(state.id)?.steps[state.currentStepIndex];
  if (currentStep?.autoNext !== true) return;

  await advanceWorkflowFromAutoNext(ctx, currentSession);
}
