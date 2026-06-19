import type { WorkflowDefinition } from "@supierior/workflower";

export const counterLoopWorkflow: WorkflowDefinition = {
  id: "counter-loop",
  clearOnStart: true,
  clearOnCompletion: false,
  cleanupOnCompletion: true,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "low",
  pollen: "counter-state.json",
  steps: [
    {
      id: "increment-counter",
      command: "/skill:counter-increment",
      outputs: ["counter-state.json"],
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
