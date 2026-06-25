import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ensureWorkflowerHomeForPath } from "@orchestration/runtime/workflower-home";
import type {
  GardenStateEntry,
  GardenStateFile,
  GardenStateProducer,
  JsonValue,
} from "./garden-state.types";
import { resolveGardenStatePath } from "./garden-state-paths";
import { assertJsonValue, cloneJsonValue, validateGardenStateKey } from "./garden-state-validation";

export function createEmptyGardenStateFile(): GardenStateFile {
  return { version: 1, values: {} };
}

export async function readGardenStateFile(gardenPath: string): Promise<GardenStateFile> {
  try {
    const parsed = JSON.parse(
      await readFile(resolveGardenStatePath(gardenPath), "utf8"),
    ) as Partial<GardenStateFile>;
    return normalizeGardenStateFile(parsed);
  } catch (error) {
    if (isMissingFileError(error)) return createEmptyGardenStateFile();
    throw error;
  }
}

export async function getGardenStateValue(
  gardenPath: string,
  key: string,
): Promise<GardenStateEntry | undefined> {
  validateGardenStateKey(key);
  const state = await readGardenStateFile(gardenPath);
  return state.values[key];
}

export async function setGardenStateValue(
  gardenPath: string,
  key: string,
  value: unknown,
  producer?: GardenStateProducer,
): Promise<GardenStateEntry> {
  validateGardenStateKey(key);
  assertJsonValue(value);

  const state = await readGardenStateFile(gardenPath);
  const entry: GardenStateEntry = {
    value: cloneJsonValue(value),
    updatedAt: new Date().toISOString(),
    ...(producer ? { producer } : {}),
  };
  state.values[key] = entry;

  await writeGardenStateFile(gardenPath, sortGardenStateFile(state));
  return entry;
}

export async function listGardenStateValues(
  gardenPath: string,
): Promise<Record<string, GardenStateEntry>> {
  return sortGardenStateFile(await readGardenStateFile(gardenPath)).values;
}

async function writeGardenStateFile(gardenPath: string, state: GardenStateFile): Promise<void> {
  const path = resolveGardenStatePath(gardenPath);
  await ensureWorkflowerHomeForPath(path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeGardenStateFile(parsed: Partial<GardenStateFile>): GardenStateFile {
  if (parsed.version !== 1 || typeof parsed.values !== "object" || parsed.values === null) {
    return createEmptyGardenStateFile();
  }
  return { version: 1, values: { ...parsed.values } };
}

function sortGardenStateFile(state: GardenStateFile): GardenStateFile {
  const sortedValues: Record<string, GardenStateEntry> = {};
  for (const key of Object.keys(state.values).sort()) sortedValues[key] = state.values[key];
  return { version: 1, values: sortedValues };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
