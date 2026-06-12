import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import type { WorkflowLifecycleCommandContext } from "./manage-active.types";

export async function listWorkflowStates(ctx: WorkflowLifecycleCommandContext): Promise<void> {
  const currentSessionId = ctx.sessionManager.getSessionId();
  const activeStatePath = resolveActiveStatePath(ctx.cwd, currentSessionId);
  const activeDir = dirname(activeStatePath);
  const states: ActiveWorkflowState[] = [];

  for (const entry of await readdir(activeDir).catch(() => [])) {
    if (!entry.endsWith(".json")) continue;
    const state = await readActiveWorkflowState(join(activeDir, entry)).catch(() => undefined);
    if (state) states.push(state);
  }

  if (states.length === 0) {
    ctx.ui.notify("No active workflows.", "info");
    return;
  }

  ctx.ui.notify(
    states
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map((state) => {
        const status =
          state.sessionId === currentSessionId ? "current session" : "stale/other session";
        const gardenName = state.gardenName ?? state.name;
        const gardenPath = state.gardenPath;
        const activeFlowerPath = state.activeFlowerPath ?? state.workdir;
        return [
          `${state.id} in garden ${gardenName} step ${state.currentStepIndex} - ${status}`,
          ...(gardenPath ? [`Garden path: ${gardenPath}`] : []),
          `Active flower path: ${activeFlowerPath}`,
        ].join("\n");
      })
      .join("\n\n"),
    "info",
  );
}
