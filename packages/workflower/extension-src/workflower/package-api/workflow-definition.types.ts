export type WorkflowThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export type WorkflowStep = {
  id: string;
  command: string;
  outputs?: string[];
  clearOnNext?: boolean;
  autoNext?: boolean;
  model?: string;
  thinkingLevel?: WorkflowThinkingLevel;
};

export type WorkflowDefinition = {
  id: string;
  clearOnStart?: boolean;
  clearOnCompletion?: boolean;
  cleanupOnCompletion?: boolean;
  pollen?: string | string[];
  acceptPollen?: boolean;
  steps: WorkflowStep[];
};
