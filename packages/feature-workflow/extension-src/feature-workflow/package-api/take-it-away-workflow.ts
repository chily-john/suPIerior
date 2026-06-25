import type { WorkflowDefinition } from "@supierior/workflower";

export const takeItAwayWorkflow: WorkflowDefinition = {
  id: "take-it-away",
  clearOnStart: false,
  cleanupOnCompletion: false,
  pollen: "feature-doc.md",
  steps: [
    {
      id: "create-feature-doc",
      command: "/skill:feature-doc-create",
      outputs: ["feature-doc.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-implementation-doc-loop",
      command: "/feature-workflow-route start-implementation-doc-loop",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
