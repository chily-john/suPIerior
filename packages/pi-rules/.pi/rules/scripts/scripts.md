---
kind: rules
paths:
  - 'scripts/**/*'
summary: Helper scripts used by documentation skills for project reconnaissance.
triggers:
  - scan project script
  - reconnaissance script
  - init advanced scan
---

# Scripts

Enter here when changing helper scripts invoked by skills or package workflows. Scripts should be safe to run from a consuming project root and should avoid producing noisy output that makes agent reconnaissance harder.

### Patterns & Conventions

- Exclude generated, dependency, build, and Pi skill-cache directories from project scans.
- Prefer stable, plain-text output sections that skills can parse or summarize reliably.
