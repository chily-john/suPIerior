import type { WorkflowDefinition } from "@package-api/workflow-definition.types";

export type WorkflowRegistry = {
  workflows: WorkflowDefinition[];
  workflowById: Map<string, WorkflowDefinition>;
  listeners: Set<(workflow: WorkflowDefinition) => void>;
};

export type WorkflowerGlobal = typeof globalThis & {
  __supieriorWorkflowerRegistry?: WorkflowRegistry;
};
