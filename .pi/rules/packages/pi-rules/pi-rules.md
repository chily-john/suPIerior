---
kind: rules
paths:
  - 'packages/pi-rules/**/*'
summary: Pi package for `.pi/rules` discovery, injection, commands, skills, and background maintenance.
triggers:
  - pi-rules package
  - @supierior/pi-rules
  - hierarchical rules
  - rules injection
  - background maintainer
---

# Pi Rules Package

This package is the Pi-aware implementation for hierarchical project rules. The bundled runtime is built from `extension-src/pi-rules/`; skills and scripts support creating and maintaining documentation in consuming projects.

### Patterns & Conventions

- Keep `dist/`, `.turbo/`, and package-local `.pi/rules/` out of source-of-truth edits.
- Build before testing local installation with `pi install -l` or `pi -e`.
- Dependency boundaries are enforced by dependency-cruiser: `shared` cannot import higher layers, `domain` cannot import `features` or `pi`, and `features` cannot import `pi`.
- Treat package-local `.pi/rules/` as stale; root `.pi/rules/` is canonical for this monorepo.

## Subdirectories

| Directory        | When to enter                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `extension-src/` | Changing TypeScript extension runtime behavior.                                             |
| `scripts/`       | Changing reconnaissance or package helper scripts used by skills/workflows.                 |
| `skills/`        | Changing Pi skills that bootstrap or maintain rules documentation.                          |
| `tests/`         | Updating Vitest coverage for maintainer parsing, git-status, and activity tracking helpers. |
