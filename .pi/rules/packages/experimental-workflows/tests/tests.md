---
kind: rules
paths:
  - "packages/experimental-workflows/tests/**/*"
summary: Experimental-workflows Vitest coverage for package loading, workflow registration, private skills, and workflow contracts.
triggers:
  - experimental-workflows tests
  - counter workflow test
  - counter-loop workflow test
  - stateful-grilling workflow test
  - private skill test
  - experimental-workflows vitest
---

# Tests

Enter here when changing tests that prove the package exports and registers experimental workflows, hides internal handoff workflows from user commands, and loads workflow-only private skills. Keep tests focused on the package contract and demonstration behavior rather than duplicating Workflower's orchestration suite.

## Patterns & Conventions

- Use dynamic imports from `extension-src` so tests exercise the development-time public module shape.
- Cover package manifest skill exposure: private workflow skills stay in `pi.workflowerSkills` and no public `pi.skills` are expected.
- When workflow definitions change, update assertions for ids, invocation flags, model settings, cleanup/session flags, step commands, outputs, and auto-advance behavior.
- Keep skill-contract tests checking the state/handoff instructions that make loops autonomous: `workflower_state_get`, `workflower_state_set`, `workflower_handoff`, and the prohibition on printing hidden `/wf:<id>` commands.
- Keep stateful-grilling tests covering its `understandingPercent` threshold and final `feature-description.md` output contract.
