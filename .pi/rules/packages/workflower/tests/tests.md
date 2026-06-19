---
kind: rules
paths:
  - "packages/workflower/tests/**/*"
summary: Workflower Vitest coverage for registry, commands, handoff tools, auto-next events, state, prompts, and workflow lifecycle behavior.
triggers:
  - workflower tests
  - /wf test
  - /wf:<id> test
  - /next test
  - workflower_handoff test
  - autoNext test
  - workflow lifecycle test
---

# Tests

Enter here when changing tests for Workflower's public package API, command behavior, or handoff tool behavior. Tests use temporary directories and Pi command/tool harnesses to verify persisted state, session transitions, user notifications, cleanup, and registry sharing.

## Patterns & Conventions

- Prefer behavioral command/tool tests over unit tests of private helpers when changing `/wf`, `/wf:<id>`, `/next`, or `workflower_handoff` behavior.
- Assert file-system side effects under temp `.pi` directories so active state and artifacts are covered together.
- Use session-scoped active state paths when asserting workflow state.
- Keep tests explicit about whether session replacement should happen; many lifecycle rules depend on `clearOn*` flags.
- Cover tool-driven handoffs with active-state, context-boundary, pollen, turn-guard, auto-next, and follow-up prompt assertions.
- Cover workflow/step runtime settings with selected fallback, current/default-model warning, and captured default restore assertions.
- When changing registry behavior, verify the package root remains the shared public module for external workflow registration and generated start commands.
