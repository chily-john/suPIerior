---
kind: rules
paths:
  - "packages/feature-workflow/tests/**/*"
summary: Feature-workflow tests for package loading and feature workflow registration.
triggers:
  - feature-workflow tests
  - new-feature workflow test
  - take-it-away workflow test
  - feature-doc workflow test
  - private loop workflow test
  - feature-workflow vitest
---

# Tests

Enter here when changing tests that prove the package exports and registers the public feature workflows and private loop workflows. Keep tests focused on package contract and Workflower registration rather than duplicating Workflower's orchestration test suite.

## Patterns & Conventions

- Use dynamic imports from `extension-src` to exercise the same public module shape package consumers use during development.
- Cover package manifest skill exposure: `pi.skills` stays empty, while workflow-only skills use `pi.workflowerSkills` and load into Workflower's private registry during extension setup.
- When workflow definitions change, update tests to reflect the full definition including invocation flags, cleanup behavior, model/thinking profiles, optional session flags, output artifacts, routing commands, garden-state expectations, and auto-advance expectations.
