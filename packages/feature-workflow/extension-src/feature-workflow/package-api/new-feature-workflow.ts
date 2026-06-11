import type { WorkflowDefinition } from "@supierior/workflower";

export const newFeatureWorkflow: WorkflowDefinition = {
  id: "new-feature",
  cleanupOnCompletion: true,
  steps: [
    {
      id: "grill",
      command: "/skill:new-feature-grill",
      clearOnNext: false,
    },
    {
      id: "summary",
      command: "/skill:new-feature-summary",
      outputs: ["feature-summary.md"],
      autoNext: true,
    },
    {
      id: "convert-to-issues-prep",
      command: "/skill:new-feature-convert-to-issues-prep",
      outputs: ["issues.md"],
      autoNext: true,
    },
    {
      id: "review-issues",
      command: "/skill:new-feature-review-issues",
      outputs: ["issues.md"],
      autoNext: true,
    },
    {
      id: "publish-issues",
      command: "/skill:new-feature-publish-issues",
      autoNext: true,
    },
  ],
};

export const ReviewLoop: WorkflowDefinition = {
  id: "review-loop",
  cleanupOnCompletion: true,
  steps: [
    {
      id: "implement",
      command: "/skill:implement",
      autoNext: true,
    },
    {
      id: "review-and-rate",
      command: "/skill:review-and-rate",
      outputs: ["rating.md"],
      autoNext: true,
    },
    {
      id: "scoot-or-loop",
      command: "/skill:scoot-or-loop",
      autoNext: true,
    },
  ],
};

/**
 * Sample scoot-or-loop skill:
 *
 * review the prodived file.
 *
 * if the rating in the file is below a 4 than call
 *
 * /wf:review-loop <some-way-to-indicate-it's-a-loop>
 *
 * otherwise do nothing
 *
 * (or it could call another workflow here)
 */

// Chase - you need to figure out how should the folder management look for child workflows
// Essentially the handoff needs to be frictionless

// We will keep the rule where there is only one active workflow allowed in a session at a time
// if you call another workflow, it completes the current one, and uses the most recent output as the input to the new workflow...
// This allows mid workflow exits (the most likely use case would be an error situation)

// When starting a wf,
// if there is already an active one,
// then it stops it and starts itself, (We could include a flag in a workflow, to use previous output)
// the new workflow uses the output from the previous workflow to
//
// Then we'll change the workflow structure to have flowers and gardens (a workflow is a flower) a series of workflows is a garden
// each flower will have an index file, everytime a new output is generated the index is updated to export that output
// unless in the flower definition a particular output is set to be the permanent output (pollen)
//
// We need a way to define a permanent input for a workflow potentially
// (some way for the reviewer to look back at the original implementation plan...) (Maybe we don't need that, we only need it to look at the changed files, and then update according to the review...)
// (the review actually may be the one that needs the original implmentation plan - or plan goal)
//
// The core is how do we manage the folder structure and file passing - multiple file input passings...
// We could reference other flowers, and say that it will expect their pollen

// That all means that the folder naming needs a type-number(the order of creation)
//
// Then wf: command if it's creating a brand new garden it will set up a new folder with the name the user used
// then for each workflow that it starts in that garden, it will create it's own folder with an index file with exporting it's pollen
//
// Then if you call the wf: workflow without a name, and when there is an active garden, it will create it with the sequence number, and then the id of the workflow
//
// Then we'll expose some cleaning commands for /wf so that the user can clean up afterwards, or even add a final clean up workflow...
//
