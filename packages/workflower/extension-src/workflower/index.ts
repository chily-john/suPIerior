import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerExtension, type WorkflowerSetupOptions } from "@pi-adapter/register-extension";

export default function setupWorkflower(pi: ExtensionAPI, options?: WorkflowerSetupOptions): void {
  registerExtension(pi, options);
}

export { setupWorkflower };
export type { WorkflowerSetupOptions };

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
export { createWorkflowerRuntime } from "@package-api/create-workflower-runtime";
export { registerWorkflow } from "@package-api/register-workflow";
export { registerWorkflowerCommand } from "@package-api/register-workflower-command";
export type {
  WorkflowerCommandContext,
  WorkflowerCommandDefinition,
  WorkflowerCommandResult,
} from "@package-api/workflower-command.types";
export type {
  GardenStateEntry,
  GardenStateGetResult,
  GardenStateListItem,
  GardenStateListResult,
  GardenStateSetResult,
  JsonValue,
} from "@package-api/garden-state.types";
export type {
  WorkflowerRuntime,
  WorkflowerRuntimeContext,
  WorkflowerRuntimeOptions,
  WorkflowHandoffUseCaseResult,
} from "@package-api/workflower-runtime.types";
