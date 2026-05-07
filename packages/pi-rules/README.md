# @supierior/pi-rules

Pi package for creating and maintaining project-specific rules under `.pi/rules/`.

## What it provides

- `init-advanced` skill: bootstraps `AGENTS.md` and `.pi/rules/**/*.md` for a project.
- hidden `rules-maintainer` skill: loaded with `disable-model-invocation: true`, so it is available to commands/background events but hidden from normal model skill discovery.
- `pi-rules` extension: provides Pi commands, status tooling, and turn-scoped rule injection.

## Commands

- `/pi-rules:init` — invoke the `init-advanced` skill.
- `/pi-rules:maintain <changed-file> [more-files...]` — manually run the hidden `rules-maintainer` skill in the background.
- `/pi-rules:status` — inspect discovered `AGENTS.md` and `.pi/rules` files.
- `/pi-rules:context` — show which rules were injected for the last turn.
- `/pi-rules:maintainer-status` — show background maintainer PID, lock, and queue status.
- `/pi-rules:maintainer-log` — show the tail of `.pi/.pi-rules/maintainer.log`.
- `/pi-rules:maintainer-kill` — terminate a stuck maintainer process, clear its lock, and start the next queued batch if present.

## Context injection behavior

The extension indexes `.pi/rules/**/*.md` and uses rule metadata to inject relevant context at the start of a turn.

Rules files should use:

```yaml
---
kind: rules
paths:
  - 'src/path/**/*'
summary: One sentence routing summary.
triggers:
  - natural language task phrase
---
```

Inventory files should live beside rules as `inventory.md` and use `kind: inventory`. Inventories are discoverable and listed when relevant, but are not injected by default.

Current injection policy:

- inject the most-specific matching child rule fully
- include parent rules as summaries only
- list sibling inventories as available
- skip injection when the prompt does not look code-edit/code-navigation related

## Background maintenance

The extension tracks successful built-in `write` and `edit` tool calls during a main-agent turn, plus common successful `bash` removals and renames. It also compares `git status --porcelain` at `agent_start`/`agent_end` to catch git-visible changed, deleted, and renamed files from shell commands. On `agent_end`, it starts a separate non-interactive Pi process with the hidden `rules-maintainer` skill and the detected path list.

Maintenance state is written under `.pi/.pi-rules/`:

- `queue.json` — pending changed-file batches
- `maintainer.log` — background process output
- `maintainer.lock` — legacy lock state used for compatibility/stale-run recovery
- `active-runs.json` — active maintainer run metadata used for non-overlapping concurrent batches

If a conflicting maintainer is already running, new batches are appended to `queue.json` instead of skipped. When an active maintainer exits, the extension starts queued batches whose protected rule scopes do not overlap.

If a maintainer gets stuck, use `/pi-rules:maintainer-status`, `/pi-rules:maintainer-log`, and `/pi-rules:maintainer-kill`.

The maintainer uses `disable-model-invocation: true`, so it is not exposed in the model's normal available-skills prompt. It should only run via `/pi-rules:maintain`, direct `/skill:rules-maintainer`, or extension background events.

## Package structure

```text
pi-rules/
├── package.json
├── tsup.config.ts           # builds dist/ package and Pi extension artifacts
├── dist/
│   ├── index.js             # CommonJS package entry
│   ├── index.mjs            # ESM package entry
│   ├── index.d.ts           # public declarations
│   └── extensions/
│       └── pi-rules.js    # bundled Pi extension entry loaded by Pi
├── extension-src/
│   └── pi-rules/          # domain-oriented extension implementation
│       ├── app/             # config and runtime state
│       ├── pi/              # Pi commands, events, tools, and UI adapters
│       ├── domain/          # foundational rule-context discovery/routing/injection
│       ├── features/        # operational workflows such as rule maintenance
│       └── shared/          # low-level utilities
├── skills/
│   ├── init-advanced/
│   │   ├── SKILL.md
│   │   └── assets/
│   └── rules-maintainer/
│       └── SKILL.md
└── scripts/
    └── scan_project.sh
```

## Development

This package is currently published/tested as a beta prerelease. Build the bundled runtime before loading it locally with Pi:

```bash
pnpm install
pnpm build
```

Run focused maintainer parser/helper tests and dependency-boundary checks with:

```bash
pnpm test
pnpm lint:deps
```

Architectural boundaries are enforced with dependency-cruiser: `shared` cannot depend on higher layers, `domain` cannot depend on `features` or `pi`, and `features` cannot depend on `pi`.

Manual validation steps for maintainer removal/rename behavior are documented in `docs/manual-validation-maintainer-removals.md`.

## Install locally while developing

From another project, after running `pnpm build` in this package:

```bash
pi install -l /absolute/path/to/packages/pi-rules
```

Or test temporarily:

```bash
pi -e /absolute/path/to/packages/pi-rules
```

When published as a beta npm package, install with:

```bash
pi install npm:@supierior/pi-rules@beta
```
