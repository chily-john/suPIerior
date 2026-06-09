---
kind: rules
paths:
  - "packages/ruleplementor/skills/issue-implementor/**/*"
summary: Strict behavioral-red TDD skill for implementing ready GitHub issues and opening PRs.
triggers:
  - issue-implementor
  - implement GitHub issue
  - strict behavioral red
  - autonomous PR creation
---

# Issue Implementor

Edit this skill when changing Ruleplementor's GitHub issue implementation workflow. The skill layers issue intake, isolated worktree setup, commits, push, and PR creation/reporting on top of shared strict behavioral-red TDD guidance.

## Patterns & Conventions

- Do not weaken or bypass the shared non-negotiable rule that production edits require a valid compiling/runnable behavioral red first.
- Keep blocked states explicit so the agent stops for ambiguity, unavailable GitHub auth, impossible red, unsafe worktree reuse, or unrelated validation repair.
- Preserve the distinction between normal PRs and draft PRs when broader validation remains unresolved after focused green.
- PR body guidance must require honest validation checkboxes and TDD evidence.
