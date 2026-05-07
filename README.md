# Supierior Rules

Supierior Rules is a monorepo for Pi-focused rules/context packages and extensions.

The name intentionally inserts **pi** into **superior**.

## Packages

- [`@supierior/pi-rules`](./packages/pi-rules) — current Pi package for `.pi/rules` discovery, context injection, commands, skills, and background rule maintenance.

## Planned packages

- `@supierior/rules-engine` — future Pi-independent core rules engine extracted from `@supierior/pi-rules`.
- `@supierior/tui-tools` — future utility functions for making Pi TUI workflows easier to build and manage.
- Reviewer extension package — future Pi reviewer extension that uses the rules injection system.

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
