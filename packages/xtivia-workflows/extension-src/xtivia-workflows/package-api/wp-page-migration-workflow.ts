import type { WorkflowDefinition } from "@supierior/workflower";

export const wpPageMigrationWorkflow: WorkflowDefinition = {
  id: "wp-page-migration",
  clearOnStart: true,
  cleanupOnCompletion: false,
  pollen: ["site-info.md", "page-capture.md"],
  steps: [
    {
      id: "collect-site-info",
      command: "/skill:wp-migration-site-info",
      outputs: ["site-info.md"],
      clearOnNext: false,
    },
    {
      id: "capture-source-page",
      command: "/skill:wp-migration-source-capture",
      outputs: [
        "page-capture.md",
        "capture/source-desktop.png",
        "capture/source-mobile.png",
        "capture/source.html",
        "capture/dom-summary.json",
        "capture/images.json",
      ],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-migration-plan-loop",
      command: "/xtivia-workflow-route start-migration-plan-loop",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
