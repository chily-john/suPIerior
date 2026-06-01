---
kind: rules
paths:
  - "packages/ruleplementor/**/*"
summary: Strict TDD GitHub issue implementation skill package.
triggers:
  - ruleplementor
  - issue-implementor
  - tdd implementor
  - github issue implementation skill
---

# Ruleplementor

Pi package that ships Markdown skills for issue implementation workflows. Keep V1 lightweight: package metadata, README guidance, and skill instructions only; do not add extensions, custom tools, or persistent runtime state until orchestration requirements are clearer.

## Subdirectories

| Directory | When to enter                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/` | Editing installable Pi skill workflows for strict TDD implementation, branch/PR behavior, validation repair, or platform assumptions. |

## Package Rules

- Keep `@supierior/ruleplementor` publishable and independent of `@supierior/pi-rules`; recommend pairing in docs rather than adding a hard dependency.
- Use descriptive skill names even when the package brand is coined; `issue-implementor` is the primary V1 skill.
- Treat GitHub/`gh` as a V1 workflow assumption in Markdown, not as package code or permanent architecture.
- Run issue implementation in an isolated git worktree; do not switch or edit the caller's current checkout.
- Avoid local runtime files; use temporary files only when needed for PR bodies or shell-safe command input.
