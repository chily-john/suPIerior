import { join } from "node:path";
import { resolveWorkflowsRoot } from "@orchestration/runtime/workflower-home";

export type WorkflowPaths = {
  gardenPath: string;
  flowerName: string;
  flowerPath: string;
  workdir: string;
};

export function resolveWorkflowPaths(
  cwd: string,
  workflowId: string,
  gardenName: string,
): WorkflowPaths {
  const flowerName = `0001-${workflowId}`;
  const gardenPath = join(resolveWorkflowsRoot(cwd), gardenName);
  const flowerPath = join(gardenPath, flowerName);

  return {
    gardenPath,
    flowerName,
    flowerPath,
    workdir: flowerPath,
  };
}
