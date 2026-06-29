import { readdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import {
  markFlowerCompleted,
  readFlowerIndex,
} from "@orchestration/runtime/artifacts/flower-index-store";
import {
  removeEmptyWorkflowGarden,
  removeGardenResumeFile,
  removeGardenStateFile,
  removeWorkflowWorkdir,
} from "@orchestration/runtime/artifacts/remove-artifacts";
import { persistResumeMetadataForActiveState } from "@orchestration/runtime/resume/resume-state-store";
import type { AdvanceWorkflowOptions, WorkflowAdvanceContext } from "./advance.types";

export async function completeWorkflow(
  ctx: WorkflowAdvanceContext,
  state: ActiveWorkflowState,
  workflow: { id: string; cleanupOnCompletion?: boolean; clearOnCompletion?: boolean },
  activeStatePath: string,
  options: AdvanceWorkflowOptions,
): Promise<void> {
  await unlink(activeStatePath).catch(() => undefined);
  try {
    await completeActiveFlower(state);
    await cleanupCompletedGarden(ctx, state, workflow);
  } catch (error) {
    ctx.ui.notify(`Failed to clean up completed workflow files: ${formatError(error)}`, "error");
    return;
  }

  await options.currentSession?.restoreRuntimeDefaults?.(state.runtimeDefaults);

  if (workflow.clearOnCompletion === false) {
    ctx.ui.notify(`Workflow ${state.id} complete.`, "info");
    return;
  }

  if (options.allowSessionReplacementOnCompletion && ctx.newSession) {
    let result: { cancelled?: boolean };
    try {
      result = await ctx.newSession({
        withSession: async (replacementCtx) => {
          replacementCtx.ui.notify(`Workflow ${state.id} complete.`, "info");
        },
      });
    } catch (error) {
      ctx.ui.notify(`Failed to clear completed workflow session: ${formatError(error)}`, "error");
      return;
    }

    if (result.cancelled) {
      ctx.ui.notify("Session creation was cancelled after workflow completion.", "error");
    }
    return;
  }

  ctx.ui.notify(
    `Workflow ${state.id} complete. Completion ran from auto-next, so session context was not cleared automatically.`,
    "info",
  );
}

async function completeActiveFlower(state: ActiveWorkflowState): Promise<void> {
  await markFlowerCompleted(state.activeFlowerPath ?? state.workdir);
}

async function cleanupCompletedGarden(
  ctx: WorkflowAdvanceContext,
  state: ActiveWorkflowState,
  activeWorkflow: { cleanupOnCompletion?: boolean },
): Promise<void> {
  const gardenPath = state.gardenPath ?? dirname(state.workdir);
  const flowerEntries = await readdir(gardenPath, { withFileTypes: true }).catch(() => []);
  let indexedFlowerCount = 0;

  for (const flowerEntry of flowerEntries) {
    if (!flowerEntry.isDirectory()) continue;

    const flowerPath = join(gardenPath, flowerEntry.name);
    const index = await readFlowerIndex(flowerPath);
    if (!index) continue;

    indexedFlowerCount += 1;

    const flowerWorkflow = findWorkflow(index.workflowId);
    if (!flowerWorkflow) {
      throw new Error(`Completed flower workflow definition not found: ${index.workflowId}`);
    }

    if (flowerWorkflow.cleanupOnCompletion !== false) {
      await removeWorkflowWorkdir(ctx.cwd, flowerPath);
    }
  }

  if (indexedFlowerCount === 0 && activeWorkflow.cleanupOnCompletion !== false) {
    await removeWorkflowWorkdir(ctx.cwd, state.workdir);
  }

  if (activeWorkflow.cleanupOnCompletion !== false) {
    await removeGardenStateFile(ctx.cwd, gardenPath);
    await removeGardenResumeFile(ctx.cwd, gardenPath);
  } else {
    const completedAt = new Date().toISOString();
    await persistResumeMetadataForActiveState(
      { ...state, updatedAt: completedAt },
      { status: "completed", updatedAt: completedAt, completedAt },
    );
  }
  await removeEmptyWorkflowGarden(ctx.cwd, gardenPath);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
