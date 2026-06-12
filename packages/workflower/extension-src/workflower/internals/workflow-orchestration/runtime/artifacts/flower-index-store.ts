import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { WorkflowDefinition, WorkflowStep } from "@package-api/workflow-definition.types";

export type FlowerIndex = {
  status: string;
  workflowId: string;
  flowerPath: string;
  pollen: string[];
  pollenPinned: boolean;
};

export async function writeInitialFlowerIndex(input: {
  flowerPath: string;
  workflowId: string;
}): Promise<void> {
  await writeFlowerIndex(input.flowerPath, {
    status: "active",
    workflowId: input.workflowId,
    flowerPath: input.flowerPath,
    pollen: [],
    pollenPinned: false,
  });
}

export async function updateFlowerPollen(input: {
  flowerPath: string;
  workflow: Pick<WorkflowDefinition, "pollen">;
  completedStep: Pick<WorkflowStep, "outputs"> | undefined;
}): Promise<void> {
  const outputs = input.completedStep?.outputs ?? [];
  if (outputs.length === 0) return;

  const index = await readFlowerIndex(input.flowerPath);
  if (!index || index.pollenPinned) return;

  const configuredPollen = input.workflow.pollen;
  const nextIndex = { ...index };

  if (configuredPollen === undefined) {
    nextIndex.pollen = resolveFlowerPaths(input.flowerPath, outputs);
  } else if (typeof configuredPollen === "string") {
    if (outputs.includes(configuredPollen)) {
      nextIndex.pollen = [resolveFlowerPath(input.flowerPath, configuredPollen)];
      nextIndex.pollenPinned = true;
    } else {
      nextIndex.pollen = resolveFlowerPaths(input.flowerPath, outputs);
    }
  } else if (configuredPollen.some((pollenPath) => outputs.includes(pollenPath))) {
    nextIndex.pollen = resolveFlowerPaths(input.flowerPath, configuredPollen);
    nextIndex.pollenPinned = true;
  } else {
    nextIndex.pollen = resolveFlowerPaths(input.flowerPath, outputs);
  }

  await writeFlowerIndex(input.flowerPath, nextIndex);
}

export async function readFlowerIndex(flowerPath: string): Promise<FlowerIndex | undefined> {
  try {
    return JSON.parse(await readFile(resolveFlowerIndexPath(flowerPath), "utf8")) as FlowerIndex;
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

export async function markFlowerHandedOff(flowerPath: string): Promise<string[]> {
  const index = await readFlowerIndex(flowerPath);
  if (!index) return [];

  await writeFlowerIndex(flowerPath, { ...index, status: "handedOff" });
  return index.pollen;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

async function writeFlowerIndex(flowerPath: string, index: FlowerIndex): Promise<void> {
  await writeFile(
    resolveFlowerIndexPath(flowerPath),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );
}

function resolveFlowerIndexPath(flowerPath: string): string {
  return join(flowerPath, "index.json");
}

function resolveFlowerPaths(flowerPath: string, paths: string[]): string[] {
  return paths.map((path) => resolveFlowerPath(flowerPath, path));
}

function resolveFlowerPath(flowerPath: string, path: string): string {
  return resolve(flowerPath, path);
}
