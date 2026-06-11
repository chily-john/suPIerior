import { assertValidWorkflowId } from "@domain/workflow-id-validation";

export type WorkflowStep = {
  id: string;
  command: string;
  outputs?: string[];
};

export type WorkflowDefinition = {
  id: string;
  type: string;
  steps: WorkflowStep[];
};

export function defineWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  assertValidWorkflowId(workflow.id);
  return workflow;
}
