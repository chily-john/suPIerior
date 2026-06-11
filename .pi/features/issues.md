# Issues: Workflower Garden/Flower Workflow Management

Source feature brief: `.pi/features/workflower-garden-flower-workflow-management.md`

Use these issues in order. Each issue is intentionally written as a **vertical slice**: when the issue is complete, a user-visible Workflower capability works end-to-end with tests, runtime behavior, and documentation updated together. Do not close an issue if it only adds types, helpers, or preparatory refactors for a later issue.

Every issue should be implemented with red/green TDD:

1. Read the source feature brief and the files listed for the issue.
2. Add or update the smallest test that describes the new behavior.
3. Run the test and confirm it fails for the expected reason.
4. Implement the smallest runtime/docs change that makes the test pass.
5. Refactor only while tests stay green.
6. Run the validation commands listed in the issue.

---

## Issue 1: Reject unsafe workflow ids everywhere workflows are registered

**Dependencies:** None

### User story

As a workflow author, I want Workflower to reject workflow ids that cannot safely become flower folder names or `/wf:<id>` commands, so I learn about invalid ids as soon as I register a workflow.

### Vertical slice delivered

After this issue, workflow id validation is complete from public registration through generated command registration and docs. This is not just a regex helper: users can rely on the new id rules across Workflower.

### Behavior to build

Workflow ids must match exactly:

```text
^[a-z0-9_-]+$
```

Allowed examples:

- `feature`
- `github_issue`
- `review-pr`

Rejected examples:

- `github:issue`
- `Feature`
- `has space`
- `../bad`
- empty strings

Rejected ids should throw an error containing `Invalid workflow id`.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/validation/workflow-id-validation.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/registry/global-registry.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/commands/generated-start-commands.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`
- `packages/workflower-authoring/skills/workflower-authoring/SKILL.md`

### TDD plan for a junior developer

1. In `packages/workflower/tests/workflower.test.ts`, find the existing registry or generated-command tests for workflow ids.
2. **Red:** Add tests showing that `feature`, `github_issue`, and `review-pr` can register successfully.
3. **Red:** Add tests showing that `github:issue`, `Feature`, `has space`, `../bad`, and `""` are rejected with `Invalid workflow id`.
4. **Red:** Update any existing test fixture that still uses a colon id so the test suite now describes the new supported format.
5. Run `pnpm test` from `packages/workflower` and confirm the new tests fail because old validation still allows or expects colon ids.
6. **Green:** Replace the current workflow id validator with the folder-safe regex.
7. **Green:** Update generated-command expectations and fixtures so they use folder-safe ids.
8. **Green:** Update Workflower README and authoring guidance so examples no longer recommend colon-separated ids.
9. **Refactor:** Keep the validation logic isolated in `workflow-id-validation.ts`; do not spread regex checks through unrelated files.

### Acceptance criteria

- Valid folder-safe ids register and generate start commands.
- Unsafe ids throw `Invalid workflow id` before a workflow can be used.
- Duplicate-id rejection still works.
- Docs and authoring guidance use folder-safe ids only.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not change garden or flower artifact paths yet.
- Do not add pollen or handoff behavior yet.

---

## Issue 2: Start a named garden with its first flower

**Dependencies:** Issue 1

### User story

As a Workflower user, I want `/wf:<workflow-id> <garden-name>` to create a garden and the first flower folder, so all artifacts for that workflow execution live in the new garden/flower layout.

### Vertical slice delivered

After this issue, a single workflow can start in the new folder model and its first step prompt points to the correct flower folder. The start behavior works end-to-end even though pollen, handoff, and final cleanup are added later.

### Behavior to build

When no workflow is active:

```text
/wf:some_workflow run-one
```

Workflower creates:

```text
.pi/workflows/run-one/0001-some_workflow/index.json
```

Then it starts step `0` of `some_workflow` with output paths rooted in:

```text
.pi/workflows/run-one/0001-some_workflow/
```

When no workflow is active and no garden name is provided:

```text
/wf:some_workflow
```

Workflower reports a clear usage error because an initial garden name is required.

There is no garden-level index file.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/artifact-paths.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/parse-start-args.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/start-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/initialize-workflow-session.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/start-workflow-step.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-output-paths.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Find the current tests that start a workflow and assert the old `.pi/workflows/<workflow-id>/<name>/` workdir.
2. **Red:** Update or add a start-command test for `/wf:some_workflow run-one` that expects `.pi/workflows/run-one/0001-some_workflow/index.json` to exist.
3. **Red:** In that same test, assert the saved active state includes enough data to identify:
   - the garden name or path;
   - the active flower folder name or path;
   - the active workflow id;
   - the current step index.
4. **Red:** Add a prompt-rendering or start test proving declared output paths are rendered inside `0001-some_workflow`, not the old workdir layout.
5. **Red:** Add a test for `/wf:some_workflow` with no active workflow and no garden name. Assert it returns a usage error and does not create artifacts or active state.
6. Run `pnpm test` from `packages/workflower` and confirm these tests fail against the old layout.
7. **Green:** Add or update path helpers so garden and flower paths are built in one place.
8. **Green:** Reshape active state to store the active garden and active flower information.
9. **Green:** Create the first flower index with this initial shape:

   ```json
   {
     "status": "active",
     "workflowId": "some_workflow",
     "flowerPath": "<absolute path>",
     "pollen": [],
     "pollenPinned": false
   }
   ```

10. **Green:** Start step `0` using the flower path as the output directory.
11. **Green:** Update README examples for the new initial start command and path layout.
12. **Refactor:** Remove old `workdir` assumptions from the files touched in this issue. If a concept means “current flower path,” name it that way.

### Acceptance criteria

- `/wf:<workflow-id> <garden-name>` creates `.pi/workflows/<garden-name>/0001-<workflow-id>/index.json`.
- `/wf:<workflow-id>` without an active workflow fails clearly because the garden name is missing.
- Step kickoff prompts point output paths into the active flower folder.
- Active state can identify the current garden and current flower.
- No garden-level index is created.
- Existing `clearOnStart` context-boundary behavior remains tested and green.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not implement pollen updates yet, except for writing the empty initial `pollen` array.
- Do not implement handoff to another flower yet.
- Do not implement garden completion cleanup yet.

---

## Issue 3: Update flower pollen as `/next` completes each step

**Dependencies:** Issue 2

### User story

As a workflow author, I want Workflower to record the useful output paths from a flower as pollen, so a later workflow can receive the right artifact paths during a handoff.

### Vertical slice delivered

After this issue, one active flower maintains its own `index.json` correctly as `/next` advances through steps. Pollen tracking is complete for a single workflow execution, even before chained handoff is added.

### Behavior to build

Each time `/next` completes the current step, Workflower updates the active flower index:

1. If the completed step declares `outputs`, those output paths become the current pollen.
2. Pollen paths are absolute paths inside the flower folder.
3. If `workflow.pollen` is configured and the completed step declares that pollen output, pollen becomes pinned.
4. Once pollen is pinned, later step outputs do not replace it.
5. If `workflow.pollen` is a string array, all configured pollen paths are written together when pinned.
6. Workflower does not check whether output files actually exist.

### Files to inspect first

- `packages/workflower/extension-src/workflower/package-api/workflow-definition.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/complete-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/artifact-paths.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Add tests in `packages/workflower/tests/workflower.test.ts` that use workflows with multiple steps and declared `outputs`.
2. **Red:** For a workflow with no `pollen` setting, start the workflow, call `/next`, and assert the flower index `pollen` equals the completed step outputs as absolute paths.
3. **Red:** Continue to another step and assert later step outputs replace the previous pollen when `pollenPinned` is still `false`.
4. **Red:** For a workflow with `pollen: "final.md"`, assert pollen is unpinned after an earlier output, pinned after the step that outputs `final.md`, and not replaced by a later output.
5. **Red:** For a workflow with `pollen: ["final.md", "notes.md"]`, assert both configured absolute paths are written together when the matching configured pollen is pinned.
6. Use `cleanupOnCompletion: false` in tests that need to inspect the flower index after the workflow completes.
7. Run `pnpm test` from `packages/workflower` and confirm the tests fail because pollen is not updated yet.
8. **Green:** Add `pollen?: string | string[]` to `WorkflowDefinition`.
9. **Green:** Add a small flower-index reader/writer/updater near runtime artifact code. Keep JSON shape explicit and typed.
10. **Green:** Call the pollen updater when `/next` completes a step, before advancing to the next step or completing the workflow.
11. **Green:** Resolve output and pollen paths relative to the active flower path and convert them to absolute paths.
12. **Green:** Update README documentation for `pollen`, `pollenPinned`, and the update rules.
13. **Refactor:** Keep pollen matching deterministic. Do not add fallback guesses if a workflow declaration is wrong.

### Acceptance criteria

- Flower `index.json` updates on every `/next` that completes a step.
- Pollen paths are absolute.
- Step outputs replace unpinned pollen.
- Workflow-level `pollen` pins pollen when the configured output is completed.
- Pinned pollen is not overwritten by later outputs.
- No file-existence checks are required for declared outputs or pollen.
- README explains `pollen` and `pollenPinned`.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not pass pollen to another workflow yet.
- Do not change cleanup behavior beyond what is needed to keep tests inspectable.

---

## Issue 4: Handoff from the active flower to a new flower in the same garden

**Dependencies:** Issue 3

### User story

As a Workflower user, I want to start another workflow while a garden is active, so the new workflow becomes the next flower and can receive the previous flower’s pollen paths.

### Vertical slice delivered

After this issue, chained workflow execution works end-to-end for the start of the second flower: the previous flower is marked handed off, the next flower is created, active state moves forward, and the kickoff prompt can reference incoming pollen.

### Behavior to build

When a workflow is active:

```text
/wf:some_other_workflow
```

Workflower should:

1. Mark the current flower index status as `handedOff`.
2. Leave the current flower files in place.
3. Create the next flower folder in the same garden, for example:

   ```text
   .pi/workflows/run-one/0002-some_other_workflow/
   ```

4. Create the new flower index with status `active` and empty pollen.
5. Start step `0` of the new workflow in the new flower folder.
6. Reference the previous flower’s indexed pollen paths in the new kickoff prompt when the new workflow accepts pollen.

When a workflow is active, this command is invalid:

```text
/wf:some_other_workflow run-two
```

It should report a clear error because the current garden is already established.

### Files to inspect first

- `packages/workflower/extension-src/workflower/package-api/workflow-definition.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/parse-start-args.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/start-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/initialize-workflow-session.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/start-workflow-step.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-step-kickoff-prompt.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Create or update tests that start one workflow, advance far enough to produce pollen, then start a second workflow while the first is still active.
2. **Red:** Assert `/wf:some_other_workflow` creates `0002-some_other_workflow` under the same garden.
3. **Red:** Assert the first flower index status changes from `active` to `handedOff`.
4. **Red:** Assert active state now points to the second workflow and second flower.
5. **Red:** Assert the second workflow kickoff prompt references the previous flower’s pollen paths. The prompt should include paths only, not file contents.
6. **Red:** Add a workflow with `acceptPollen: false` and assert its kickoff prompt omits previous pollen.
7. **Red:** Add a test for `/wf:some_other_workflow run-two` while active. Assert it reports an error and does not create a new flower or mutate active state.
8. Run `pnpm test` from `packages/workflower` and confirm these tests fail because starts are still rejected or use the old single-workflow model.
9. **Green:** Add `acceptPollen?: boolean` to `WorkflowDefinition`, defaulting to `true`.
10. **Green:** Split start parsing into two clear modes:
    - no active workflow: exactly one garden-name argument is required;
    - active workflow: zero arguments are required.
11. **Green:** Add handoff logic that finalizes the previous flower as `handedOff`, finds the next flower sequence number, creates the new flower, and starts step `0`.
12. **Green:** Update kickoff prompt rendering so incoming pollen is listed only when accepted and non-empty.
13. **Green:** Update README documentation for handoff commands and `acceptPollen`.
14. **Refactor:** If start logic becomes hard to read, separate initial garden start from active-garden handoff into small use-case functions.

### Acceptance criteria

- Starting another workflow while active performs a handoff instead of rejecting the command.
- Handoff creates the next numbered flower in the same garden.
- The previous flower status becomes `handedOff` and its files remain in place.
- The new active flower starts at step `0`.
- Incoming pollen is path-referenced when accepted and omitted when `acceptPollen: false` or no pollen exists.
- Pollen files are not copied into the new flower.
- Providing a garden name while active fails clearly and does not mutate state.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not clean up handed-off flowers yet.
- Do not change `/wf status`, `/wf list`, or `/wf stop` unless the tests touched by this issue require a small compatibility update.

---

## Issue 5: Complete the garden and clean up flowers at final completion

**Dependencies:** Issue 4

### User story

As a Workflower user, I want the whole garden to complete only when the active flower finishes, so handed-off flowers stay available during chaining and cleanup happens once at the end.

### Vertical slice delivered

After this issue, a garden has a complete lifecycle: start, optional handoff, final completion, per-flower cleanup, empty garden removal, and active-state clearing.

### Behavior to build

When `/next` is called at the end of the active workflow:

1. The active flower status becomes `completed`.
2. The entire garden is considered complete.
3. Each flower is cleaned up according to the `cleanupOnCompletion` value of the workflow definition that produced that flower.
4. If the garden directory becomes empty after cleanup, Workflower removes it.
5. Active state is cleared.

Cleanup must not happen during handoff.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/complete-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/remove-artifacts.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state.types.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Add tests for final completion. Use small test workflows so the setup is easy to follow.
2. **Red:** Test a single-flower garden with default cleanup. After the final `/next`, assert the flower folder is removed, the empty garden folder is removed, and active state is cleared.
3. **Red:** Test a chained garden. Start workflow A, hand off to workflow B, then complete B. Assert workflow A’s flower remains during handoff and is only considered for cleanup at final garden completion.
4. **Red:** Test mixed cleanup settings. For example, workflow A has `cleanupOnCompletion: false` and workflow B uses default cleanup. After final completion, assert A’s flower remains under the garden and B’s flower is removed.
5. **Red:** Test that active state is not cleared during handoff and is cleared only when the garden completes.
6. Run `pnpm test` from `packages/workflower` and confirm the tests fail against the old single-workflow cleanup behavior.
7. **Green:** Store or derive enough metadata to resolve the workflow definition for each flower at garden completion.
8. **Green:** Update completion logic to mark the active flower `completed` before cleanup.
9. **Green:** Iterate over flower indexes in the active garden and apply cleanup per producing workflow.
10. **Green:** Remove the garden directory only when it is empty after cleanup.
11. **Green:** Update README documentation for garden completion and cleanup timing.
12. **Refactor:** Keep path safety checks in artifact removal code so cleanup cannot delete outside `.pi/workflows`.

### Acceptance criteria

- Handoff never deletes previous flower artifacts.
- Final completion marks the active flower `completed` before cleanup.
- Final completion applies cleanup per flower’s workflow definition.
- Empty gardens are removed.
- Preserved flower artifacts remain under the garden.
- Active state is cleared only when the garden completes.
- Existing `clearOnCompletion` behavior remains tested under the garden model.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not redesign status/list/stop output in this issue unless needed for the final completion tests.
- Do not add Feature Workflow package pollen declarations yet.

---

## Issue 6: Manage active gardens with `/wf status`, `/wf list`, and `/wf stop`

**Dependencies:** Issues 2 and 4

### User story

As a Workflower user, I want management commands to describe and control the active garden/flower, so I can see what is running and stop it without deleting artifacts.

### Vertical slice delivered

After this issue, Workflower’s visible management commands work with the garden/flower model. This is one user-facing management capability, not a grab bag of internal state updates.

### Behavior to build

- `/wf status` shows the active workflow id, garden, active flower path, current step, and generated command.
- `/wf list` lists active gardens and flowers by session and still marks stale or other-session active states.
- `/wf stop` clears the current session’s active state without deleting garden or flower artifacts.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/show-status.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/list-active.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/stop-active.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/manage-active.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Find the existing status, list, and stop tests.
2. **Red:** Update `/wf status` tests so expected output uses garden and flower language instead of old workdir language.
3. **Red:** Update `/wf list` tests so each active state entry shows the session plus the active garden and flower.
4. **Red:** Update stale-session and other-session list tests so they still pass under the reshaped active state.
5. **Red:** Update `/wf stop` tests to assert active state is cleared but garden and flower folders are not deleted.
6. Run `pnpm test` from `packages/workflower` and confirm the tests fail where management code still reads old state fields.
7. **Green:** Update management use cases to read the current active garden and active flower fields.
8. **Green:** Update human-readable output strings consistently. Prefer terms from the feature brief: garden, flower, active flower path.
9. **Green:** Update README management command examples.
10. **Refactor:** Remove stale management-only `workdir` wording.

### Acceptance criteria

- `/wf status` reports the current garden and flower.
- `/wf list` reports active gardens/flowers across sessions and preserves stale/other-session labeling.
- `/wf stop` clears active state and does not remove artifacts.
- Management command tests do not depend on old `.pi/workflows/<workflow-id>/<name>/` paths.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not change pollen, handoff, or cleanup behavior here except as needed to set up management tests.
- Do not change context scoping or auto-next here; those are covered by the next issue.

---

## Issue 7: Keep context scoping and auto-next working for active flowers

**Dependencies:** Issues 3, 4, and 5

### User story

As a Workflower user, I want context boundaries and `autoNext` to keep working after the garden/flower migration, so automated advancement and scoped model context remain reliable.

### Vertical slice delivered

After this issue, the invisible lifecycle helpers that affect real workflow execution are complete under the new active-state shape: scoped context reads the active flower correctly, and auto-next uses the same advance/completion behavior as manual `/next`.

### Behavior to build

- Context boundary filtering uses the reshaped active state and still keeps the current visible session while clearing model context when configured.
- Non-final auto-next advances to the next step using the active flower folder and pollen update rules.
- Final auto-next completes the garden using the same completion behavior as manual `/next`.
- `clearOnStart`, `clearOnNext`, and `clearOnCompletion` behavior remains compatible with the garden model.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/scope-context/build-scoped-workflow-context.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/auto-next/advance-on-auto-next.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/events/auto-next-on-agent-end.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/events/scoped-context-on-context-request.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/apply-workflow-step-runtime-settings.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/README.md`

### TDD plan for a junior developer

1. Find existing context-scoping and auto-next tests.
2. **Red:** Update context-scoping tests to build active state with garden and active flower fields.
3. **Red:** Add or update a test proving scoped context still respects the active workflow context boundary after the state shape change.
4. **Red:** Add or update a non-final auto-next test proving it advances to the next step and writes output paths/pollen under the active flower folder.
5. **Red:** Add or update a final auto-next test proving it completes the garden and applies cleanup the same way manual `/next` does.
6. Run `pnpm test` from `packages/workflower` and confirm the tests fail where helper code still expects old state fields.
7. **Green:** Update context-scoping code to read the new active-state shape.
8. **Green:** Update auto-next code to call the same advance/completion path used by manual `/next`.
9. **Green:** Update any event adapter assumptions about `workdir` or old artifact paths.
10. **Green:** Update README if it documents auto-next or context behavior with old paths.
11. **Refactor:** Keep auto-next as a thin caller around the normal advancement use case; do not duplicate pollen or cleanup logic.

### Acceptance criteria

- Context scoping tests pass with active garden/flower state.
- Auto-next updates pollen the same way manual `/next` does.
- Auto-next completion completes and cleans up the garden the same way manual `/next` does.
- `clearOnStart`, `clearOnNext`, and `clearOnCompletion` behavior remains tested and green.
- From `packages/workflower`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not redesign management command output here.
- Do not update Feature Workflow package definitions here.

---

## Issue 8: Make Feature Workflow definitions pollen-aware

**Dependencies:** Issues 3 and 4

### User story

As a Feature Workflow user, I want `new-feature` and `take-it-away` to produce useful pollen, so chained workflows can hand off meaningful artifact paths without users copying paths manually.

### Vertical slice delivered

After this issue, the real `@supierior/feature-workflow` package uses the new Workflower public API and its documentation teaches the garden/flower artifact layout. This is a complete integration slice for a consuming workflow package.

### Behavior to build

- `new-feature` declares useful pollen for downstream workflows.
- `take-it-away` declares useful pollen if it produces an artifact that should be handed to another flower.
- Definitions remain registered through Workflower’s public `registerWorkflow` flow.
- Feature Workflow docs show `.pi/workflows/<garden>/0001-new-feature/` style paths.

Suggested pollen candidates to verify while implementing:

- `new-feature`: `issues.md`
- `take-it-away`: `implementation-plan.md` or `implementation-review.md`, depending on the intended downstream handoff

### Files to inspect first

- `packages/feature-workflow/extension-src/feature-workflow/package-api/new-feature-workflow.ts`
- `packages/feature-workflow/extension-src/feature-workflow/package-api/take-it-away-workflow.ts`
- `packages/feature-workflow/tests/feature-workflow.test.ts`
- `packages/feature-workflow/README.md`
- `packages/workflower/extension-src/workflower/package-api/workflow-definition.types.ts`

### TDD plan for a junior developer

1. Read the two workflow definition files and identify which step outputs are the final useful artifacts.
2. **Red:** Update `packages/feature-workflow/tests/feature-workflow.test.ts` to expect the chosen `pollen` declarations.
3. **Red:** Add or update smoke tests proving the package still registers generated commands for `/wf:new-feature` and `/wf:take-it-away` after the definition changes.
4. Run `pnpm test` from `packages/feature-workflow` and confirm the tests fail until the definitions are updated.
5. **Green:** Add `pollen` to each workflow definition where there is a clear downstream artifact.
6. **Green:** Add `acceptPollen: false` only if a workflow should intentionally ignore incoming pollen. Otherwise rely on the default `true`.
7. **Green:** Update README examples and handoff guidance to use garden/flower paths.
8. **Refactor:** Remove stale comments or docs that describe the old `.pi/workflows/<workflow-id>/<workflow-name>/` layout.

### Acceptance criteria

- Feature Workflow definitions compile against the new Workflower API.
- Tests assert the intended pollen declarations.
- Workflow registration smoke tests still pass for `new-feature` and `take-it-away`.
- README examples use garden/flower artifact paths.
- From `packages/feature-workflow`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

### Out of scope

- Do not change Workflower runtime behavior in this issue unless a missing public API from earlier issues is discovered.
- Do not rewrite Feature Workflow skill content beyond path and handoff guidance needed for this integration.

---

## Issue 9: Update Workflower authoring guidance for gardens, flowers, and pollen

**Dependencies:** Issues 1, 2, 3, 4, and 5

### User story

As a developer using the Workflower authoring skill, I want generated guidance to teach the new garden/flower model, so new workflow packages are created correctly from the start.

### Vertical slice delivered

After this issue, the authoring package is fully aligned with the new runtime behavior. A user who follows the skill should produce folder-safe ids, correct commands, correct artifact paths, and useful pollen settings.

### Behavior to build

Authoring guidance should teach:

- folder-safe workflow ids only;
- initial command form `/wf:<workflow-id> <garden-name>`;
- handoff command form `/wf:<workflow-id>` while active;
- garden/flower artifact paths;
- flower `index.json` behavior;
- workflow-level `pollen` and `acceptPollen` options;
- final garden cleanup timing.

### Files to inspect first

- `packages/workflower-authoring/skills/workflower-authoring/SKILL.md`
- `packages/workflower-authoring/README.md`
- `packages/workflower/README.md`
- `.pi/features/workflower-garden-flower-workflow-management.md`

### TDD/review plan for a junior developer

1. Read the Workflower README sections that were updated in earlier issues.
2. Search the authoring package for old examples such as colon-separated ids or `.pi/workflows/<workflow-id>/<workflow-name>/` paths.
3. **Red:** If the package has useful tests by this point, add or update tests that assert the skill text includes the new command/path examples. If it still has no meaningful tests, write down the exact doc checks you will perform manually.
4. Run `pnpm test` from `packages/workflower-authoring`. It may be a no-op, but run it so the package validation story is explicit.
5. **Green:** Update `SKILL.md` templates, examples, checklists, and validation guidance.
6. **Green:** Update the authoring README to match the new runtime model.
7. **Refactor:** Remove all old-layout examples and all colon-id examples.

### Acceptance criteria

- Authoring guidance requires folder-safe ids.
- Authoring guidance shows the correct initial start and active-handoff command forms.
- Generated examples use `.pi/workflows/<garden>/0001-<workflow-id>/` style paths.
- Guidance explains when to use `pollen` and `acceptPollen`.
- Guidance explains that cleanup waits until the garden completes.
- From `packages/workflower-authoring`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass, even if those scripts are currently no-ops.

### Out of scope

- Do not change Workflower runtime code here.
- Do not change Feature Workflow definitions here.
