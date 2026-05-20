# @supierior/dev-workflow

Workflow documentation, reusable templates, and future automation hooks for suPIerior development.

This package is intentionally separate from `@supierior/pi-rules`. The rules package remains focused on Pi rule discovery, injection, and maintenance; this package owns repository development workflow guidance.

## Source of truth

GitHub is the source of truth for task and kanban state:

- Issues describe work.
- GitHub Projects v2 tracks board status.
- Pull requests track review, CI, and merge readiness.

Committed per-task YAML files are intentionally deferred to avoid duplicating GitHub state. If agents later need local runtime coordination, that should be designed separately under ignored `.pi/workflow/runtime/` paths.

## Contents

- `docs/github-workflow.md` — issue, branch, PR, review, and CI workflow.
- `docs/project-board.md` — GitHub Project v2 setup and usage.
- `docs/agent-workflow.md` — agent-specific operating checklist.
- `docs/release-versioning.md` — beta release/versioning policy and future Changesets plan.
- `templates/` — reusable issue and PR body templates.
- `schemas/future-task.schema.json` — placeholder schema for any future local task format.
