import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import {
  deleteActiveWorkflowState,
  readActiveWorkflowState,
} from "@orchestration/runtime/active-state/active-state-store";
import { persistResumeMetadataForActiveState } from "@orchestration/runtime/resume/resume-state-store";
import { clearWorkflowStatus } from "@orchestration/runtime/use-cases/workflow-status";
import type { WorkflowLifecycleCommandContext } from "./manage-active.types";

export async function stopWorkflow(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());
  const state = await readActiveStateIfPresent(activeStatePath);
  if (!state) {
    ctx.ui.notify("No active workflow to stop.", "info");
    return;
  }

  const gardenName = state.gardenName ?? state.name;
  const pausedAt = nextTimestampAfter(state.updatedAt);

  try {
    await persistResumeMetadataForActiveState(
      { ...state, updatedAt: pausedAt },
      { status: "paused", updatedAt: pausedAt },
    );
  } catch (error) {
    ctx.ui.notify(`Failed to pause resume metadata: ${formatError(error)}`, "error");
    return;
  }

  await deleteActiveWorkflowState(activeStatePath);
  
  // Clear footer status when workflow is stopped
  clearWorkflowStatus(ctx.ui);
  
  ctx.ui.notify(
    `Stopped workflow ${state.id} in garden ${gardenName}. Garden and flower artifacts were not deleted.`,
    "info",
  );
}

async function readActiveStateIfPresent(path: string) {
  try {
    return await readActiveWorkflowState(path);
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function nextTimestampAfter(previousTimestamp: string): string {
  const now = new Date();
  const previous = new Date(previousTimestamp);
  if (!Number.isNaN(previous.getTime()) && now <= previous) {
    return new Date(previous.getTime() + 1).toISOString();
  }
  return now.toISOString();
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
