## Goal

Provide basic lifecycle visibility and cancellation for the single active workflow.

## Vertical slice

A user can inspect current workflow progress and cancel active state without manually editing `.pi/tmp/workflows/active.json`.

## Dependencies

- Depends on #55 for the Workflower package, `/workflow` routing, workflow registry, and active-state storage.
- Can be implemented in parallel with /next after #55 is complete; it does not depend on advancement behavior.
- Blocks: #58 final V1 command validation.

## Scope

- `/workflow status`:
  - show no-active-workflow message when state is absent;
  - show workflow id/type/name/workdir/current step when active.
- `/workflow cancel`:
  - clear active state;
  - notify cancellation;
  - do not delete workflow artifacts by default.
- Reuse the existing `/workflow` command routing from the start slice.
- Provide friendly errors for unknown `/workflow` subcommands.

## TDD / red-green plan

- **Red:** Add handler tests for status with no active state, status with active state, status when active state references a missing workflow definition, cancel with no active state, cancel with active state, and unknown `/workflow` subcommand.
- **Green:** Implement status/cancel routing and handlers.
- **Refactor:** Reuse state formatting helpers only if they keep messages deterministic and tests readable.

## Documentation updates

Update docs/README with `/workflow status`, `/workflow cancel`, and cancellation semantics, including that artifacts are not deleted.

## Acceptance criteria

- [ ] Users can inspect active workflow state.
- [ ] Users can cancel active state safely.
- [ ] Cancellation does not delete generated artifacts.
- [ ] Unknown `/workflow` subcommands produce helpful messages.
- [ ] Tests and docs for status/cancel are included.
