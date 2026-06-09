import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";

export type WorkflowContextEntry = {
  id: string;
};

export type WorkflowContextSessionManager<TEntry extends WorkflowContextEntry> = {
  getSessionId(): string;
  getBranch(): TEntry[];
};

export type BuildScopedWorkflowContextInput<TEntry extends WorkflowContextEntry, TMessage> = {
  cwd: string;
  sessionManager: WorkflowContextSessionManager<TEntry>;
  buildMessages(entries: TEntry[]): TMessage[];
};

export type ScopedWorkflowContext<TMessage> = {
  messages: TMessage[];
};

export async function buildScopedWorkflowContext<TEntry extends WorkflowContextEntry, TMessage>(
  input: BuildScopedWorkflowContextInput<TEntry, TMessage>,
): Promise<ScopedWorkflowContext<TMessage> | undefined> {
  const activeStatePath = resolveActiveStatePath(
    input.cwd,
    input.sessionManager.getSessionId(),
  );
  const state = await readActiveWorkflowState(activeStatePath).catch(() => undefined);
  const boundaryId = state?.contextBoundaryEntryId;
  if (!boundaryId) return undefined;

  const branch = input.sessionManager.getBranch();
  const boundaryIndex = branch.findIndex((entry) => entry.id === boundaryId);
  if (boundaryIndex < 0) return undefined;

  return { messages: input.buildMessages(branch.slice(boundaryIndex + 1)) };
}
