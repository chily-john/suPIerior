import * as fs from "node:fs";
import * as path from "node:path";

const CONFIG_FILE_NAME = "config.json";
const DEFAULT_WORKFLOWER_DIR = ".workflower";
const LEVEL_ORDER = ["tiny", "small", "medium", "large", "xl"] as const;
const VALID_FALLBACK_STRATEGIES = ["up", "down", "default"] as const;

export interface ModelConfig {
  modelLevels?: Record<string, string[]>;
  defaultModel?: string;
  fallbackStrategy?: string;
  metricsEnabled?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function getConfigPath(): string {
  const workflowerDir = process.env.WORKFLOWER_DIR || DEFAULT_WORKFLOWER_DIR;
  return path.resolve(process.cwd(), workflowerDir, CONFIG_FILE_NAME);
}

export function readConfig(): ModelConfig | null {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const fileContent = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(fileContent) as unknown;

  return config as ModelConfig;
}

export function validateConfig(config: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    errors.push("Config must be an object");
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  if (cfg.modelLevels !== undefined) {
    if (
      typeof cfg.modelLevels !== "object" ||
      cfg.modelLevels === null ||
      Array.isArray(cfg.modelLevels)
    ) {
      errors.push("modelLevels must be an object");
    } else {
      const modelLevels = cfg.modelLevels as Record<string, unknown>;

      for (const key of Object.keys(modelLevels)) {
        if (!LEVEL_ORDER.includes(key as (typeof LEVEL_ORDER)[number])) {
          errors.push(`Invalid level key: ${key}`);
        }
      }

      for (const [level, value] of Object.entries(modelLevels)) {
        if (!Array.isArray(value)) {
          errors.push(`modelLevels.${level} must be an array`);
        } else {
          for (const item of value) {
            if (typeof item !== "string") {
              errors.push(`modelLevels.${level} must be an array of strings`);
              break;
            }
          }
        }
      }
    }
  }

  if (cfg.defaultModel !== undefined) {
    if (typeof cfg.defaultModel !== "string") {
      errors.push("defaultModel must be a string");
    }
  }

  if (cfg.fallbackStrategy !== undefined) {
    if (typeof cfg.fallbackStrategy !== "string") {
      errors.push("fallbackStrategy must be a string");
    } else if (
      !VALID_FALLBACK_STRATEGIES.includes(
        cfg.fallbackStrategy as (typeof VALID_FALLBACK_STRATEGIES)[number],
      )
    ) {
      errors.push(`fallbackStrategy must be one of: ${VALID_FALLBACK_STRATEGIES.join(", ")}`);
    }
  }

  if (cfg.metricsEnabled !== undefined) {
    if (typeof cfg.metricsEnabled !== "boolean") {
      errors.push("metricsEnabled must be a boolean");
    }
  }

  return { valid: errors.length === 0, errors };
}
