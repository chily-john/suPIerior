import { defineWorkflow } from "@domain/workflow";

export const featureToGithubIssuesWorkflow = defineWorkflow({
  id: "feature-to-github-issues",
  type: "feature",
  steps: [
    { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
    { id: "plan-issues", command: "/feature-plan-issues", outputs: ["issues.md"] },
    { id: "review-issues", command: "/feature-review-issues", outputs: ["reviewed-issues.md"] },
    { id: "create-github-issues", command: "/github-create-issues" },
  ],
});
