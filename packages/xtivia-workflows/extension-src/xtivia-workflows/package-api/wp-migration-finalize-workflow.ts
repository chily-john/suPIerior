import type { WorkflowDefinition } from "@supierior/workflower";

export const wpMigrationFinalizeWorkflow: WorkflowDefinition = {
  id: "wp-migration-finalize",
  autoNext: true,
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "finalize-migration",
      command: "/skill:wp-migration-finalize",
      outputs: [
        "final-report.md",
        "verification/target-desktop.png",
        "verification/target-mobile.png",
        "rules-maintenance-suggestions.md",
      ],
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
