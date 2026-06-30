import type { StepMetrics, WorkflowerConfig } from "./step-metrics.types";
import type { ModelConfig } from "@/model-config";
import { promises as fs } from "fs";
import { resolve } from "path";

const CONFIG_FILE_NAME = "config.json";
const DEFAULT_WORKFLOWER_DIR = ".workflower";

let cachedConfig: WorkflowerConfig | null = null;

/**
 * Gets the config path for a given workflower root directory.
 */
function getConfigPath(workflowerRoot: string): string {
  const workflowerDir = process.env.WORKFLOWER_DIR || DEFAULT_WORKFLOWER_DIR;
  return resolve(workflowerRoot, workflowerDir, CONFIG_FILE_NAME);
}

/**
 * Reads the metricsEnabled setting from the Workflower configuration.
 * Returns safe defaults if the config doesn't exist or has an invalid schema.
 * Results are cached after the first read to avoid repeated file system operations.
 *
 * @param workflowerRoot - The root directory of the Workflower workflow
 * @returns A promise that resolves to the WorkflowerConfig object
 */
export async function readConfig(workflowerRoot: string): Promise<WorkflowerConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const configPath = getConfigPath(workflowerRoot);
  
  let config: ModelConfig | null = null;
  try {
    const fileContent = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(fileContent) as ModelConfig;
  } catch {
    // File doesn't exist or can't be read - use default
  }

  // If config is null or metricsEnabled is not a boolean, use default
  if (!config || typeof config.metricsEnabled !== "boolean") {
    cachedConfig = { metricsEnabled: true };
    return cachedConfig;
  }

  cachedConfig = { metricsEnabled: config.metricsEnabled } as WorkflowerConfig;
  return cachedConfig;
}

/**
 * Resets the configuration cache.
 * This is primarily used for testing to ensure a fresh config read.
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}

/**
 * Ensures the metrics directory exists for a given flower.
 * Creates the directory structure: .workflower/past-runs-data/<garden>/<flower>/
 *
 * @param flowerPath - Absolute path to the flower's index.json file
 * @returns Promise resolving to the absolute path of the metrics directory
 */
export async function ensureMetricsDir(flowerPath: string): Promise<string> {
  const normalizedPath = flowerPath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  const workflowsIndex = parts.indexOf("workflows");

  if (workflowsIndex === -1) {
    throw new Error(`Invalid flower path: 'workflows' directory not found in ${flowerPath}`);
  }

  const garden = parts[workflowsIndex + 1];
  const flower = parts[workflowsIndex + 2];

  if (!garden || !flower) {
    throw new Error(`Cannot extract garden and flower names from path: ${flowerPath}`);
  }

  const basePath = parts.slice(0, workflowsIndex).join("/");
  const metricsDir = resolve(basePath, ".workflower", "past-runs-data", garden, flower);

  await fs.mkdir(metricsDir, { recursive: true });
  return metricsDir.replace(/\\/g, "/");
}

/**
 * Appends step metrics to the metrics.json file for a flower.
 * Creates the file with a single-element array if it doesn't exist.
 * Appends to existing array if the file exists.
 * Uses atomic write pattern (temp file + rename) to prevent corruption.
 *
 * @param flowerPath - Absolute path to the flower's index.json file
 * @param stepMetrics - The step metrics to append
 * @returns Promise that resolves when the metrics have been written
 */
export async function appendStepMetrics(
  flowerPath: string,
  stepMetrics: StepMetrics,
): Promise<void> {
  const metricsDir = await ensureMetricsDir(flowerPath);
  const metricsFile = resolve(metricsDir, "metrics.json");

  let existing: StepMetrics[] = [];

  try {
    const content = await fs.readFile(metricsFile, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      existing = parsed;
    }
  } catch {
    existing = [];
  }

  const updated = [...existing, stepMetrics];

  const tempFile = `${metricsFile}.tmp.${Date.now()}`;
  await fs.writeFile(tempFile, JSON.stringify(updated, null, 2));
  await fs.rename(tempFile, metricsFile);
}
