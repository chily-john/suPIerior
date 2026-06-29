import type { WorkflowDefinition } from "@supierior/workflower";

export const implementationDocLoopWorkflow: WorkflowDefinition = {
  id: "implementation-doc-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "low",
  pollen: "implementation-doc.md",
  steps: [
    {
      id: "create-or-improve-implementation-doc",
      command: "/skill:implementation-doc-create",
      model: ["openai/gpt-5.5", "openai/gpt-5.4-mini"],
      thinkingLevel: "high",
      outputs: ["implementation-doc.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-implementation-doc",
      command: "/skill:implementation-doc-review",
      thinkingLevel: "medium",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-implementation-doc-review",
      command: "/feature-workflow-route implementation-doc-review",
      thinkingLevel: "minimal",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
