import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { writeActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import {
  markFlowerHandedOff,
  writeInitialFlowerIndex,
} from "@orchestration/runtime/artifacts/flower-index-store";
import { ensureWorkflowerHome } from "@orchestration/runtime/workflower-home";
import type { WorkflowNotificationUi } from "../workflow-runtime.types";

export type HandoffWorkflowContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getSessionFile?(): string | undefined;
  };
};

export type WorkflowHandoffResult = {
  state: ActiveWorkflowState;
  incomingPollen: string[];
};

export async function handoffWorkflowInSession(
  workflow: WorkflowDefinition,
  activeState: ActiveWorkflowState,
  ctx: HandoffWorkflowContext,
  queuedWorkflowIds?: string[],
): Promise<WorkflowHandoffResult | undefined> {
  const previousFlowerPath = activeState.activeFlowerPath ?? activeState.workdir;
  const gardenName = activeState.gardenName ?? activeState.name;
  const gardenPath = activeState.gardenPath ?? join(previousFlowerPath, "..");
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  try {
    const incomingPollen = await markFlowerHandedOff(previousFlowerPath);
    const flowerName = await resolveNextFlowerName(gardenPath, workflow.id);
    const flowerPath = join(gardenPath, flowerName);
    const now = new Date().toISOString();
    const nextQueuedWorkflowIds = queuedWorkflowIds ?? activeState.queuedWorkflowIds ?? [];
    const state: ActiveWorkflowState = {
      sessionId: ctx.sessionManager.getSessionId(),
      sessionFile: ctx.sessionManager.getSessionFile?.() ?? activeState.sessionFile,
      id: workflow.id,
      name: gardenName,
      gardenName,
      gardenPath,
      activeFlowerName: flowerName,
      activeFlowerPath: flowerPath,
      workdir: flowerPath,
      currentStepIndex: 0,
      contextBoundaryEntryId: activeState.contextBoundaryEntryId,
      runtimeDefaults: activeState.runtimeDefaults,
      ...(nextQueuedWorkflowIds.length ? { queuedWorkflowIds: nextQueuedWorkflowIds } : {}),
      startedAt: now,
      updatedAt: now,
    };

    await ensureWorkflowerHome(ctx.cwd);
    await mkdir(flowerPath, { recursive: true });
    await writeInitialFlowerIndex({ flowerPath, workflowId: workflow.id });
    await writeActiveWorkflowState(activeStatePath, state);
    return { state, incomingPollen };
  } catch (error) {
    ctx.ui.notify(`Failed to hand off workflow: ${formatError(error)}`, "error");
    return undefined;
  }
}

async function resolveNextFlowerName(gardenPath: string, workflowId: string): Promise<string> {
  const existing = await readdir(gardenPath, { withFileTypes: true }).catch(() => []);
  const nextSequence =
    existing.reduce((max, entry) => {
      if (!entry.isDirectory()) return max;
      const match = /^(\d{4})-/.exec(entry.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `${String(nextSequence).padStart(4, "0")}-${workflowId}`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
