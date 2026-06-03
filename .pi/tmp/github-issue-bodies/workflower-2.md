## Goal

Allow users to advance blindly from one workflow step to the next with a fresh session and previous-output handoff.

## Vertical slice

After completing a step, a user can type `/next`; Workflower reads active state, advances to the next step, persists the new state, opens a fresh session, and sends the next kickoff prompt with previous declared outputs.

## Dependencies

- Depends on #55 for the Workflower package, workflow registry, active-state model, prompt/state helpers, and fresh-session start behavior.
- Can be implemented after #55; it does not depend on lifecycle/status work.
- Blocks: #58 final V1 command validation.

## Scope

`/next` behavior:

1. Read `.pi/tmp/workflows/active.json`.
2. If missing, notify “No active workflow.”
3. Load the workflow definition.
4. If definition is missing, notify error and do not mutate state.
5. Increment `currentStepIndex`.
6. If there is a next step:
   - update active state on disk;
   - generate kickoff prompt with previous-output handoff;
   - create a fresh session;
   - send kickoff prompt through the replacement context.
7. If there is no next step:
   - clear active state;
   - notify workflow complete;
   - do not create another session.

Rules:

- `/next` requires no workflow id/name/type.
- Resolve previous outputs and expected outputs relative to the workflow workdir.
- Do not check whether output files exist before advancing.
- Do not parse prompt text for state.
- Handle cancelled or failed `ctx.newSession()` explicitly and keep state behavior documented and tested.

## TDD / red-green plan

- **Red:** Add tests for no active workflow, missing workflow definition, advancing from step 0 to step 1, state update ordering, previous outputs in the step-1 prompt, current expected outputs in the prompt, final `/next` clearing state, no output existence checks, and cancelled/failed session replacement.
- **Green:** Implement `/next` registration/handler and prompt/state helper extensions needed for advancement.
- **Refactor:** Centralize fresh-session kickoff behavior only if it reduces duplication without hiding the stale-context safety rule.

## Documentation updates

Update docs/README with `/next` usage, manual completion semantics, output handoff conventions, and an explicit note that Workflower advances by user intent and does not validate artifacts.

## Acceptance criteria

- [ ] `/next` is registered and can advance the active workflow without extra arguments.
- [ ] Next-step prompts include the completed previous step's declared outputs.
- [ ] Final advancement clears active state and reports completion.
- [ ] Missing state, missing definitions, and session replacement failures are reported clearly.
- [ ] The runner advances blindly by user intent and performs no artifact existence checks.
- [ ] Tests and docs for advancement are included.
