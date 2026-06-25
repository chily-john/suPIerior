import type { GardenStateListResult } from "@package-api/garden-state.types";
import { listGardenStateValues as readGardenStateValues } from "@orchestration/runtime/garden-state/garden-state-store";
import type { WorkflowCommandContext } from "../start/start.types";
import { resolveActiveGarden } from "./resolve-active-garden";

export async function listGardenStateValues(
  ctx: WorkflowCommandContext,
): Promise<GardenStateListResult> {
  const activeGarden = await resolveActiveGarden(ctx);
  if (!activeGarden.ok) return activeGarden;

  try {
    const values = await readGardenStateValues(activeGarden.gardenPath);
    return { ok: true, values, keys: Object.keys(values).sort() };
  } catch (error) {
    return { ok: false, message: formatError(error) };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
