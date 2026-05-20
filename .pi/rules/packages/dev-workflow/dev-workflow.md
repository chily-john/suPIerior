---
kind: rules
paths:
  - 'packages/dev-workflow/**/*'
summary: Repository collaboration workflow documentation and reusable GitHub templates.
triggers:
  - dev workflow
  - GitHub workflow
  - issue template
  - PR template
  - project board
  - release versioning
---

# Dev Workflow

This package owns repository process documentation, not Pi extension behavior. GitHub Issues, Projects v2, PRs, and CI are the intended source of truth; committed task YAML is deferred unless local runtime coordination is designed later.

### Patterns & Conventions

- Do not add workflow command behavior to `@supierior/pi-rules`.
- Prefer lightweight GitHub-native coordination over duplicated local state.
- Keep package scripts no-op until real automation exists.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `docs/` | Changing agent operating checklists, GitHub collaboration flow, project-board guidance, or release/version policy. |
| `schemas/` | Designing future local task coordination formats while preserving GitHub as the current source of truth. |
| `templates/` | Updating reusable issue or pull request body templates. |
