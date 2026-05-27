import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface FeatureFlowNextStepConfig {
  type: "kanban-converter" | string;
  converter?: string;
}

export interface FeatureFlowConfig {
  freshReviewHandoff: "checkpoint" | string;
  afterPlan: "stop" | string;
  grillingIntensity: "challenging" | "normal" | string;
  nextStep?: FeatureFlowNextStepConfig;
  kanbanConverters?: Record<string, unknown>;
  questions: {
    maxTurns?: number;
    maxQuestions?: number;
    showAdjustmentIndicator: boolean;
  };
  model: {
    maxRepairAttempts: number;
  };
}

export const defaultFeatureFlowConfig: FeatureFlowConfig = {
  freshReviewHandoff: "checkpoint",
  afterPlan: "stop",
  grillingIntensity: "challenging",
  questions: {
    showAdjustmentIndicator: true,
  },
  model: {
    maxRepairAttempts: 2,
  },
};

export async function loadFeatureFlowConfig(piRoot: string): Promise<FeatureFlowConfig> {
  const settingsConfig = await loadSettingsConfig(piRoot);
  if (settingsConfig) return mergeConfig(settingsConfig);

  try {
    const raw = await readFile(join(piRoot, "feature-flow.config.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<FeatureFlowConfig>;
    return mergeConfig(parsed);
  } catch {
    return defaultFeatureFlowConfig;
  }
}

async function loadSettingsConfig(piRoot: string): Promise<Partial<FeatureFlowConfig> | undefined> {
  try {
    const raw = await readFile(join(piRoot, "settings.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      featureFlow?: Partial<FeatureFlowConfig>;
      kanbanConverters?: Record<string, unknown>;
    };
    if (typeof parsed.featureFlow !== "object" || !parsed.featureFlow) return undefined;
    return {
      ...parsed.featureFlow,
      kanbanConverters: parsed.featureFlow.kanbanConverters ?? parsed.kanbanConverters,
    };
  } catch {
    return undefined;
  }
}

export function mergeConfig(input: Partial<FeatureFlowConfig>): FeatureFlowConfig {
  return {
    ...defaultFeatureFlowConfig,
    ...input,
    nextStep:
      typeof input.nextStep === "object" && input.nextStep
        ? { ...input.nextStep }
        : defaultFeatureFlowConfig.nextStep,
    kanbanConverters:
      typeof input.kanbanConverters === "object" && input.kanbanConverters
        ? { ...input.kanbanConverters }
        : defaultFeatureFlowConfig.kanbanConverters,
    questions: {
      ...defaultFeatureFlowConfig.questions,
      ...(typeof input.questions === "object" && input.questions ? input.questions : {}),
    },
    model: {
      maxRepairAttempts:
        typeof input.model === "object" &&
        input.model &&
        typeof input.model.maxRepairAttempts === "number"
          ? input.model.maxRepairAttempts
          : defaultFeatureFlowConfig.model.maxRepairAttempts,
    },
  };
}
