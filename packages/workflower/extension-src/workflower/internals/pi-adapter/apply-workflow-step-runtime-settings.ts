import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { WorkflowStep } from "@package-api/workflow-definition.types";

type RuntimeSettingsContext = Pick<ExtensionContext, "modelRegistry" | "ui">;

export async function applyWorkflowStepRuntimeSettings(
  pi: ExtensionAPI,
  ctx: RuntimeSettingsContext,
  step: WorkflowStep,
): Promise<boolean> {
  if (step.model) {
    const resolved = resolveModelReference(step.model);
    if (!resolved) {
      ctx.ui.notify(`Invalid workflow step model reference: ${step.model}. Expected provider/model-id.`, "error");
      return false;
    }

    const model = ctx.modelRegistry.find(resolved.provider, resolved.modelId);
    if (!model) {
      ctx.ui.notify(`Workflow step model not found: ${step.model}.`, "error");
      return false;
    }

    const success = await pi.setModel(model);
    if (!success) {
      ctx.ui.notify(`No API key available for workflow step model: ${step.model}.`, "error");
      return false;
    }
  }

  if (step.thinkingLevel) {
    pi.setThinkingLevel(step.thinkingLevel as Parameters<ExtensionAPI["setThinkingLevel"]>[0]);
  }

  return true;
}

function resolveModelReference(reference: string): { provider: string; modelId: string } | null {
  const separatorIndex = reference.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === reference.length - 1) return null;

  return {
    provider: reference.slice(0, separatorIndex),
    modelId: reference.slice(separatorIndex + 1),
  };
}
