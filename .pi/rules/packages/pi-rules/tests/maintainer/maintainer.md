---
kind: rules
paths:
  - 'packages/pi-rules/tests/maintainer/**/*'
summary: Focused tests for maintainer path/activity parsing and aggregation helpers.
triggers:
  - bash path tests
  - git status tests
  - turn activity tests
  - changed files tests
---

# Maintainer Tests

Enter here when changing tests for file activity collected from tools, bash commands, or git status. These tests protect conservative path detection and metadata preservation that background rules maintenance depends on.

### Patterns & Conventions

- Keep tests focused on observable path/activity outputs rather than implementation details.
- Include deletion and rename cases when changing detection behavior.
- Preserve conservative behavior for non-literal shell operands and paths outside the project or under `.pi/`.
