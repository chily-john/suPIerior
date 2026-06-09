---
name: reviewer
description: Reviews a user-provided change, branch, diff, or working tree against requirements, project rules, tests, validation, and maintainability. Use when asked to review code without GitHub PR automation.
allowed-tools: read bash edit write
---

# Reviewer

## Mission

Review the requested target and recommend changes. Do not edit files unless the user explicitly asks for fixes or a Workflower kickoff prompt explicitly expects an implementation review that updates the working tree.

Before starting, read and apply the shared core guidance, especially the review workflow:

```text
../skill-api/ruleplementor-core.md
```

## Invocation

Examples:

```text
/skill:reviewer review the current branch
/skill:reviewer review my working tree against this requirement: ...
/skill:reviewer review changes in packages/foo
```

If no review target is provided, ask whether to review the current working tree, current branch, or a specific path.

## Workflow-aware Intake

When invoked by a Workflower kickoff prompt:

- If the prompt names `implementation-plan.md` as a previous output, read that file and review the current working tree against it.
- If the prompt declares `implementation-review.md` as an expected output, write the review report to that file at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
- For this workflow mode only, fix blocking and clearly safe recommended findings after recording them, then update `implementation-review.md` with the fixes made and remaining risks. Do not make speculative or scope-expanding fixes.
- If the implementation plan is missing, unreadable, or too ambiguous to evaluate, stop and ask instead of guessing.

## Workflow

1. Identify the review target and expected behavior.
2. Inspect worktree state and available diff context:

   ```bash
   git status --short
   git diff --stat
   git diff
   ```

   For branch reviews, also inspect the merge-base comparison, for example:

   ```bash
   git diff --stat main...HEAD
   git diff main...HEAD
   ```

3. Use injected project rules first. If needed, follow the shared core project-context guidance for relevant touched paths.
4. Inspect nearby tests, docs, package scripts, and implementation patterns as needed.
5. Review for correctness, rule adherence, behavioral coverage, validation evidence, scope control, documentation impact, and maintainability.
6. Do not run expensive validation unless it is necessary and proportionate. If commands are run, report exact outcomes.

## Output

Provide:

- review target
- context/rules considered
- blocking findings
- recommended findings
- optional findings
- validation reviewed or run
- final recommendation

If there are no findings in a category, say `None`.
