# suPIerior Rules

Monorepo for suPIerior Pi rules extensions and packages.

## Structure

- `packages/pi-rules` — current Pi package/extension for `.pi/rules` context discovery, injection, commands, skills, and background rule maintenance.
- Future `packages/rules-engine` — Pi-independent core rules engine extracted from `pi-rules`.
- Future `packages/tui-tools` — utility functions for making Pi TUI workflows easier to build and manage.
- Future `packages/rulviewer` — rules-aware code reviewer package that uses the rules injection system.

## Development commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Package-local commands should also work from within each package.

## Architectural direction

Keep `packages/pi-rules` Pi-aware. When extracting reusable core logic later, move Pi-independent rules functionality into a separate `@supierior/rules-engine` package and have Pi packages depend on it.
