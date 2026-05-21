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
---

# Packages

Enter here when deciding which workspace package owns a change. Keep runtime Pi extension work in `pi-rules`; keep repository collaboration and process documentation in `dev-workflow`.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `dev-workflow/` | Editing GitHub workflow docs, project-board guidance, release policy, schemas, or reusable issue/PR templates. |
| `pi-rules/` | Changing `.pi/rules` discovery, injection, commands, skills, package build metadata, or background rule-maintenance behavior. |
