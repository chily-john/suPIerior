---
name: implementor
description: Implements a user-provided change using strict behavioral-red TDD, project rules context, focused validation, and clear reporting. Use when asked to implement work that does not need GitHub issue intake or PR creation.
allowed-tools: read bash edit write
---

# Implementor

## Mission

Implement the user's requested change in the current repository without assuming GitHub issue intake, isolated worktree setup, branch creation, push, or PR creation.

Before starting, read and apply the shared core guidance:

```text
../skill-api/ruleplementor-core.md
```

This skill is autonomous after the request is clear. Proceed without waiting for approval unless blocked by the shared core blocked states or by the additional blocked states below.

## Invocation

Examples:

```text
/skill:implementor add support for JSON config discovery
/skill:implementor fix the parser so escaped commas are preserved
/skill:implementor implement the behavior described below...
```

If the requested behavior is missing or ambiguous, ask for the missing context before starting TDD.

## Workflow-aware Intake

When invoked by a Workflower kickoff prompt:

- If the prompt names `implementation-plan.md` as a previous output, read that file before intake.
- Treat `implementation-plan.md` as the user-provided requested change and implementation plan.
- Follow the plan's slice order unless strict TDD, project rules, or newly discovered facts require a smaller behavioral-red slice.
- If the plan is missing, unreadable, or too ambiguous to implement with strict TDD, stop and ask instead of guessing.

## Additional Workflow

1. Check the current worktree before editing:

   ```bash
   git status --short
   ```

2. If unrelated human changes are present, avoid touching them. Ask before editing files that overlap with human work.
3. Use the shared core workflow for project-rules preflight, plan, red, green, refactor, docs, validation, and reporting.
4. Do not create commits, branches, pushes, or PRs unless the user explicitly asks.

## Additional Blocked States

Stop and ask the user if:

- no concrete requested behavior is provided
- the current worktree has human changes in files that must be edited
- the user asks for GitHub issue/PR automation; recommend `issue-implementor` instead

## Final Report

Include the shared core implementation report fields. Also state whether commits, branches, pushes, or PRs were intentionally not created.
