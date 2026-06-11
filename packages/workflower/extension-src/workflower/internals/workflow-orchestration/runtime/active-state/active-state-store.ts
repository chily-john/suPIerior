import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ActiveWorkflowState } from "./active-state.types";

export async function readActiveWorkflowState(path: string): Promise<ActiveWorkflowState> {
  return JSON.parse(await readFile(path, "utf8")) as ActiveWorkflowState;
}

export async function writeActiveWorkflowState(
  path: string,
  state: ActiveWorkflowState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function deleteActiveWorkflowState(path: string): Promise<void> {
  await unlink(path);
}
