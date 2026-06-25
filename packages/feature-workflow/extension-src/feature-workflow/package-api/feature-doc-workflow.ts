import type { WorkflowDefinition } from "@supierior/workflower";

export const featureDocWorkflow: WorkflowDefinition = {
  id: "feature-doc",
  clearOnStart: false,
  cleanupOnCompletion: false,
  pollen: "feature-doc.md",
  steps: [
    {
      id: "create-feature-doc",
      command: "/skill:feature-doc-create",
      outputs: ["feature-doc.md"],
    },
  ],
};
