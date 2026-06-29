import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
} from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { advanceWorkflowFromAutoNext } from "../advance/advance-workflow";
import { startWorkflowStep } from "../start-step/start-workflow-step";
import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";

type AutoNextContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getLeafId(): string | null | undefined;
  };
};

type AutoNextAgentEndEvent = {
  messages?: unknown[];
};

type AutoNextAssistantMessage = {
  role?: unknown;
  stopReason?: unknown;
  errorMessage?: unknown;
};

type AutoNextRunOutcome =
  | { kind: "clean" }
  | { kind: "error"; message: string }
  | { kind: "aborted"; message: string }
  | { kind: "unknown"; message: string };

export const AUTO_NEXT_MAX_TOTAL_ATTEMPTS = 3;

type AdvanceOnAutoNextOptions = {
  agentEndEvent?: AutoNextAgentEndEvent;
  shouldSuppressAutoNext?(state: ActiveWorkflowState): boolean;
};

export async function advanceOnAutoNext(
  ctx: AutoNextContext,
  currentSession: CurrentSessionPromptSender,
  options: AdvanceOnAutoNextOptions = {},
): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  let state: ActiveWorkflowState;
  try {
    state = await readActiveWorkflowState(activeStatePath);
  } catch {
    return;
  }

  if (options.shouldSuppressAutoNext?.(state)) return;

  const workflow = findWorkflow(state.id);
  const currentStep = workflow?.steps[state.currentStepIndex];
  if (!workflow) return;

  const stepAutoNext = currentStep?.autoNext;
  const workflowAutoNext = workflow.autoNext;
  const shouldAutoNext = stepAutoNext ?? workflowAutoNext ?? false;

  if (!shouldAutoNext) return;

  const outcome = classifyAutoNextRunOutcome(options.agentEndEvent);
  if (outcome.kind === "clean") {
    await advanceWorkflowFromAutoNext(ctx, currentSession);
    return;
  }
  if (outcome.kind === "aborted") return;

  await retryAutoNextStep(ctx, currentSession, activeStatePath, state, workflow, outcome);
}

async function retryAutoNextStep(
  ctx: AutoNextContext,
  currentSession: CurrentSessionPromptSender,
  activeStatePath: string,
  state: ActiveWorkflowState,
  workflow: WorkflowDefinition,
  outcome: Extract<AutoNextRunOutcome, { kind: "error" | "unknown" }>,
): Promise<void> {
  const previousAttempts =
    state.autoNextFailure?.stepIndex === state.currentStepIndex
      ? state.autoNextFailure.attempts
      : 0;
  const attempts = previousAttempts + 1;
  const updatedAt = new Date().toISOString();
  const retryState: ActiveWorkflowState = {
    ...state,
    currentStepIndex: state.currentStepIndex,
    autoNextFailure: {
      stepIndex: state.currentStepIndex,
      attempts,
      lastErrorMessage: outcome.message,
      exhausted: attempts >= AUTO_NEXT_MAX_TOTAL_ATTEMPTS,
      updatedAt,
    },
    updatedAt,
  };

  try {
    await writeActiveWorkflowState(activeStatePath, retryState);
  } catch (error) {
    ctx.ui.notify(`Failed to update auto-next retry state: ${formatError(error)}`, "error");
    return;
  }

  if (attempts >= AUTO_NEXT_MAX_TOTAL_ATTEMPTS) {
    ctx.ui.notify(
      formatAutoNextFailureMessage(workflow, state.currentStepIndex, attempts, outcome),
      "error",
    );
    return;
  }

  try {
    await startWorkflowStep(workflow, retryState, state.currentStepIndex, currentSession, {
      cwd: ctx.cwd,
      promptDisplayKind: "step",
      retryNotice: renderAutoNextRetryNotice(outcome),
      ui: ctx.ui,
    });
  } catch (error) {
    ctx.ui.notify(`Failed to send auto-next retry prompt: ${formatError(error)}`, "error");
  }
}

function formatAutoNextFailureMessage(
  workflow: WorkflowDefinition,
  stepIndex: number,
  attempts: number,
  outcome: Extract<AutoNextRunOutcome, { kind: "error" | "unknown" }>,
): string {
  const step = workflow.steps[stepIndex];
  const outcomeDescription = outcome.kind === "error" ? "execution-error" : "unknown-outcome";
  const stepDescription = step?.id ? `step ${stepIndex} (${step.id})` : `step ${stepIndex}`;

  return `Workflow ${workflow.id} auto-next failed after ${attempts} ${outcomeDescription} attempts at ${stepDescription}; it remains on step ${stepIndex}. Last error: ${outcome.message}`;
}

function renderAutoNextRetryNotice(
  outcome: Extract<AutoNextRunOutcome, { kind: "error" | "unknown" }>,
): string {
  if (outcome.kind === "unknown") {
    return `Retrying this same step because the previous auto-next attempt ended without a confirmed clean result: ${outcome.message}`;
  }

  return `Retrying this same step because the previous auto-next attempt ended with an execution error: ${outcome.message}`;
}

function classifyAutoNextRunOutcome(event: AutoNextAgentEndEvent | undefined): AutoNextRunOutcome {
  const lastAssistantMessage = findLastAssistantMessage(event?.messages ?? []);
  if (!lastAssistantMessage) {
    return {
      kind: "unknown",
      message: "No assistant message was included in the agent_end event.",
    };
  }

  if (lastAssistantMessage.stopReason === "error") {
    const message =
      typeof lastAssistantMessage.errorMessage === "string" && lastAssistantMessage.errorMessage
        ? lastAssistantMessage.errorMessage
        : "Agent run ended with an execution error.";
    return { kind: "error", message };
  }

  if (lastAssistantMessage.stopReason === "aborted") {
    const message =
      typeof lastAssistantMessage.errorMessage === "string" && lastAssistantMessage.errorMessage
        ? lastAssistantMessage.errorMessage
        : "Agent run was aborted.";
    return { kind: "aborted", message };
  }

  return { kind: "clean" };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function findLastAssistantMessage(messages: unknown[]): AutoNextAssistantMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (isAssistantMessage(message)) return message;
  }

  return undefined;
}

function isAssistantMessage(message: unknown): message is AutoNextAssistantMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "role" in message &&
    (message as AutoNextAssistantMessage).role === "assistant"
  );
}
