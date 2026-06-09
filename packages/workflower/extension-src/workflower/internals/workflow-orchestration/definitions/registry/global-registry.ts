import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { validateWorkflowId } from "@orchestration/definitions/validation/workflow-id-validation";
import type { WorkflowerGlobal } from "./registry.types";

const registryGlobal = globalThis as WorkflowerGlobal;
const registry = (registryGlobal.__supieriorWorkflowerRegistry ??= {
  workflows: [],
  workflowById: new Map<string, WorkflowDefinition>(),
  listeners: new Set<(workflow: WorkflowDefinition) => void>(),
});
registry.listeners ??= new Set<(workflow: WorkflowDefinition) => void>();

export function addWorkflowToGlobalRegistry(workflow: WorkflowDefinition): void {
  validateWorkflowId(workflow.id);

  const existingWorkflow = registry.workflowById.get(workflow.id);
  if (existingWorkflow !== undefined) {
    throw new Error(`Workflow id already registered: ${workflow.id}`);
  }

  registry.workflows.push(workflow);
  registry.workflowById.set(workflow.id, workflow);
  for (const listener of registry.listeners) listener(workflow);
}

export function listWorkflows(): WorkflowDefinition[] {
  return [...registry.workflows];
}

export function findWorkflow(workflowId: string): WorkflowDefinition | undefined {
  return registry.workflowById.get(workflowId);
}

export function onWorkflowRegistered(listener: (workflow: WorkflowDefinition) => void): () => void {
  registry.listeners.add(listener);
  return () => registry.listeners.delete(listener);
}
