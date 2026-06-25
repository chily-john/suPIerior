export type WorkflowerCommandResult = { kind: "prompt"; content: string } | { kind: "none" };

export type WorkflowerCommandContext = {
  workflowId: string;
  workflowName: string;
  stepId: string;
  stepName?: string;
  gardenName: string;
  cwd: string;
  signal?: AbortSignal;
};

export type WorkflowerCommandDefinition = {
  name: string;
  description?: string;
  handler: (
    args: string,
    ctx: WorkflowerCommandContext,
  ) => Promise<WorkflowerCommandResult> | WorkflowerCommandResult;
};
