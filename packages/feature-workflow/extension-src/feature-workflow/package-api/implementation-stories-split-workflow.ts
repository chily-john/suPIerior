import type { WorkflowDefinition } from "@supierior/workflower";

export const implementationStoriesSplitWorkflow: WorkflowDefinition = {
  id: "implementation-stories-split",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "low",
  steps: [
    {
      id: "split-implementation-stories",
      command: "/skill:implementation-stories-split",
      thinkingLevel: "medium",
      outputs: ["stories"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-story-implementation-loop",
      command: "/feature-workflow-route stories",
      thinkingLevel: "minimal",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
