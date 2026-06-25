---
kind: rules
paths:
  - "packages/architecture/**/*"
summary: Markdown-only Pi skill package for architecture routing, package layout guidance, and skill-suite structure guidance.
triggers:
  - architecture package
  - @supierior/architecture
  - architecture skill
  - ai-navigable folder architecture
  - skill suite architecture
  - supierior package architecture
---

# Architecture Package

Enter here when changing the `@supierior/architecture` Markdown-only Pi skill package, including the architecture routing skill, folder architecture guidance, suPIerior package architecture guidance, or skill-suite architecture guidance.

## Subdirectories

| Directory | When to enter |
| --------- | ------------- |
| `skills/` | Changing registered Pi skills or the architecture reference files bundled with them. |
| `tests/` | Changing package validation for skill frontmatter, package metadata, or bundled reference portability. |

## Package Rules

- Keep this package Markdown-only; it should expose skills through `pi.skills` and should not require a runtime extension.
- Keep `skills/architecture/SKILL.md` as the broad router that decides which specialized architecture skill to read.
- Keep specialized skills useful when copied by directory; include any required architecture reference files beside the specialized skill.
- Do not make the router a giant copied reference. It should route, state the pre-edit structure checklist, and defer to specialized skills.
- Keep descriptions specific enough to auto-load for structural work without firing for ordinary single-file bug fixes.
- If a reference file is copied from `.pi/architecture/`, remove repo-local include syntax such as `@.pi/architecture/...` so the skill package remains portable.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
