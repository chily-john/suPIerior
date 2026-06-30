import type { WorkflowDefinition } from "@supierior/workflower";

export const newFeatureWorkflow: WorkflowDefinition = {
  id: "new-feature",
  clearOnStart: true,
  cleanupOnCompletion: false,
  model: "medium",
  thinkingLevel: "low",
  pollen: "feature-doc.md",
  steps: [
    {
      id: "grill",
      command: "/skill:feature-grill",
      thinkingLevel: "medium",
      clearOnNext: false,
    },
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
