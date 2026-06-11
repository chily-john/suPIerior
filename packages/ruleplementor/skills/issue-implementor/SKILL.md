---
name: issue-implementor
description: Implements GitHub issues end-to-end using strict behavioral-red TDD, project rules context, isolated worktrees, validation repair, and autonomous pull request creation. Use when asked to implement a ready GitHub issue.
allowed-tools: read bash edit write
---

# Issue Implementor

## Mission

Implement one ready GitHub issue end-to-end. Fetch issue context, create an isolated worktree and focused branch, apply strict behavioral-red TDD, make logical commits, run validation, repair related failures, push, and open a pull request.

Before implementation work, read and apply the shared core guidance:

```text
../skill-api/ruleplementor-core.md
```

This skill is autonomous after the issue is identified. Proceed without waiting for approval unless blocked by this skill or the shared core guidance.

## Assumptions

- GitHub Issues are the source of truth.
- GitHub CLI (`gh`) is installed and authenticated.
- Branches are pushed to `origin`.
- Pull requests target `main`.
- Issue body, title, labels, and URL are enough for implementation.
- Do not read issue comments by default. If the issue body says critical clarification lives in comments, stop and ask whether to inspect them.
- Do not create persistent local runtime state. Use git history, the PR body, and the Pi session as the audit trail.

## Invocation

Preferred:

```text
/skill:issue-implementor 123
/skill:issue-implementor https://github.com/owner/repo/issues/123
```

Also valid:

```text
/skill:issue-implementor implement issue 123
/skill:issue-implementor fix bug from issue 123, prioritize package-local validation
```

Extract the issue number from a bare number, `#123`, a GitHub issue URL, or freeform text containing one unambiguous issue reference. If no issue is provided or multiple issue references are present, ask which GitHub issue to implement.

## Workflow

### Phase 0 — Preconditions

1. Confirm `gh` is available and authenticated:

   ```bash
   gh auth status
   ```

2. Check for existing work in the caller's current checkout:

   ```bash
   git status --short
   ```

3. If the caller's current checkout is dirty, do not edit it. Continue only by creating an isolated issue worktree. Stop only if the dirty state prevents creating the worktree.

### Phase 1 — Issue Intake

1. Read the issue body, title, labels, and URL. Do not read comments by default.

   ```bash
   gh issue view <issue-number> --json number,title,body,labels,url
   ```

2. Extract the implementation contract from the issue.
3. Assume issues are ready for implementation unless the body is impossible to act on. Do not ask for clarification merely because acceptance criteria are informal.

### Phase 2 — Isolated Worktree and Branch Setup

Create a focused branch in an isolated git worktree instead of switching the caller's current checkout:

- `feature/<issue-number>-short-slug` for feature issues
- `fix/<issue-number>-short-slug` for bug issues
- `chore/<issue-number>-short-slug` for chore issues
- `task/<issue-number>-short-slug` when type is unclear

Then create and enter the issue-specific worktree:

```bash
git fetch origin
mkdir -p ../.ruleplementor-worktrees
git worktree add -b <branch> ../.ruleplementor-worktrees/issue-<issue-number> origin/main
cd ../.ruleplementor-worktrees/issue-<issue-number>
git status --short
```

If the issue-specific worktree path already exists, stop and ask before reusing, deleting, or overwriting it.

From this point forward, perform all file reads, edits, writes, tests, commits, pushes, and PR creation from the issue-specific worktree.

### Phase 3 — Core Implementation

Use `../skill-api/ruleplementor-core.md` for:

- project rules context preflight
- brief plan
- strict behavioral-red TDD
- green implementation
- refactor
- documentation and release artifact decisions
- final validation and scoped repair

The shared core non-negotiable TDD rules apply fully to this skill. Do not edit production or implementation code before a valid compiling/runnable behavioral red.

### Phase 4 — Commit Policy

Use multiple logical commits when they improve reviewability.

Rules:

- Commit coherent review units only.
- Prefer conventional-style commit messages, such as:
  - `test(scope): cover requested behavior`
  - `feat(scope): implement requested behavior`
  - `fix(scope): correct failing behavior`
  - `refactor(scope): simplify implementation`
  - `docs(scope): update usage guidance`
  - `chore(scope): update test configuration`
- Do not create WIP, checkpoint, "fix tests", or "updates" commits.
- Red-test commits are allowed locally to preserve TDD traceability.
- Individual local commits do not need to pass independently.
- Do not push until the final branch state is green or until opening a documented draft PR for broader validation failures.
- Before pushing, review `git log --oneline main..HEAD` and ensure the history is understandable.

### Phase 5 — Push and Pull Request

Before pushing:

1. Run final validation or document why a command could not be completed.
2. Review `git status --short`.
3. Review `git diff --stat main...HEAD` and relevant diffs for unrelated changes.
4. Review `git log --oneline main..HEAD`.
5. Ensure no WIP/checkpoint commits are present.

PR readiness policy:

- If focused tests pass and all required final validation passes, push and open a normal PR.
- If focused tests pass but broader validation still fails after scoped repair attempts, push and open a draft PR that documents the failures and remaining work.
- If focused tests do not pass, do not open a PR unless the user explicitly asked for a diagnostic PR. Stop and report the blocker.

Use a temporary PR body file rather than inline shell quoting. Prefer an OS temp file and clean it up when practical. Read `.github/pull_request_template.md` if present and fill it honestly.

Normal PR example:

```bash
gh pr create --base main --head <branch> --title "<title>" --body-file <temp-pr-body-file>
```

Draft PR example:

```bash
gh pr create --draft --base main --head <branch> --title "<title>" --body-file <temp-pr-body-file>
```

Use `Closes #<issue-number>` in the PR body when the implementation is intended to close the issue. Use `Refs #<issue-number>` for draft/incomplete PRs when appropriate.

Do not remove the issue worktree automatically after opening the PR unless the user explicitly asks.

### Phase 6 — Final Report

Report:

- PR URL
- branch name
- issue worktree path
- issue implemented
- commit summary
- red test command and failure summary
- green test command
- final validation commands and outcomes
- any draft PR blockers or follow-up notes

## Additional Blocked States

Stop and ask the user if:

- no issue number or URL is provided
- multiple issue references are present
- the isolated issue worktree cannot be created
- the issue-specific worktree path already exists and the user has not approved reusing or replacing it
- GitHub CLI/auth is unavailable
- product behavior is impossible to infer from the issue

When blocked on strict TDD, use the shared core blocked-state report format.

## PR Body Requirements

Include:

- Summary of what changed and why
- `Closes #<issue-number>` or `Refs #<issue-number>`
- Changes made
- Validation commands, with checkboxes marked only for commands that passed
- TDD evidence:
  - red command and expected failure summary
  - green command
- Screenshots/logs if relevant
- Release/versioning impact
- Agent notes for reviewers or future agents
- Risk/conflict notes

## Quality Bar

Use the shared core quality expectations. In particular, keep changes issue-scoped, preserve existing behavior unless the issue requires changing it, keep tests behavioral, and document failures honestly.
