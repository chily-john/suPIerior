import type { WorkflowDefinition } from "@supierior/workflower";

export const counterLoopWorkflow: WorkflowDefinition = {
  id: "counter-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  clearOnCompletion: false,
  cleanupOnCompletion: true,
  model: "medium",
  thinkingLevel: "low",
  steps: [
    {
      id: "increment-counter",
      command: "/skill:counter-increment",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "continue-counter-loop",
      command: "/skill:counter-continue",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
