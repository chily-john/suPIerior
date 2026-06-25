export type WorkflowerPromptDisplay = {
  kind: "workflow" | "step";
  label: string;
  workflowId: string;
  workflowName?: string;
  stepId?: string;
  stepIndex?: number;
};
