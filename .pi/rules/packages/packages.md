---
kind: rules
paths:
  - "packages/**/*"
summary: Workspace package map for monorepo package-level changes.
triggers:
  - workspace package
  - monorepo package
  - packages/architecture
  - packages/experimental-workflows
  - counter workflow
  - counter-loop workflow
  - stateful-grilling workflow
  - packages/pi-rules
  - packages/tui-tools
  - packages/feature-workflow
  - packages/ruleplementor
  - packages/workflower
  - packages/workflower-authoring
  - packages/xtivia-workflows
---

# Packages

Enter here when deciding which workspace package owns a change. Keep `.pi/rules` runtime behavior in `pi-rules`, experimental Workflower playgrounds in `experimental-workflows`, reusable TUI primitives in `tui-tools`, workflow orchestration in `workflower`, and workflow-package authoring guidance in `workflower-authoring`.

## Subdirectories

| Directory            | When to enter                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `architecture/`      | Changing the Markdown-only Pi skill package for architecture routing, AI-navigable folder guidance, package layout guidance, or skill-suite guidance. |
| `experimental-workflows/` | Changing experimental Workflower playground workflows that demonstrate engine patterns, such as counter garden-state handoff loops and stateful-grilling cleared interview loops. |
| `feature-workflow/`  | Changing the Workflower package that turns feature conversations into feature docs, implementation docs, story files, and reviewed story implementations. |
| `pi-rules/`          | Changing `.pi/rules` discovery, injection, commands, skills, package build metadata, or background rule-maintenance behavior. |
| `ruleplementor/`     | Changing strict TDD implementation/review skill workflows, GitHub issue implementation, or PR review guidance.                |
| `tui-tools/`         | Changing reusable Pi TUI question primitives for guided workflow packages.                                                    |
| `workflower/`        | Changing named Pi workflow orchestration, workflow registry APIs, `/wf`, `/wf:<id>`, and `/next` commands, or workflow state/artifacts. |
| `workflower-authoring/` | Changing the standalone skill package that helps agents scaffold Workflower workflow packages. |
| `xtivia-workflows/` | Changing XTIVIA Workflower workflows for WordPress-to-Next.js page migrations, source capture, migration planning, story implementation, or final verification. |
