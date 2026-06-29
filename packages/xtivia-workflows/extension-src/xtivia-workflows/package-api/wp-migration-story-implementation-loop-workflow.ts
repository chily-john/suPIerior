import type { WorkflowDefinition } from "@supierior/workflower";

export const wpMigrationStoryImplementationLoopWorkflow: WorkflowDefinition = {
  id: "wp-migration-story-implementation-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "implement-migration-story",
      command: "/skill:wp-migration-story-implement",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-migration-story",
      command: "/skill:wp-migration-story-review",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-migration-story-review",
      command: "/xtivia-workflow-route migration-story-review",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
