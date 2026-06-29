import type { WorkflowerConfig, StepMetrics } from "./step-metrics.types";
import { promises as fs } from "fs";
import { resolve, dirname } from "path";

const CONFIG_FILE_NAME = "config.json";

const DEFAULT_CONFIG: WorkflowerConfig = {
  metricsEnabled: false,
};

let cachedConfig: WorkflowerConfig | null = null;

/**
 * Reads the Workflower configuration from the config file.
 * Returns safe defaults if the file doesn't exist, is corrupted, or has an invalid schema.
 * Results are cached after the first read to avoid repeated file system operations.
 *
 * @param workflowerRoot - The root directory of the Workflower workflow
 * @returns A promise that resolves to the WorkflowerConfig object
 */
export async function readConfig(workflowerRoot: string): Promise<WorkflowerConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const configPath = resolve(workflowerRoot, CONFIG_FILE_NAME);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);

    // Validate schema
    if (typeof parsed?.metricsEnabled !== "boolean") {
      return DEFAULT_CONFIG;
    }

    cachedConfig = {
      metricsEnabled: parsed.metricsEnabled,
    };
    return cachedConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
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
