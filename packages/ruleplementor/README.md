# @supierior/ruleplementor

Pi skill package for strict TDD implementation and review workflows that can use project rules context when available.

> Some skills may instruct Pi to run `git` and GitHub CLI commands that create branches, push to `origin`, and open pull requests. Review the skill before installing and use it only in repositories where that behavior is intended.

## What it provides

- `implementor` skill: implements a user-provided change in the current repo using strict behavioral-red TDD. It does not assume GitHub, branch creation, push, or PR creation.
- `reviewer` skill: reviews a working tree, branch, diff, or path and recommends changes without GitHub PR automation.
- `issue-implementor` skill: wraps the core implementation workflow with GitHub issue intake, isolated worktree setup, focused commits, push, and PR creation.
- `pr-reviewer` skill: reviews a GitHub pull request by number or URL using `gh` and recommends changes.
- Public non-skill guidance in `skills/skill-api/ruleplementor-core.md`, referenced by the registered skills.

## Install

```bash
pi install npm:@supierior/ruleplementor
```

Recommended with project rules:

```bash
pi install npm:@supierior/pi-rules@beta
pi install npm:@supierior/ruleplementor
```

Project-local install:

```bash
pi install -l npm:@supierior/ruleplementor
```

Local development:

```bash
pi -e ./packages/ruleplementor
```

## Usage

Implement a direct request:

```text
/skill:implementor add support for JSON config discovery
```

Review local work:

```text
/skill:reviewer review the current branch
```

Implement a GitHub issue and open a PR:

```text
/skill:issue-implementor 123
/skill:issue-implementor https://github.com/owner/repo/issues/123
/skill:issue-implementor implement issue 123
```

Review a GitHub PR:

```text
/skill:pr-reviewer 123
/skill:pr-reviewer https://github.com/owner/repo/pull/123
```

## Assumptions

- All implementation skills require strict behavioral-red TDD before production edits.
- Review skills recommend changes by default and do not edit files unless explicitly asked.
- `issue-implementor` assumes GitHub Issues are the source of truth, `gh` is installed/authenticated, branches are pushed to `origin`, and PRs target `main`.
- `pr-reviewer` assumes `gh` is installed/authenticated and the current repository is the target GitHub repository.
- The package has no hard dependency on `@supierior/pi-rules`, but the skills use injected or on-disk `.pi/rules` context when available.

## Development

This package currently ships Markdown skill resources only. Workspace commands are no-ops so root Turborepo scripts can include the package consistently:

```bash
pnpm --filter @supierior/ruleplementor build
pnpm --filter @supierior/ruleplementor test
pnpm --filter @supierior/ruleplementor typecheck
pnpm --filter @supierior/ruleplementor lint
```
