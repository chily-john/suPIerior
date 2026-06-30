import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type {
  WorkflowModelReference,
  WorkflowModelSetting,
  WorkflowRuntimeDefaults,
  WorkflowThinkingLevel,
} from "./workflow-definition.types";
import type { WorkflowStepRuntimeSettings } from "@orchestration/runtime/use-cases/workflow-runtime.types";
import { readConfig } from "../model-config";
import { isLevelName, resolveModelWithFallback, LEVEL_ORDER, resolveModelWithFallbackAndMetadata, type ModelResolution } from "../model-resolver";
import type { ModelConfig } from "../model-resolver";

export type RuntimeSettingsContext = Pick<ExtensionContext, "modelRegistry" | "ui"> &
  Partial<Pick<ExtensionContext, "model">>;

// Track which workflows have already shown the model resolution notification
// Key: workflow ID + session ID, Value: whether notification was shown
const workflowModelNotificationShown = new Set<string>();

export function captureWorkflowRuntimeDefaults(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
): WorkflowRuntimeDefaults {
  const defaults: WorkflowRuntimeDefaults = {
    thinkingLevel: pi.getThinkingLevel() as WorkflowThinkingLevel,
  };
  const currentModel = modelReferenceFromCurrentModel(ctx.model);
  if (currentModel) defaults.model = currentModel;
  return defaults;
}

export async function applyWorkflowStepRuntimeSettings(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
  settings: WorkflowStepRuntimeSettings,
): Promise<boolean> {
  const resolutionMetadata = await applyWorkflowModelCandidates(pi, ctx, {
    stepModel: settings.step.model,
    workflowModel: settings.workflow.model,
    runtimeDefaultsModel: settings.runtimeDefaults?.model,
  });
  
  // Show notification if model was resolved and notification hasn't been shown for this workflow yet
  if (resolutionMetadata && ctx.ui) {
    const notificationKey = `${settings.workflow.id}`;
    if (!workflowModelNotificationShown.has(notificationKey)) {
      workflowModelNotificationShown.add(notificationKey);
      const message = formatModelResolutionNotification(resolutionMetadata);
      ctx.ui.notify(message, 'info');
    }
  }

  const thinkingLevel =
    settings.step.thinkingLevel ??
    settings.workflow.thinkingLevel ??
    settings.runtimeDefaults?.thinkingLevel;
  if (thinkingLevel) {
    pi.setThinkingLevel(thinkingLevel as Parameters<ExtensionAPI["setThinkingLevel"]>[0]);
  }

  return true;
}

export async function restoreWorkflowRuntimeDefaults(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
  runtimeDefaults?: WorkflowRuntimeDefaults,
): Promise<void> {
  if (!runtimeDefaults) return;

  await applyWorkflowModelCandidates(pi, ctx, {
    runtimeDefaultsModel: runtimeDefaults.model,
  });

  if (runtimeDefaults.thinkingLevel) {
    pi.setThinkingLevel(
      runtimeDefaults.thinkingLevel as Parameters<ExtensionAPI["setThinkingLevel"]>[0],
    );
  }
}

async function applyWorkflowModelCandidates(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
  modelSettings: { stepModel?: WorkflowModelSetting; workflowModel?: WorkflowModelSetting; runtimeDefaultsModel?: string },
): Promise<ModelResolution | null> {
  const config = readConfig();
  const candidates = collectModelCandidatesFromSettings(modelSettings);
  
  if (candidates.length === 0) return null;

  const failures: string[] = [];
  
  // Track the first successful resolution metadata
  let firstResolution: ModelResolution | null = null;
  
  for (const candidate of candidates) {
    // Check if this candidate is a level name and resolve it with metadata
    let resolvedModelId: string | null = null;
    let resolution: ModelResolution | null = null;
    
    if (isLevelName(candidate.reference)) {
      const result = resolveModelWithFallbackAndMetadata(candidate.reference, config);
      resolvedModelId = result.result;
      resolution = result.resolution;
    } else {
      resolvedModelId = candidate.reference;
      // For direct model IDs, create resolution metadata
      resolution = {
        requestedLevel: null,
        resolvedModel: candidate.reference,
        usedFallback: false,
        finalLevel: null,
      };
    }

    const resolved = resolvedModelId ? resolveModelReference(resolvedModelId) : null;
    if (!resolved) {
      failures.push(`${candidate.reference} (invalid; expected provider/model-id)`);
      continue;
    }

    const model = ctx.modelRegistry.find(resolved.provider, resolved.modelId);
    if (!model) {
      failures.push(`${candidate.reference} (not found)`);
      continue;
    }

    const success = await pi.setModel(model);
    if (success) {
      // Store the first successful resolution metadata
      if (!firstResolution && resolution) {
        firstResolution = resolution;
      }
      return firstResolution;
    }

    failures.push(`${candidate.reference} (no API key)`);
  }

  ctx.ui.notify(
    `No workflow model candidate available; using current/default model. Tried: ${failures.join(", ")}.`,
    "warning",
  );
  
  return null;
}

function collectModelCandidates(settings: WorkflowStepRuntimeSettings): string[] {
  const config = readConfig();
  
  return [
    ...resolveModelReferences(settings.step.model, config),
    ...resolveModelReferences(settings.workflow.model, config),
    ...(settings.runtimeDefaults?.model ? [settings.runtimeDefaults.model] : []),
  ];
}

/**
 * Collects model candidates from settings with their original reference strings
 * (before resolution) for tracking metadata.
 * Non-level names for stepModel and workflowModel are filtered out (story 007 breaking change).
 */
function collectModelCandidatesFromSettings(modelSettings: { stepModel?: WorkflowModelSetting; workflowModel?: WorkflowModelSetting; runtimeDefaultsModel?: string }): { reference: string; isLevel: boolean }[] {
  const config = readConfig();
  const candidates: { reference: string; isLevel: boolean }[] = [];
  
  // Helper to add candidates from a model setting, filtering out non-level names
  const addCandidates = (modelSetting: WorkflowModelSetting | undefined, source: string) => {
    if (!modelSetting) return;
    
    if (typeof modelSetting === 'string') {
      const isLevel = isLevelName(modelSetting);
      // Only add level names; non-level names are ignored (story 007)
      if (isLevel) {
        candidates.push({ reference: modelSetting, isLevel });
      } else if (process.env.WORKFLOWER_DEBUG === 'true') {
        console.warn(`[workflower] Ignoring non-level ${source} model string: "${modelSetting}". Valid levels are: ${LEVEL_ORDER.join(', ')}`);
      }
    } else {
      // modelSetting is WorkflowModelFallbacks (readonly array)
      for (const ref of modelSetting as readonly string[]) {
        const isLevel = isLevelName(ref);
        // Only add level names; non-level names are ignored (story 007)
        if (isLevel) {
          candidates.push({ reference: ref, isLevel });
        } else if (process.env.WORKFLOWER_DEBUG === 'true') {
          console.warn(`[workflower] Ignoring non-level ${source} model string: "${ref}". Valid levels are: ${LEVEL_ORDER.join(', ')}`);
        }
      }
    }
  };
  
  addCandidates(modelSettings.stepModel, 'step');
  addCandidates(modelSettings.workflowModel, 'workflow');
  if (modelSettings.runtimeDefaultsModel) {
    // runtimeDefaultsModel is always a direct model ID, not a level name
    candidates.push({ reference: modelSettings.runtimeDefaultsModel, isLevel: false });
  }
  
  return candidates;
}

/**
 * Resolves model references, handling both level names and direct model IDs.
 * If a reference is a level name, it will be resolved using the config.
 * If a reference is not a level name, it is ignored (breaking change from story 007).
 * If resolution fails for a level name, the original level name is used.
 * Null results are filtered out.
 */
function resolveModelReferences(
  modelSetting: WorkflowModelSetting | undefined,
  config: ModelConfig | null,
): string[] {
  if (!modelSetting) return [];
  
  if (typeof modelSetting === "string") {
    const resolved = resolveSingleModelReference(modelSetting, config);
    return resolved !== null ? [resolved] : [];
  }
  
  // Handle array of model settings (fallback candidates)
  return modelSetting
    .map((ref) => resolveSingleModelReference(ref, config))
    .filter((result): result is string => result !== null);
}

/**
 * Resolves a single model reference.
 * If it's a level name, resolves it using the config.
 * If it's not a level name, returns null (to be ignored/fallback).
 * If resolution fails for a level name, returns the original level name.
 */
function resolveSingleModelReference(
  reference: string,
  config: ModelConfig | null,
): string | null {
  // Check if the reference is a level name
  if (isLevelName(reference)) {
    const resolved = resolveModelWithFallback(reference, config);
    // If resolution succeeds, return the resolved model ID
    // If resolution fails (returns null), return the original level name
    // This allows level names to be used even if config doesn't have them
    return resolved !== null ? resolved : reference;
  }
  
  // Not a level name - treat as undefined (breaking change from story 007)
  // Log for debugging if enabled
  if (process.env.WORKFLOWER_DEBUG === 'true') {
    console.warn(`[workflower] Ignoring non-level model string: "${reference}". Valid levels are: ${LEVEL_ORDER.join(', ')}`);
  }
  
  // Return null so it can be filtered out
  return null;
}

/**
 * Formats a model resolution notification message based on the resolution metadata.
 * Verbose mode can be enabled via environment variable to show full resolution path.
 */
function formatModelResolutionNotification(resolution: ModelResolution): string {
  const { requestedLevel, resolvedModel, usedFallback, finalLevel } = resolution;
  const verbose = process.env.WORKFLOWER_MODEL_RESOLUTION_VERBOSE === 'true';
  
  if (!resolvedModel) {
    return 'Using default model';
  }
  
  // If no level was requested (direct model ID)
  if (requestedLevel === null) {
    return `Using model: ${resolvedModel} (default)`;
  }
  
  // If fallback was used
  if (usedFallback) {
    if (verbose && finalLevel) {
      return `Using model: ${resolvedModel} (requested: ${requestedLevel}, fallback: true, final: ${finalLevel})`;
    }
    return `Using model: ${resolvedModel} (requested: ${requestedLevel}, fallback: true)`;
  }
  
  // Normal case: requested level was resolved directly
  return `Using model: ${resolvedModel} (requested: ${requestedLevel})`;
}

function normalizeModelReferences(modelSetting: WorkflowModelSetting | undefined): string[] {
  if (!modelSetting) return [];
  return typeof modelSetting === "string" ? [modelSetting] : [...modelSetting];
}

function modelReferenceFromCurrentModel(
  model: RuntimeSettingsContext["model"],
): WorkflowModelReference | undefined {
  if (!model) return undefined;
  const { provider, id } = model as { provider?: unknown; id?: unknown };
  if (typeof provider !== "string" || typeof id !== "string" || !provider || !id) {
    return undefined;
  }

  return `${provider}/${id}` as WorkflowModelReference;
}

function resolveModelReference(reference: string): { provider: string; modelId: string } | null {
  const separatorIndex = reference.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === reference.length - 1) return null;

  return {
    provider: reference.slice(0, separatorIndex),
    modelId: reference.slice(separatorIndex + 1),
  };
}

// Export helper functions for testing
export { collectModelCandidates, normalizeModelReferences, resolveModelReferences as resolveModelReferencesInternal };
export type { ModelResolution };
