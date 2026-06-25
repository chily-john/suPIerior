import { join } from "node:path";

export function resolveGardenStatePath(gardenPath: string): string {
  return join(gardenPath, "state.json");
}
