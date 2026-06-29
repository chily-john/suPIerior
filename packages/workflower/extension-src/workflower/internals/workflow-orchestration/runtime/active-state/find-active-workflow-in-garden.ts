import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { readActiveWorkflowState } from "./active-state-store";
import type { ActiveWorkflowState } from "./active-state.types";
import { resolveActiveWorkflowStatesRoot } from "../workflower-home";

export async function findActiveWorkflowInGarden(
  cwd: string,
  gardenName: string,
  options: { excludeSessionId?: string } = {},
): Promise<ActiveWorkflowState | undefined> {
  const activeDir = resolveActiveWorkflowStatesRoot(cwd);

  for (const entry of await readdir(activeDir).catch(() => [])) {
    if (!entry.endsWith(".json")) continue;

    const state = await readActiveWorkflowState(join(activeDir, entry)).catch(() => undefined);
    if (!state || state.sessionId === options.excludeSessionId) continue;
    if (state.gardenName === gardenName || state.name === gardenName) return state;
  }

  return undefined;
}
