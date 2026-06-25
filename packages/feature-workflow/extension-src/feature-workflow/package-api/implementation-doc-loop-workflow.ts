import type { WorkflowDefinition } from "@supierior/workflower";

export const implementationDocLoopWorkflow: WorkflowDefinition = {
  id: "implementation-doc-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  pollen: "implementation-doc.md",
  steps: [
    {
      id: "create-or-improve-implementation-doc",
      command: "/skill:implementation-doc-create",
      outputs: ["implementation-doc.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-implementation-doc",
      command: "/skill:implementation-doc-review",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-implementation-doc-review",
      command: "/feature-workflow-route implementation-doc-review",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
