import type { WorkflowDefinition } from "@supierior/workflower";

export const wpMigrationPlanLoopWorkflow: WorkflowDefinition = {
  id: "wp-migration-plan-loop",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  pollen: "implementation-doc.md",
  steps: [
    {
      id: "create-or-improve-migration-plan",
      command: "/skill:wp-migration-plan-create",
      outputs: ["implementation-doc.md", "implementation-doc.original.md"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "review-migration-plan",
      command: "/skill:wp-migration-plan-review",
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "route-migration-plan-review",
      command: "/xtivia-workflow-route migration-plan-review",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
