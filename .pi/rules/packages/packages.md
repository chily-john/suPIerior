---
kind: rules
paths:
  - "packages/**/*"
summary: Workspace package map for monorepo package-level changes.
triggers:
  - workspace package
  - monorepo package
  - packages/pi-rules
  - packages/tui-tools
  - packages/feature-workflow
  - packages/ruleplementor
  - packages/workflower
  - packages/workflower-authoring
---

# Packages

Enter here when deciding which workspace package owns a change. Keep `.pi/rules` runtime behavior in `pi-rules`, reusable TUI primitives in `tui-tools`, workflow orchestration in `workflower`, and workflow-package authoring guidance in `workflower-authoring`.

## Subdirectories

| Directory            | When to enter                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `feature-workflow/`  | Changing the Workflower package that turns feature ideas into reviewed GitHub issues or implementation plans, plus counter handoff tests. |
| `pi-rules/`          | Changing `.pi/rules` discovery, injection, commands, skills, package build metadata, or background rule-maintenance behavior. |
| `ruleplementor/`     | Changing strict TDD implementation/review skill workflows, GitHub issue implementation, or PR review guidance.                |
| `tui-tools/`         | Changing reusable Pi TUI question primitives for guided workflow packages.                                                    |
| `workflower/`        | Changing named Pi workflow orchestration, workflow registry APIs, `/wf`, `/wf:<id>`, and `/next` commands, or workflow state/artifacts. |
| `workflower-authoring/` | Changing the standalone skill package that helps agents scaffold Workflower workflow packages. |
