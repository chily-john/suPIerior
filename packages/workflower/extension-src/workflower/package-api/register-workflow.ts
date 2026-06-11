import { addWorkflowToGlobalRegistry } from "@orchestration/definitions/registry/global-registry";
import type { WorkflowDefinition } from "./workflow-definition.types";

export function registerWorkflow(workflow: WorkflowDefinition): void {
  addWorkflowToGlobalRegistry(workflow);
}
