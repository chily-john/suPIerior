import type { WorkflowDefinition } from "@supierior/workflower";

export const counterWorkflow: WorkflowDefinition = {
  id: "counter",
  clearOnStart: true,
  clearOnCompletion: false,
  cleanupOnCompletion: true,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "low",
  steps: [
    {
      id: "initialize-counter",
      command: "/skill:counter-init",
      clearOnNext: true,
    },
    {
      id: "start-counter-loop",
      command: "/skill:counter-start-loop",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
