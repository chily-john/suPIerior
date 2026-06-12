import type { WorkflowDefinition } from "@supierior/workflower";

export const newFeatureWorkflow: WorkflowDefinition = {
  id: "new-feature",
  cleanupOnCompletion: true,
  pollen: "issues.md",
  steps: [
    {
      id: "grill",
      command: "/skill:new-feature-grill",
      clearOnNext: false,
    },
    {
      id: "summary",
      command: "/skill:new-feature-summary",
      outputs: ["feature-summary.md"],
      autoNext: true,
    },
    {
      id: "convert-to-issues-prep",
      command: "/skill:new-feature-convert-to-issues-prep",
      outputs: ["issues.md"],
      autoNext: true,
    },
    {
      id: "review-issues",
      command: "/skill:new-feature-review-issues",
      outputs: ["issues.md"],
      autoNext: true,
    },
    {
      id: "publish-issues",
      command: "/skill:new-feature-publish-issues",
      autoNext: true,
    },
  ],
};
