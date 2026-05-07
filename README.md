# suPIerior Rules

suPIerior Rules is a monorepo for Pi-focused rules/context packages and extensions.

The brand name intentionally inserts **PI** into **superior**. Published package names use the lowercase npm scope `@supierior` because npm package names/scopes should remain lowercase.

## Packages

- [`@supierior/pi-rules`](./packages/pi-rules) — current Pi package for `.pi/rules` discovery, context injection, commands, skills, and background rule maintenance.

## Planned packages

- `@supierior/rules-engine` — future Pi-independent core rules engine extracted from `@supierior/pi-rules`.
- `@supierior/tui-tools` — future utility functions for making Pi TUI workflows easier to build and manage.
- `@supierior/rulviewer` — future rules-aware code reviewer that uses the rules injection system.

## Development

This repo uses pnpm workspaces and Turborepo.

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Each package is intended to remain independently buildable and publishable:

```bash
cd packages/pi-rules
pnpm build
pnpm test
```
