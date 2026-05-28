---
kind: rules
paths:
  - "packages/dev-workflow/docs/**/*"
summary: Human and agent workflow guidance for GitHub, projects, PRs, and beta releases.
triggers:
  - agent workflow
  - GitHub issue workflow
  - GitHub Projects v2
  - release policy
  - changeset policy
---

# Workflow Docs

Enter here when changing how contributors and agents coordinate work. These docs define the expected GitHub-first process, branch/PR flow, validation checklist, project board states, and beta release policy.

### Patterns & Conventions

- Keep GitHub Issues/Projects/PRs as canonical state; do not introduce committed per-task records here.
- Agent guidance should tell agents to check for dirty worktrees and ask before overwriting human changes.
- Include a changeset only for user-facing package behavior, APIs, commands, or documented behavior that belongs in a changelog.
- Do not imply npm publishing is enabled without explicit approval.
- Keep owner-authored PRs mergeable after CI while `@chily-john` is the only collaborator.
