---
kind: rules
paths:
  - "packages/dev-workflow/templates/**/*"
summary: Reusable GitHub issue and pull request body templates.
triggers:
  - issue template
  - PR body template
  - pull request template
  - acceptance criteria
---

# Templates

Enter here when changing the reusable issue or PR shapes agents and humans copy into GitHub. Templates should collect enough scope, risk, release-impact, validation, and acceptance-criteria context without becoming heavyweight forms.

### Patterns & Conventions

- Keep acceptance criteria and agent notes available on every issue type.
- PR templates should preserve explicit validation and release-impact sections.
- Avoid adding fields that duplicate GitHub Projects metadata unless they help reviewers immediately.
