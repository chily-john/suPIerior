import type { WorkflowDefinition } from "@supierior/workflower";

export const takeItAwayWorkflow: WorkflowDefinition = {
  id: "take-it-away",
  cleanupOnCompletion: true,
  clearOnStart: false,
  steps: [
    {
      id: "summarize-context",
      command: "/skill:take-it-away-summary",
      outputs: ["context-summary.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "plan-implementation",
      command: "/skill:take-it-away-plan",
      outputs: ["implementation-plan.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-plan",
      command: "/skill:take-it-away-review-plan",
      outputs: ["implementation-plan.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "implement-plan",
      command: "/skill:implementor",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-implementation",
      command: "/skill:reviewer",
      outputs: ["implementation-review.md"],
      autoNext: true,
    },
  ],
};
