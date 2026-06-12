import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import {
  deleteActiveWorkflowState,
  readActiveWorkflowState,
} from "@orchestration/runtime/active-state/active-state-store";
import type { WorkflowLifecycleCommandContext } from "./manage-active.types";

export async function stopWorkflow(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());
  const state = await readActiveStateIfPresent(activeStatePath);
  if (!state) {
    ctx.ui.notify("No active workflow to stop.", "info");
    return;
  }

  const gardenName = state.gardenName ?? state.name;

  await deleteActiveWorkflowState(activeStatePath);
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
