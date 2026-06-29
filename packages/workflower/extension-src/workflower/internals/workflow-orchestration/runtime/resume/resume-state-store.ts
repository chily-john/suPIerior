import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { ensureWorkflowerHomeForPath } from "@orchestration/runtime/workflower-home";
import { resolveGardenResumePath, resolveResumePathInput } from "./resume-state-paths";
import type { GardenResumeState } from "./resume-state.types";

export async function readGardenResumeState(pathOrGardenPath: string): Promise<GardenResumeState> {
  return JSON.parse(
    await readFile(resolveResumePathInput(pathOrGardenPath), "utf8"),
  ) as GardenResumeState;
}

export async function writeGardenResumeState(
  gardenPath: string,
  state: GardenResumeState,
): Promise<void> {
  const path = resolveGardenResumePath(gardenPath);
  await ensureWorkflowerHomeForPath(path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export type ResumeMetadataPersistenceOptions = {
  status?: GardenResumeState["status"];
  updatedAt?: string;
  completedAt?: string;
};

export async function persistResumeMetadataForActiveState(
  state: ActiveWorkflowState,
  options: ResumeMetadataPersistenceOptions = {},
): Promise<void> {
  await writeGardenResumeState(
    state.gardenPath ?? dirname(state.workdir),
    activeWorkflowStateToGardenResumeState(state, options),
  );
}

export function activeWorkflowStateToGardenResumeState(
  state: ActiveWorkflowState,
  options: ResumeMetadataPersistenceOptions = {},
): GardenResumeState {
  const status = options.status ?? "active";

  return {
    version: 1,
    status,
    sessionId: state.sessionId,
    sessionFile: state.sessionFile,
    workflowId: state.id,
    gardenName: state.gardenName ?? state.name,
    gardenPath: state.gardenPath ?? dirname(state.workdir),
    activeFlowerName: state.activeFlowerName ?? "",
    activeFlowerPath: state.activeFlowerPath ?? state.workdir,
    currentStepIndex: state.currentStepIndex,
    ...(state.queuedWorkflowIds?.length ? { queuedWorkflowIds: state.queuedWorkflowIds } : {}),
    contextBoundaryEntryId: state.contextBoundaryEntryId,
    runtimeDefaults: state.runtimeDefaults,
    startedAt: state.startedAt,
    updatedAt: options.updatedAt ?? state.updatedAt,
    ...(status === "completed" && options.completedAt ? { completedAt: options.completedAt } : {}),
  };
}
