import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerExtension, type WorkflowerSetupOptions } from "@pi-adapter/register-extension";

export default function setupWorkflower(pi: ExtensionAPI, options?: WorkflowerSetupOptions): void {
  // Delegate to registerExtension which has proper guards for:
  // - Per-instance command registration (prevents duplicate commands on same Pi instance)
  // - Global tool registration (prevents duplicate tools across all extensions)
  // - Session shutdown cleanup (allows re-registration after session ends)
  registerExtension(pi, options);
}

export { setupWorkflower };
export type { WorkflowerSetupOptions };

export type {
  WorkflowDefinition,
  WorkflowModelFallbacks,
  WorkflowModelLevel,
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
