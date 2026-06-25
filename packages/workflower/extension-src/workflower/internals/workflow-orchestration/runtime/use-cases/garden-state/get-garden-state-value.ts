import type { GardenStateGetResult } from "@package-api/garden-state.types";
import { getGardenStateValue as readGardenStateValue } from "@orchestration/runtime/garden-state/garden-state-store";
import type { WorkflowCommandContext } from "../start/start.types";
import { resolveActiveGarden } from "./resolve-active-garden";

export async function getGardenStateValue(
  ctx: WorkflowCommandContext,
  key: string,
): Promise<GardenStateGetResult> {
  const activeGarden = await resolveActiveGarden(ctx);
  if (!activeGarden.ok) return activeGarden;

  try {
    const entry = await readGardenStateValue(activeGarden.gardenPath, key);
    return entry ? { ok: true, key, found: true, entry } : { ok: true, key, found: false };
  } catch (error) {
    return { ok: false, message: formatError(error) };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
