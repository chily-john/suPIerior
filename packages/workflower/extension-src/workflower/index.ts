import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerExtension } from "@pi-adapter/register-extension";

export default function workflower(pi: ExtensionAPI): void {
  registerExtension(pi);
}

export type {
  WorkflowDefinition,
  WorkflowModelFallbacks,
  WorkflowModelProvider,
  WorkflowModelReference,
  WorkflowModelSetting,
  WorkflowRuntimeDefaults,
  WorkflowStep,
  WorkflowStepModel,
  WorkflowThinkingLevel,
} from "@package-api/workflow-definition.types";
export { registerWorkflow } from "@package-api/register-workflow";
