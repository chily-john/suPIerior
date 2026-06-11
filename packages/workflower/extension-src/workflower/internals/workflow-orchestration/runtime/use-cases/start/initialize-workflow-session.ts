import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { writeActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { resolveWorkflowPaths } from "@orchestration/runtime/artifacts/artifact-paths";
import type { WorkflowCommandContext } from "./start.types";

export async function initializeWorkflowInSession(
  workflow: WorkflowDefinition,
  workflowName: string,
  ctx: WorkflowCommandContext,
  initialContextBoundaryEntryId?: string,
): Promise<ActiveWorkflowState | undefined> {
  const sessionId = ctx.sessionManager.getSessionId();
  const activeStatePath = resolveActiveStatePath(ctx.cwd, sessionId);
  const paths = resolveWorkflowPaths(ctx.cwd, workflow.id, workflowName);

  if (await exists(activeStatePath)) {
    ctx.ui.notify(
      `An active workflow already exists for this Pi session at ${activeStatePath}.`,
      "error",
    );
    return undefined;
  }

  if (await exists(paths.workdir)) {
    ctx.ui.notify(
      `Workflow name already exists for workflow ${workflow.id}: ${workflowName}.`,
      "error",
    );
    return undefined;
  }

  const now = new Date().toISOString();
  const state: ActiveWorkflowState = {
    sessionId,
    sessionFile: ctx.sessionManager.getSessionFile(),
    id: workflow.id,
    name: workflowName,
    workdir: paths.workdir,
    currentStepIndex: 0,
    contextBoundaryEntryId: initialContextBoundaryEntryId,
    startedAt: now,
    updatedAt: now,
  };

  try {
    await mkdir(paths.workdir, { recursive: true });
    await writeFile(join(paths.workdir, ".keep"), "", "utf8");
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
