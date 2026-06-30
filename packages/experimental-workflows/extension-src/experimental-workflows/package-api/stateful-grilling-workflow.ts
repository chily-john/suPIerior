import type { WorkflowDefinition } from "@supierior/workflower";

export const statefulGrillingWorkflow: WorkflowDefinition = {
  id: "stateful-grilling",
  modelInvocable: true,
  clearOnStart: true,
  clearOnCompletion: false,
  cleanupOnCompletion: true,
  model: "medium",
  thinkingLevel: "medium",
  steps: [
    {
      id: "ask-grilling-questions",
      command: "/skill:stateful-grilling-ask",
      clearOnNext: false,
    },
    {
      id: "update-feature-description-state",
      command: "/skill:stateful-grilling-update",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "continue-or-finalize-grilling",
      command: "/skill:stateful-grilling-continue",
      clearOnNext: true,
    },
  ],
};
