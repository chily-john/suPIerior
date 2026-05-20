# GitHub workflow

GitHub Issues, GitHub Projects v2, pull requests, and CI are the canonical collaboration workflow for suPIerior.

## Issues

Create issues for feature, bug, and chore work. Use the repository issue templates and include acceptance criteria plus any useful agent notes. Labels are helpful but not required before work starts.

Recommended labels include `type:feature`, `type:bug`, `type:chore`, `agent-ready`, `needs-review`, `risk:conflict`, release-impact labels, and package labels.

## Branches

Create branches from an up-to-date `main`.

Recommended names:

```text
feature/<issue-number>-short-slug
fix/<issue-number>-short-slug
chore/<issue-number>-short-slug
task/<issue-number>-short-slug
```

Before starting:

```bash
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
```

If the worktree is dirty, ask before proceeding unless the dirty files are clearly generated or the user explicitly says to continue.

## Pull requests

All changes to `main` should go through PRs. Use the PR template and link issues with `Closes #123` or `Refs #123` where appropriate.

Recommended PR title style:

```text
feat(scope): summary
fix(scope): summary
chore(scope): summary
```

Strict conventional commits are not enforced initially.

## Review policy

`main` should require:

- A pull request before merging.
- At least one approval.
- Code owner review from `@chily-john`.
- Passing CI checks for `typecheck`, `lint`, and `build`.

`.github/CODEOWNERS` assigns all files to `@chily-john`.

## CI

The repository CI workflow runs on PRs to `main` and pushes to `main`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
```

Tests are valuable, but are intentionally not required as a blocking check yet.
