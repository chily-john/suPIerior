---
kind: rules
paths:
  - "packages/workflower/extension-src/workflower/workflows/**/*"
summary: Included Workflower workflow definitions shipped with the package.
triggers:
  - feature-to-github-issues
  - included workflow
  - workflow definition
---

# Workflows

Enter here when adding or changing workflow definitions bundled with Workflower itself. Bundled workflows should be small catalog entries that compose commands already provided elsewhere.

## Patterns & Conventions

- Define workflows with `defineWorkflow` and keep step commands/output declarations close to the definition.
- Do not put command implementation logic here; workflow definitions should only describe orchestration.
- The included `feature-to-github-issues` workflow coordinates discovery, issue planning, issue review, and GitHub issue creation commands.
