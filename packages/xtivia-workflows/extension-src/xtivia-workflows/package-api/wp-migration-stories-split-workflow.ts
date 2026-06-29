import type { WorkflowDefinition } from "@supierior/workflower";

export const wpMigrationStoriesSplitWorkflow: WorkflowDefinition = {
  id: "wp-migration-stories-split",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "split-migration-stories",
      command: "/skill:wp-migration-stories-split",
      outputs: ["stories"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-migration-story-loop",
      command: "/xtivia-workflow-route migration-stories",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
