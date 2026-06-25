import { basename, dirname } from "node:path";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { GardenStateProducer } from "@package-api/garden-state.types";
import type { WorkflowCommandContext } from "../start/start.types";

export type ActiveGardenResolutionFailure = {
  ok: false;
  message: string;
};

export type ActiveGardenResolutionSuccess = {
  ok: true;
  activeState: ActiveWorkflowState;
  gardenName: string;
  gardenPath: string;
  flowerName?: string;
  flowerPath: string;
  producer: GardenStateProducer;
};

export type ActiveGardenResolution = ActiveGardenResolutionSuccess | ActiveGardenResolutionFailure;

export async function resolveActiveGarden(
  ctx: WorkflowCommandContext,
): Promise<ActiveGardenResolution> {
  const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());

  let activeState: ActiveWorkflowState;
  try {
    activeState = await readActiveWorkflowState(activeStatePath);
  } catch {
    return {
      ok: false,
      message:
        "No active Workflower workflow. Garden state is only available inside an active garden.",
    };
  }

  const flowerPath = activeState.activeFlowerPath ?? activeState.workdir;
  const gardenPath = activeState.gardenPath ?? dirname(activeState.workdir);
  const gardenName = activeState.gardenName ?? activeState.name;
  const workflow = findWorkflow(activeState.id);
  const stepId = workflow?.steps[activeState.currentStepIndex]?.id;
  const flowerName = activeState.activeFlowerName ?? basename(flowerPath);

  return {
    ok: true,
    activeState,
    gardenName,
    gardenPath,
    flowerName,
    flowerPath,
    producer: {
      workflowId: activeState.id,
      ...(stepId ? { stepId } : {}),
      stepIndex: activeState.currentStepIndex,
      gardenName,
      gardenPath,
      flowerName,
      flowerPath,
    },
  };
}
