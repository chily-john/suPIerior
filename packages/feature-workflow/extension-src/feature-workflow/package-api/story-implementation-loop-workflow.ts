import type { WorkflowDefinition } from "@supierior/workflower";

export const storyImplementationLoopWorkflow: WorkflowDefinition = {
  id: "story-implementation-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "implement-story",
      command: "/skill:story-implement",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-story-implementation",
      command: "/skill:story-implementation-review",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-story-review",
      command: "/feature-workflow-route story-review",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
