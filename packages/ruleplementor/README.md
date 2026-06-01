# @supierior/ruleplementor

Pi skill package for implementing ready GitHub issues with strict TDD, project rules context, validation repair, and autonomous pull request creation.

> This skill may instruct Pi to run `git` and GitHub CLI commands that create branches, push to `origin`, and open pull requests. Review the skill before installing and use it only in repositories where that behavior is intended.

## What it provides

- `issue-implementor` skill: implements a GitHub issue end-to-end using strict behavioral-red TDD.

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

```text
/skill:issue-implementor 123
/skill:issue-implementor https://github.com/owner/repo/issues/123
/skill:issue-implementor implement issue 123
```

## V1 assumptions

- GitHub Issues are the source of truth.
- GitHub CLI (`gh`) is installed and authenticated.
- Branches are pushed to `origin`.
- Pull requests target `main`.
- The issue body is ready for implementation; comments are not read by default.
- The package has no hard dependency on `@supierior/pi-rules`, but uses injected or on-disk `.pi/rules` context when available.

## Development

This package currently ships Markdown skill resources only. Workspace commands are no-ops so root Turborepo scripts can include the package consistently:

```bash
pnpm --filter @supierior/ruleplementor build
pnpm --filter @supierior/ruleplementor test
pnpm --filter @supierior/ruleplementor typecheck
pnpm --filter @supierior/ruleplementor lint
```
