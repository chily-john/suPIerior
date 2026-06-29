import type { WorkflowDefinition } from "@supierior/workflower";

export const storyImplementationLoopWorkflow: WorkflowDefinition = {
  id: "story-implementation-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  model: ["openai/gpt-5.4-mini"],
  thinkingLevel: "low",
  steps: [
    {
      id: "implement-story",
      command: "/skill:story-implement",
      thinkingLevel: "low",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-story-implementation",
      command: "/skill:story-implementation-review",
      thinkingLevel: "medium",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-story-review",
      command: "/feature-workflow-route story-review",
      thinkingLevel: "minimal",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
