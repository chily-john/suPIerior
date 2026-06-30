---
kind: rules
paths:
  - "packages/workflower/tests/**/*"
summary: Workflower Vitest coverage for registry, commands, handoff/state tools, auto-next events, active/garden/resume state, private skills/commands, prompts, and workflow lifecycle behavior.
triggers:
  - workflower tests
  - /wf test
  - /wf clean test
  - /wf resume test
  - /wf:<id> test
  - /next test
  - workflower_handoff test
  - workflower_state test
  - garden state test
  - private skill test
  - private command test
  - registerWorkflowerCommand test
  - createWorkflowerRuntime test
  - userInvocable test
  - modelInvocable test
  - autoNext test
  - workflow pipeline test
  - workflow lifecycle test
  - advance-workflow test
  - footer status test
  - model resolution notification test
---

# Tests

Enter here when changing tests for Workflower's public package API, command behavior, or handoff/state tool behavior. Tests use temporary directories and Pi command/tool harnesses to verify persisted state, session transitions, user notifications, cleanup, and registry sharing.

## Patterns & Conventions

- Prefer behavioral command/tool tests over unit tests of private helpers when changing `/wf`, `/wf clean`, `/wf:<id>`, `/next`, or `workflower_handoff` behavior.
- Assert file-system side effects under temp `.workflower` directories so active state, garden state, artifacts, and generated ignore files are covered together.
- Use session-scoped active state paths when asserting workflow state.
- Keep tests explicit about whether session replacement should happen; many lifecycle rules depend on `clearOn*` flags.
- Cover tool-driven handoffs with active-state, context-boundary, pollen, turn-guard, auto-next, and follow-up prompt assertions.
- Cover auto-next agent-end outcomes with clean advancement, execution-error and unknown-outcome retries, abort no-ops, retry exhaustion, and retry-state clearing across manual advancement, handoff, and completion.
- Cover garden state foundations, `/wf state`, `workflower_state_*`, runtime facade methods, producer metadata, and completion cleanup when changing state behavior.
- Cover `/wf resume` with preserved, paused, completed, and invalid resume metadata; metadata refresh across stop, next, auto-next, and handoff; valid/invalid step overrides; write/update failures; restored active state, resumed session ids, re-sent step prompts, and active-garden conflict refusal when changing resume behavior.
- Cover private skill loading, registration, command expansion, and kickoff prompt injection when changing private skill behavior.
- Cover private command registration, duplicate handling, private-skill precedence, `prompt`/`none` rendering, and step-command resolution when changing `registerWorkflowerCommand` behavior.
- Cover `userInvocable` and `modelInvocable` behavior across generated commands, hidden input blocking, status visibility, and handoff permissions.
- Cover `/wf:<id>` pipeline syntax with queued active state persistence, active handoff queuing, final-step queued handoff, and invalid queued workflow rejection.
- Cover workflow/step runtime settings with selected fallback, current/default-model warning, and captured default restore assertions.
- Cover workflow prompt custom-message display metadata, model prompt content, and plain-message fallback when changing kickoff prompt delivery.
- When changing registry behavior, verify the package root remains the shared public module for external workflow registration and generated start commands.
- Cover session name setting to garden name at workflow kickoff when changing session management behavior.
