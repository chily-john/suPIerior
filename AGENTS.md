# suPIerior Rules

suPIerior Rules is a pnpm/Turborepo monorepo for Pi-focused rules/context packages, workflow orchestration packages, and installable Pi skills. Packages are TypeScript Pi extensions unless their package rules say they are Markdown-only skill packages.

This root context file contains a map of the codebase. The rest of the information —
coding rules, directory-specific details, and component inventories — lives in
path-scoped context files under `.pi/rules/`.

Use injected `.pi/rules` context as the first source of project-specific guidance. Trust injected rules as current; do not verify the rules system or update rules during normal implementation. If the injected rules do not answer where or how to proceed, inspect `.pi/rules` before doing broad source-code searches. Read source files to verify local style, existing APIs, or implementation details.

## Project Structure

├── packages/ # Workspace packages; enter before changing package-specific runtime, docs, or workflow assets
│ ├── architecture/ # Markdown-only skill package for architecture routing and AI-navigable structure guidance
│ ├── pi-rules/ # Pi package for hierarchical rules discovery, injection, commands, skills, and maintainer runtime
│ ├── tui-tools/ # Reusable Pi TUI primitives for guided workflow packages
│ ├── workflower/ # Pi package for named workflow orchestration and `/wf` + `/next` commands
│ ├── workflower-authoring/ # Markdown-only skill package for creating Workflower workflow packages
│ ├── experimental-workflows/ # Experimental Workflower playground package for engine-pattern workflows
│ ├── feature-workflow/ # Workflower package for feature ideation, issue drafting, and implementation plans
│ └── ruleplementor/ # Markdown-only strict TDD GitHub issue implementation skill package
├── .changeset/ # Changesets release configuration; enter only for release/versioning workflow changes
├── package.json # Root workspace scripts delegated through Turborepo
├── pnpm-workspace.yaml # Workspace package discovery and pnpm build dependency policy
├── turbo.json # Root task pipeline for build, test, typecheck, lint, and clean
└── tsconfig.base.json # Shared TypeScript compiler baseline

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm clean
pnpm format
pnpm format:check
```

Package-local commands should also work from each package.

## Environment Variables

None required by this repository.

## Gotchas

- Root `.pi/rules/` is the canonical rules tree for this monorepo; package-local `.pi/rules/` content is stale unless explicitly being removed or migrated.
- Keep Pi extension packages Pi-aware. If reusable logic becomes independent of Pi runtime APIs, extract it into a separate package rather than diluting extension boundaries.
- Think before coding: state assumptions, ask on ambiguity, push back on unnecessarily complex approaches, and stop when confused rather than guessing.
