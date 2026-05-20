---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/pi-rules/shared/**/*'
summary: Small cross-module helpers for JSON, project paths, and prompt text normalization.
triggers:
  - shared helper
  - normalize project path
  - text normalization
  - read json file
---

# Shared

Enter here when changing helper behavior used by multiple pi-rules modules. These helpers are intentionally small and defensive because failures here affect commands, events, routing, and maintenance.

### Patterns & Conventions

- Path helpers should keep results inside the project and exclude `.pi/` maintenance paths.
- Text helpers should normalize enough for routing without depending on language-specific parsing.
- JSON helpers should return fallbacks for absent or unreadable state files.
- Keep shared helpers independent of `app/`, `domain/`, `features/`, and `pi/`.
