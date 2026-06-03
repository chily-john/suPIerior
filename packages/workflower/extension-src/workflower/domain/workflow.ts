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
  return workflow;
}
