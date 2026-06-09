---
name: pr-reviewer
description: Reviews a GitHub pull request using gh, project rules context, validation evidence, and actionable severity-ranked findings. Use when asked to review a PR by number or URL.
allowed-tools: read bash
---

# PR Reviewer

## Mission

Review a GitHub pull request and recommend changes. Do not edit files, push commits, or submit GitHub review comments unless the user explicitly asks.

Before starting, read and apply the shared core guidance, especially the review workflow:

```text
../skill-api/ruleplementor-core.md
```

## Assumptions

- GitHub CLI (`gh`) is installed and authenticated.
- The current repository is the target GitHub repository.
- The PR number or URL identifies the review target.

## Invocation

Examples:

```text
/skill:pr-reviewer 123
/skill:pr-reviewer https://github.com/owner/repo/pull/123
/skill:pr-reviewer review PR #123 for rule adherence and test coverage
```

Extract the PR number from a bare number, `#123`, a GitHub PR URL, or freeform text containing one unambiguous PR reference. If no PR is provided or multiple PR references are present, ask which pull request to review.

## Workflow

### Phase 0 — Preconditions

1. Confirm `gh` is available and authenticated:

   ```bash
   gh auth status
   ```

2. Check current worktree state:

   ```bash
   git status --short
   ```

3. Do not overwrite or discard human work.

### Phase 1 — PR Intake

Read PR metadata, commits, changed files, and reviewable diff context:

```bash
gh pr view <pr-number> --json number,title,body,state,author,baseRefName,headRefName,headRepositoryOwner,url,mergeStateStatus,reviewDecision,statusCheckRollup,commits,files
gh pr diff <pr-number> --stat
gh pr diff <pr-number>
```

If the diff is too large to review safely, summarize what was inspected and ask whether to narrow scope.

### Phase 2 — Local Context

Use one of these approaches:

- If the PR branch is already checked out or available locally, review it in place.
- Otherwise, use `gh pr checkout <pr-number>` only when the current worktree is clean or the checkout will not overwrite human work.
- If checkout is unsafe, review from `gh pr view` and `gh pr diff` output only, and report that limitation.

### Phase 3 — Project Rules and Evidence

1. Use injected project rules first.
2. If needed, follow the shared core project-context guidance for changed paths.
3. Inspect nearby tests, docs, package manifests, and implementation patterns as needed.
4. Review PR body validation claims honestly. Do not treat unchecked or unverified claims as passed validation.
5. Run validation only when useful and safe; report exact commands and outcomes if run.

### Phase 4 — Review

Assess:

- whether the PR satisfies its stated requirements
- behavioral test coverage and TDD evidence when available
- relevant project rules and local conventions
- correctness, edge cases, user-facing behavior, and regressions
- validation status and failed checks
- scope control and unrelated changes
- documentation/release impact
- risks to merge readiness

## Blocked States

Stop and ask the user if:

- no PR number or URL is provided
- multiple PR references are present
- GitHub CLI/auth is unavailable
- checkout would overwrite or discard human work
- the PR diff is too large to review without narrowing scope

## Output

Provide:

- PR URL, title, base/head, and author
- context/rules considered
- blocking findings
- recommended findings
- optional findings
- validation reviewed or run
- final recommendation: ready, ready with follow-ups, needs changes, or blocked

If there are no findings in a category, say `None`.
