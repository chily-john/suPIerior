import { join } from "node:path";

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
  const flowerPath = join(cwd, ".pi", "workflows", gardenName, flowerName);

  return {
    gardenPath: join(cwd, ".pi", "workflows", gardenName),
    flowerName,
    flowerPath,
    workdir: flowerPath,
  };
}
