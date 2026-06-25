import { access, mkdir } from "node:fs/promises";
import type {
  WorkflowDefinition,
  WorkflowRuntimeDefaults,
} from "@package-api/workflow-definition.types";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { writeActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { resolveWorkflowPaths } from "@orchestration/runtime/artifacts/artifact-paths";
import { writeInitialFlowerIndex } from "@orchestration/runtime/artifacts/flower-index-store";
import { ensureWorkflowerHome } from "@orchestration/runtime/workflower-home";
import type { WorkflowCommandContext } from "./start.types";

export async function initializeWorkflowInSession(
  workflow: WorkflowDefinition,
  gardenName: string,
  ctx: WorkflowCommandContext,
  initialContextBoundaryEntryId?: string,
  runtimeDefaults?: WorkflowRuntimeDefaults,
  queuedWorkflowIds: string[] = [],
): Promise<ActiveWorkflowState | undefined> {
  const sessionId = ctx.sessionManager.getSessionId();
  const activeStatePath = resolveActiveStatePath(ctx.cwd, sessionId);
  const paths = resolveWorkflowPaths(ctx.cwd, workflow.id, gardenName);

  if (await exists(activeStatePath)) {
    ctx.ui.notify(
      `An active workflow already exists for this Pi session at ${activeStatePath}.`,
      "error",
    );
    return undefined;
  }

  if (await exists(paths.flowerPath)) {
    ctx.ui.notify(
      `Garden already has an initial flower for workflow ${workflow.id}: ${gardenName}.`,
      "error",
    );
    return undefined;
  }

  const now = new Date().toISOString();
  const state: ActiveWorkflowState = {
    sessionId,
    sessionFile: ctx.sessionManager.getSessionFile(),
    id: workflow.id,
    name: gardenName,
    gardenName,
    gardenPath: paths.gardenPath,
    activeFlowerName: paths.flowerName,
    activeFlowerPath: paths.flowerPath,
    workdir: paths.flowerPath,
    currentStepIndex: 0,
    ...(queuedWorkflowIds.length > 0 ? { queuedWorkflowIds } : {}),
    contextBoundaryEntryId: initialContextBoundaryEntryId,
    runtimeDefaults,
    startedAt: now,
    updatedAt: now,
  };

  try {
    await ensureWorkflowerHome(ctx.cwd);
    await mkdir(paths.flowerPath, { recursive: true });
    await writeInitialFlowerIndex({ flowerPath: paths.flowerPath, workflowId: workflow.id });
    await writeActiveWorkflowState(activeStatePath, state);
    return state;
  } catch (error) {
    ctx.ui.notify(`Failed to prepare workflow files: ${formatError(error)}`, "error");
    return undefined;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
