---
kind: rules
paths:
  - "packages/pi-rules/scripts/**/*"
summary: Helper scripts used by documentation skills and package validation.
triggers:
  - scan project script
  - reconnaissance script
  - dependency cruiser config
  - lint deps
---

# Scripts

Enter here when changing helper scripts invoked by skills or package workflows. Scripts should be safe to run from a consuming project root and avoid noisy output that makes agent reconnaissance harder.

### Patterns & Conventions

- Exclude generated, dependency, build, and Pi skill-cache directories from project scans.
- Prefer stable, plain-text output sections that skills can parse or summarize reliably.
- Keep dependency-cruiser boundaries aligned with the extension architecture layers.
