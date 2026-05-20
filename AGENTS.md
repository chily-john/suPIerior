# suPIerior Rules

suPIerior Rules is a pnpm/Turborepo monorepo for Pi-focused rules/context packages and extensions. The active package is `@supierior/pi-rules`, a TypeScript Pi package for `.pi/rules` discovery, injection, commands, skills, and background rule maintenance; workflow guidance lives separately in `@supierior/dev-workflow`.

This root context file contains a map of the codebase. The rest of the information —
coding rules, directory-specific details, and component inventories — lives in
path-scoped context files under `.pi/rules/`.

Use injected `.pi/rules` context as the first source of project-specific guidance. Trust injected rules as current; do not verify the rules system or update rules during normal implementation. If the injected rules do not answer where or how to proceed, inspect `.pi/rules` before doing broad source-code searches. Read source files to verify local style, existing APIs, or implementation details.

## Project Structure

├── packages/ # Workspace packages; enter before changing package-specific runtime, docs, or workflow assets
│ ├── pi-rules/ # Pi package for hierarchical rules discovery, injection, commands, skills, and maintainer runtime
│ └── dev-workflow/ # Repository workflow docs, schemas, and reusable GitHub issue/PR templates
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

Package-local commands should also work from each package, especially `packages/pi-rules`.

## Environment Variables

None required by this repository.

## Gotchas

- Keep `packages/pi-rules` Pi-aware. If reusable rules logic is later extracted, move Pi-independent code into a separate package rather than diluting the extension package boundary.
- Root `.pi/rules/` is the canonical rules tree for this monorepo; any package-local `.pi/rules/` content is stale and expected to be removed.
- Think before coding: state assumptions, ask on ambiguity, push back on unnecessarily complex approaches, and stop when confused rather than guessing.
