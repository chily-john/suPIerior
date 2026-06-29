import type { WorkflowDefinition } from "@supierior/workflower";

export const wpPageMigrationWorkflow: WorkflowDefinition = {
  id: "wp-page-migration",
  autoNext: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  pollen: [
    "site-info.md",
    "page-capture.md",
    "components/atomic-elements.md",
    "components/global-components.md",
    "components/current-page-components.md",
  ],
  steps: [
    {
      id: "collect-site-info",
      command: "/skill:wp-migration-site-info",
      outputs: ["site-info.md"],
      autoNext: true,
      clearOnNext: false,
    },
    {
      id: "capture-source-page",
      command: "/skill:wp-migration-source-capture",
      // Uses reusable playwright-capture.js script from packages/xtivia-workflows/scripts/
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
      id: "discover-atomic-elements",
      command: "/skill:discover-atomic-elements",
      outputs: ["components/atomic-elements.md"],
      autoNext: true,
      clearOnNext: false,
    },
    {
      id: "refresh-global-component-inventory",
      command: "/skill:refresh-global-component-inventory",
      outputs: ["components/global-components.md"],
      autoNext: true,
      clearOnNext: false,
    },
    {
      id: "identify-page-components",
      command: "/skill:identify-page-components",
      outputs: ["components/current-page-components.md"],
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
