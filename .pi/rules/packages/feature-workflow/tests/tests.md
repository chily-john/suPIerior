---
kind: rules
paths:
  - "packages/feature-workflow/tests/**/*"
summary: Feature-workflow tests for package loading and workflow registration.
triggers:
  - feature-workflow tests
  - new-feature workflow test
  - take-it-away workflow test
  - feature-workflow vitest
---

# Tests

Enter here when changing tests that prove the package exports and registers the feature workflows. Keep tests focused on package contract and Workflower registration rather than duplicating Workflower's orchestration test suite.

## Patterns & Conventions

- Use dynamic imports from `extension-src` to exercise the same public module shape package consumers use during development.
- When workflow definitions change, update tests to reflect the full definition including cleanup behavior and optional session flags.
