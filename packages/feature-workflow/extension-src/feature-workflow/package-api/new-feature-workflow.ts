import type { WorkflowDefinition } from "@supierior/workflower";

export const newFeatureWorkflow: WorkflowDefinition = {
  id: "new-feature",
  clearOnStart: true,
  cleanupOnCompletion: false,
  pollen: "feature-doc.md",
  steps: [
    {
      id: "grill",
      command: "/skill:feature-grill",
      clearOnNext: false,
    },
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
