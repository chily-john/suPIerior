---
kind: rules
paths:
  - 'packages/**/*'
summary: Workspace package map for monorepo package-level changes.
triggers:
  - workspace package
  - monorepo package
  - packages/pi-rules
  - packages/dev-workflow
  - packages/tui-tools
  - packages/feature-flow
  - packages/kanban-converters
---

# Packages

Enter here when deciding which workspace package owns a change. Keep runtime Pi extension work in `pi-rules`; keep repository collaboration and process documentation in `dev-workflow`.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `dev-workflow/` | Editing GitHub workflow docs, project-board guidance, release policy, schemas, or reusable issue/PR templates. |
| `feature-flow/` | Changing the `/feature` guided discovery workflow or its generated feature/plan artifacts. |
| `kanban-converters/` | Changing reusable kanban conversion contracts or built-in GitHub issue publishing for feature workflows. |
| `pi-rules/` | Changing `.pi/rules` discovery, injection, commands, skills, package build metadata, or background rule-maintenance behavior. |
| `tui-tools/` | Changing reusable Pi TUI question primitives for guided workflows. |
