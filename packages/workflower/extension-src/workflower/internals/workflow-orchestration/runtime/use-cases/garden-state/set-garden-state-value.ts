import type { GardenStateSetResult, JsonValue } from "@package-api/garden-state.types";
import { setGardenStateValue as writeGardenStateValue } from "@orchestration/runtime/garden-state/garden-state-store";
import type { WorkflowCommandContext } from "../start/start.types";
import { resolveActiveGarden } from "./resolve-active-garden";

export async function setGardenStateValue(
  ctx: WorkflowCommandContext,
  key: string,
  value: JsonValue,
): Promise<GardenStateSetResult> {
  const activeGarden = await resolveActiveGarden(ctx);
  if (!activeGarden.ok) return activeGarden;

  try {
    const entry = await writeGardenStateValue(
      activeGarden.gardenPath,
      key,
      value,
      activeGarden.producer,
    );
    return {
      ok: true,
      key,
      entry,
      message: `Saved garden state ${key} for ${activeGarden.gardenName}.`,
    };
  } catch (error) {
    return { ok: false, message: formatError(error) };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
