---
kind: rules
paths:
  - "packages/ruleplementor/skills/**/*"
summary: Installable Ruleplementor skills for strict-TDD implementation and review workflows.
triggers:
  - ruleplementor skills
  - implementor skill
  - reviewer skill
  - issue-implementor skill
  - pr-reviewer skill
  - strict TDD skill
  - GitHub issue implementation
---

# Skills

Enter here when editing Ruleplementor Markdown skill workflows or shared skill guidance. Some skills may instruct Pi to run GitHub and git commands, so changes should preserve explicit blocked states and safety checks.

## Subdirectories

| Directory            | When to enter                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `implementor/`       | Changing direct-request implementation workflow without GitHub issue or PR automation.               |
| `issue-implementor/` | Changing the end-to-end GitHub issue implementation workflow, TDD policy, validation, or PR behavior. |
| `pr-reviewer/`       | Changing GitHub PR review workflow, `gh` intake, checkout safety, validation, or recommendations.    |
| `reviewer/`          | Changing local branch, diff, worktree, or path review workflow without GitHub PR automation.         |
| `skill-api/`         | Changing shared Ruleplementor implementation/review guidance consumed by registered skills.          |

## Package Rules

- Keep skill prompts self-contained and honest about assumptions such as `gh`, `origin`, and `main`.
- Preserve isolated worktree behavior for `issue-implementor`; direct-request and review skills should not create branches, pushes, or PRs unless explicitly asked.
- `implementor` and `reviewer` may be invoked by Workflower with `implementation-plan.md`; keep their artifact intake explicit and non-guessing.
- In Workflower review mode, `reviewer` writes `implementation-review.md` and may fix only blocking or clearly safe recommended findings.
- Keep shared guidance in `skill-api/ruleplementor-core.md`; registered skill files should layer intake, GitHub, branch, PR, artifact, or reporting workflow on top.
- Do not add persistent runtime state to skill workflows.
