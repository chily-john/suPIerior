---
name: issue-implementor
description: Implements GitHub issues end-to-end using strict behavioral-red TDD, project rules context, validation repair, and autonomous pull request creation. Use when asked to implement a ready GitHub issue.
allowed-tools: read bash edit write
---

# Issue Implementor

## Mission

Implement one ready GitHub issue end-to-end. Use strict behavioral-red TDD, respect project rules, create a focused branch, make logical commits, run validation, repair related failures, push, and open a pull request.

This skill is autonomous: after the initial invocation, proceed without waiting for approval unless blocked by one of the explicit blocked states below.

## V1 Assumptions

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

## Non-Negotiable Rules

- Do not edit production or implementation code before valid behavioral red.
- A valid red state must be a compiling/runnable behavioral test failure that demonstrates the requested behavior is missing, incorrect, or regressed.
- TypeScript errors, missing imports, missing exports, syntax errors, test framework setup failures, environment failures, and unrelated failures do not count as valid red.
- You may create or modify test files, fixtures, mocks, snapshots, helpers, and test configuration before red when needed to produce a meaningful behavioral test.
- Do not add production APIs, exports, classes, or functions before valid red just to make a test compile.
- If valid behavioral red is not possible, stop and ask the user. Do not proceed to production edits.
- Keep scope tied to the issue. Do not perform unrelated cleanup.
- Ask before discarding or overwriting human work.

## Workflow

### Phase 0 — Preconditions

1. Confirm `gh` is available and authenticated when needed:

   ```bash
   gh auth status
   ```

2. Check for existing work:

   ```bash
   git status --short
   ```

3. If the worktree is dirty, stop and ask unless the user explicitly allowed continuing or the dirty files are clearly unrelated/generated.

### Phase 1 — Issue Intake

1. Read the issue body, title, labels, and URL. Do not read comments by default.

   ```bash
   gh issue view <issue-number> --json number,title,body,labels,url
   ```

2. Extract the implementation contract from the issue.
3. Assume issues are ready for implementation unless the body is impossible to act on. Do not ask for clarification merely because acceptance criteria are informal.

### Phase 2 — Branch Setup

Create a branch from up-to-date `main`:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

Create a focused branch:

- `feature/<issue-number>-short-slug` for feature issues
- `fix/<issue-number>-short-slug` for bug issues
- `chore/<issue-number>-short-slug` for chore issues
- `task/<issue-number>-short-slug` when type is unclear

### Phase 3 — Project Rules Context Preflight

1. Treat injected project rules as authoritative.
2. If relevant `.pi/rules` context was injected, use it and do not inspect the rules tree broadly.
3. If no relevant rules were injected, or likely touched paths become clear only after reconnaissance:
   - identify likely files or directories to touch
   - if `.pi/rules/` exists, read only the matching `.pi/rules/**/*.md` files needed for those paths
   - read parent rules when needed to avoid missing cross-cutting constraints
4. If no `.pi/rules/` system exists, continue using normal project context files such as `AGENTS.md`, README files, package manifests, and nearby tests.
5. Do not edit production files until this context check is complete.
6. Do not manually update `.pi/rules` during implementation unless the user explicitly asks. A separate rules maintainer may run after the turn when `@supierior/pi-rules` is installed.

### Phase 4 — Brief Plan

Before creating the red test, state a concise plan with:

- issue summary
- likely package/files
- relevant project rules loaded
- test file/behavior to cover
- expected behavioral red
- focused test command
- final validation commands likely to run

Do not wait for approval unless blocked.

### Phase 5 — Strict TDD Red

1. Discover test conventions from nearby tests and relevant `package.json` scripts.
2. Create or modify the smallest meaningful behavioral test for the issue.
3. Create test fixtures, mocks, helpers, or test configuration as needed, following existing project conventions.
4. Run the focused test command.
5. Confirm valid behavioral red:
   - the test file compiles/parses
   - the focused test command runs
   - the relevant test fails at an assertion, expectation, snapshot mismatch, or equivalent behavioral check
   - the failure demonstrates the requested behavior is missing, incorrect, or regressed

If the new test cannot reach behavioral red because of test setup, fix test setup without editing production behavior. If that is not possible, stop and ask.

### Phase 6 — Green Implementation

1. Make the minimal production change needed to pass the red test.
2. Run the focused test command.
3. Iterate until the focused test passes.
4. If a new missing behavior emerges, return to Phase 5 and add or adjust a behavioral test before implementing it.

### Phase 7 — Refactor

Only refactor after focused tests are green. Keep refactors issue-scoped and re-run focused tests after refactoring.

### Phase 8 — Commit Policy

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

### Phase 9 — Documentation and Release Artifacts

Update user-facing docs when:

- the issue acceptance criteria require it
- behavior or API changes would make existing docs incorrect
- repository rules for the touched path require docs updates

Do not create or modify release/versioning artifacts unless:

- the issue explicitly requests it
- repository rules require it
- package policy clearly requires it for this kind of change

If unsure whether a changeset or release note is needed, mention it in the PR under release/versioning impact instead of inventing one.

### Phase 10 — Final Validation and Repair

Discover validation commands before running them:

1. Inspect the nearest relevant `package.json`.
2. Inspect the root `package.json` when working in a workspace.
3. Prefer focused package/file-level test commands during TDD.
4. Prefer repository-standard validation before PR.

When scripts exist, final validation should include the relevant focused tests and repository-standard commands. For this repository shape, that usually means:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
```

Never mark a PR template checkbox unless the exact command was run and passed.

If final validation fails:

1. Determine whether each failure is related to this branch's changes.
2. Fix related failures.
3. Re-run the failed command after each fix.
4. Do not fix unrelated pre-existing failures unless the user explicitly asks.
5. Stop repairing when:
   - the same command fails for the same reason after a fix attempt
   - fixing requires unrelated cleanup
   - fixing requires product/design clarification
   - fixing would significantly expand scope
   - the remaining failure appears pre-existing on `main`

After behavioral green, validation fixes may touch production code only to correct issues introduced by the implementation, such as type errors, lint violations, build failures, broken imports/exports, or formatting. Do not expand feature scope during validation repair.

### Phase 11 — Push and Pull Request

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

### Phase 12 — Final Report

Report:

- PR URL
- branch name
- issue implemented
- commit summary
- red test command and failure summary
- green test command
- final validation commands and outcomes
- any draft PR blockers or follow-up notes

## Blocked States

Stop and ask the user if:

- no issue number or URL is provided
- multiple issue references are present
- the worktree is dirty and not clearly safe to proceed
- GitHub CLI/auth is unavailable
- valid behavioral red cannot be created or observed
- production edits would be required before valid behavioral red
- fixing validation would require unrelated cleanup or significant scope expansion
- product behavior is impossible to infer from the issue

When blocked on strict TDD, report:

1. behavior that needs testing
2. test surface you inspected or created
3. why strict TDD is blocked
4. recommended options, such as creating a new test harness, authorizing a one-time implementation-first exception, or clarifying expected behavior

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

- Prefer small, issue-focused changes.
- Prefer existing project patterns over new abstractions.
- Preserve existing behavior unless the issue requires changing it.
- Keep tests behavioral, not implementation-detail-heavy.
- Do not claim success unless commands were actually run and passed.
- Do not hide failures; document them clearly in draft PRs and final reports.
