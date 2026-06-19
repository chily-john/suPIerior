import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";

export type HandoffAutoNextSuppression = {
  workflowId: string;
  flowerPath: string;
  stepIndex: number;
};

const handoffSessions = new Map<string, HandoffAutoNextSuppression>();

export function markHandoffDuringTurn(
  cwd: string,
  sessionId: string,
  suppression: HandoffAutoNextSuppression,
): void {
  handoffSessions.set(key(cwd, sessionId), suppression);
}

export function hasHandoffDuringTurn(cwd: string, sessionId: string): boolean {
  return handoffSessions.has(key(cwd, sessionId));
}

export function consumeHandoffAutoNextSuppressionForState(
  cwd: string,
  sessionId: string,
  state: ActiveWorkflowState,
): boolean {
  const sessionKey = key(cwd, sessionId);
  const suppression = handoffSessions.get(sessionKey);
  handoffSessions.delete(sessionKey);

  if (!suppression) return false;

  return (
    suppression.workflowId === state.id &&
    suppression.flowerPath === (state.activeFlowerPath ?? state.workdir) &&
    suppression.stepIndex === state.currentStepIndex
  );
}

function key(cwd: string, sessionId: string): string {
  return `${cwd}\0${sessionId}`;
}
