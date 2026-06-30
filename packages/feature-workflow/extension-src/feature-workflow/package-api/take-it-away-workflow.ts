import type { WorkflowDefinition } from "@supierior/workflower";

export const takeItAwayWorkflow: WorkflowDefinition = {
  id: "take-it-away",
  clearOnStart: false,
  cleanupOnCompletion: false,
  model: "medium",
  thinkingLevel: "low",
  pollen: "feature-doc.md",
  steps: [
    {
      id: "create-feature-doc",
      command: "/skill:feature-doc-create",
      outputs: ["feature-doc.md"],
      thinkingLevel: "medium",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-implementation-doc-loop",
      command: "/feature-workflow-route start-implementation-doc-loop",
      thinkingLevel: "minimal",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
