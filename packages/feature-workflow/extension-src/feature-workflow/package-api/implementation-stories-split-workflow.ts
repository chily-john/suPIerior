import type { WorkflowDefinition } from "@supierior/workflower";

export const implementationStoriesSplitWorkflow: WorkflowDefinition = {
  id: "implementation-stories-split",
  userInvocable: false,
  modelInvocable: true,
  clearOnStart: true,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "split-implementation-stories",
      command: "/skill:implementation-stories-split",
      outputs: ["stories"],
      autoNext: true,
      clearOnNext: true,
    },
    {
      id: "start-story-implementation-loop",
      command: "/feature-workflow-route stories",
      autoNext: true,
      clearOnNext: true,
    },
  ],
};
