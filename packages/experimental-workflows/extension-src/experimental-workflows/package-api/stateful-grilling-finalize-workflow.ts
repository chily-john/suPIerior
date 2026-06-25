import type { WorkflowDefinition } from "@supierior/workflower";

export const statefulGrillingFinalizeWorkflow: WorkflowDefinition = {
  id: "stateful-grilling-finalize",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  clearOnCompletion: false,
  cleanupOnCompletion: false,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "medium",
  steps: [
    {
      id: "write-feature-description",
      command: "/skill:stateful-grilling-finalize",
      outputs: ["feature-description.md"],
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
