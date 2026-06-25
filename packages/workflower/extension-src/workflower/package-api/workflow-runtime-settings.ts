import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type {
  WorkflowModelReference,
  WorkflowModelSetting,
  WorkflowRuntimeDefaults,
  WorkflowThinkingLevel,
} from "./workflow-definition.types";
import type { WorkflowStepRuntimeSettings } from "@orchestration/runtime/use-cases/workflow-runtime.types";

export type RuntimeSettingsContext = Pick<ExtensionContext, "modelRegistry" | "ui"> &
  Partial<Pick<ExtensionContext, "model">>;

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
  await applyWorkflowModelCandidates(pi, ctx, collectModelCandidates(settings));

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

  await applyWorkflowModelCandidates(pi, ctx, runtimeDefaults.model ? [runtimeDefaults.model] : []);

  if (runtimeDefaults.thinkingLevel) {
    pi.setThinkingLevel(
      runtimeDefaults.thinkingLevel as Parameters<ExtensionAPI["setThinkingLevel"]>[0],
    );
  }
}

async function applyWorkflowModelCandidates(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
  references: string[],
): Promise<void> {
  if (references.length === 0) return;

  const failures: string[] = [];
  for (const reference of references) {
    const resolved = resolveModelReference(reference);
    if (!resolved) {
      failures.push(`${reference} (invalid; expected provider/model-id)`);
      continue;
    }

    const model = ctx.modelRegistry.find(resolved.provider, resolved.modelId);
    if (!model) {
      failures.push(`${reference} (not found)`);
      continue;
    }

    const success = await pi.setModel(model);
    if (success) return;

    failures.push(`${reference} (no API key)`);
  }

  ctx.ui.notify(
    `No workflow model candidate available; using current/default model. Tried: ${failures.join(", ")}.`,
    "warning",
  );
}

function collectModelCandidates(settings: WorkflowStepRuntimeSettings): string[] {
  return [
    ...normalizeModelReferences(settings.step.model),
    ...normalizeModelReferences(settings.workflow.model),
    ...(settings.runtimeDefaults?.model ? [settings.runtimeDefaults.model] : []),
  ];
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
