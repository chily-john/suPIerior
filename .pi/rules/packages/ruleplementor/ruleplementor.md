---
kind: rules
paths:
  - "packages/ruleplementor/**/*"
summary: Strict TDD implementation and review skill package.
triggers:
  - ruleplementor
  - issue-implementor
  - implementor
  - reviewer
  - pr-reviewer
  - tdd implementor
  - github issue implementation skill
---

# Ruleplementor

Pi package that ships Markdown skills for strict TDD implementation and review workflows. Keep V1 lightweight: package metadata, README guidance, shared Markdown guidance, and skill instructions only; do not add extensions, custom tools, or persistent runtime state until orchestration requirements are clearer.

## Subdirectories

| Directory | When to enter                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/` | Editing installable Pi skill workflows for strict TDD implementation, review, branch/PR behavior, validation repair, or platform assumptions. |

## Package Rules

- Keep `@supierior/ruleplementor` publishable and independent of `@supierior/pi-rules`; recommend pairing in docs rather than adding a hard dependency.
- Use descriptive skill names even when the package brand is coined; registered V1 skills include `implementor`, `reviewer`, `issue-implementor`, and `pr-reviewer`.
- Treat GitHub/`gh` as a workflow assumption only for GitHub-specific skills, not as package code or permanent architecture.
- Run issue implementation in an isolated git worktree; do not switch or edit the caller's current checkout.
- Avoid local runtime files; use temporary files only when needed for PR bodies or shell-safe command input.
