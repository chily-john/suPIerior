# Workflower GitHub Issue Plan

This document breaks `.pi/features/workflower.md` into vertically sliced GitHub issue candidates. Each issue should deliver a usable Workflower behavior, not only a horizontal implementation layer. Testing and documentation are included in each issue; they are not separate stories.

## Expectations for Every Issue

For each issue:

1. Start by writing or updating tests that describe the user-visible behavior.
2. Run the relevant test command and confirm the test fails for the expected reason (**red**).
3. Implement the smallest code change that satisfies the behavior.
4. Run tests again and confirm they pass (**green**).
5. Refactor only after tests are green.
6. Update package docs/README/help text for the behavior delivered by the issue.
7. Keep scope tight; do not add V1 non-goals such as TUI polish, workflow DSLs, branching, artifact validation, or parallelism.

Suggested validation commands, adjusted as package scripts emerge:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

---

## Issue 1: Start a registered workflow in a fresh step-0 session

### Goal

Create the Workflower package and deliver the first usable end-to-end behavior: a user can start a known workflow, Workflower persists active state, creates the workflow workdir, opens a fresh Pi session, and sends the step-0 kickoff prompt.

### Vertical Slice

A user can run `/workflow start feature-to-github-issues <workflow-name>` and land in a fresh session ready to execute the first workflow step.

### Scope

- Create a new package, likely `packages/workflower`, without modifying or repurposing `packages/feature-flow`.
- Add package metadata, scripts, TypeScript configuration, and Pi extension entry point consistent with the monorepo.
- Register the `/workflow` command with at least the `start` subcommand.
- Define the minimal TypeScript workflow API:

```ts
export type WorkflowStep = {
  id: string;
  command: string;
  outputs?: string[];
};

export type WorkflowDefinition = {
  id: string;
  type: string;
  steps: WorkflowStep[];
};

export function defineWorkflow(workflow: WorkflowDefinition): WorkflowDefinition;
```

- Add a simple local workflow registry and lookup by workflow id.
- Add the concrete smoke-test workflow, kept separate from generic runner modules:

```ts
defineWorkflow({
  id: "feature-to-github-issues",
  type: "feature",
  steps: [
    { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
    { id: "plan-issues", command: "/feature-plan-issues", outputs: ["issues.md"] },
    { id: "review-issues", command: "/feature-review-issues", outputs: ["reviewed-issues.md"] },
    { id: "create-github-issues", command: "/github-create-issues" }
  ]
});
```

- Implement workdir path generation:

```text
.pi/workflows/<workflow-type>/<workflow-name>/
```

- Implement durable active-state storage at:

```text
.pi/tmp/workflows/active.json
```

- Write active state with:
  - `workflowId`
  - `type`
  - `name`
  - `workdir`
  - `currentStepIndex`
  - `startedAt`
  - `updatedAt`
- Generate the kickoff prompt for step 0, including workflow id/type/name, workdir, current step id/command, expected outputs, and the instruction to use `/next` after user verification.
- Use `ctx.newSession()` and send the kickoff prompt inside `withSession` via the replacement context.
- Handle user-facing start failures in this slice:
  - unknown workflow id;
  - existing active workflow;
  - invalid/missing arguments;
  - workdir/state write failure;
  - cancelled or failed session creation.

### TDD / Red-Green Plan

- **Red:** Add tests for:
  - extension/package smoke loading;
  - `defineWorkflow()` preserving definitions and outputs;
  - successful registry lookup and unknown workflow lookup;
  - workdir and active-state path generation;
  - active-state write/read behavior;
  - deterministic step-0 prompt generation;
  - `/workflow start` success with mocked command context;
  - all start failure paths listed above.
- **Green:** Implement only enough package, registry, state, prompt, and command code to make start work end-to-end.
- **Refactor:** Separate generic runner modules from concrete workflow definitions once tests are green.

### Documentation Updates

- Add initial package README or docs covering:
  - what Workflower is;
  - `/workflow start <workflow-id> <workflow-name>`;
  - state and artifact locations;
  - the included sample workflow;
  - V1 non-goals that are relevant to starting workflows.

### Acceptance Criteria

- `packages/workflower` exists as a new workspace package and builds/typechecks.
- `/workflow start feature-to-github-issues <workflow-name>` is registered and starts step 0 in a fresh session.
- Workdir and active state are created on disk before the fresh session is launched.
- The step-0 prompt includes expected output paths resolved relative to the workdir.
- Unknown workflow ids, invalid usage, existing active workflows, filesystem failures, and session replacement failures are reported clearly.
- Generic Workflower modules do not depend on feature-planning-specific logic.
- Tests and docs for the delivered start behavior are included.

---

## Issue 2: Advance to the next workflow step with `/next`

### Goal

Allow users to advance blindly from one workflow step to the next with a fresh session and previous-output handoff.

### Vertical Slice

After completing a step, a user can type `/next`; Workflower reads active state, advances to the next step, persists the new state, opens a fresh session, and sends the next kickoff prompt with previous declared outputs.

### Scope

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

### TDD / Red-Green Plan

- **Red:** Add tests for:
  - no active workflow;
  - active state referencing a missing workflow definition;
  - advancing from step 0 to step 1;
  - state update ordering;
  - previous outputs included in the step-1 prompt;
  - current expected outputs included in the next-step prompt;
  - final `/next` clears state and notifies complete;
  - no output existence checks are performed;
  - cancelled and failed session replacement during advancement.
- **Green:** Implement `/next` registration/handler and any prompt/state helper extensions needed for advancement.
- **Refactor:** Centralize fresh-session kickoff behavior only if it reduces duplication without hiding the stale-context safety rule.

### Documentation Updates

- Update docs/README with:
  - `/next` usage;
  - manual completion semantics;
  - output handoff conventions;
  - explicit note that Workflower advances by user intent and does not validate artifacts.

### Acceptance Criteria

- `/next` is registered and can advance the active workflow without extra arguments.
- Next-step prompts include the completed previous step's declared outputs.
- Final advancement clears active state and reports completion.
- Missing state, missing definitions, and session replacement failures are reported clearly.
- The runner advances blindly by user intent and performs no artifact existence checks.
- Tests and docs for advancement are included.

---

## Issue 3: Inspect and cancel the active workflow

### Goal

Provide basic lifecycle visibility and cancellation for the single active workflow.

### Vertical Slice

A user can inspect current workflow progress and cancel active state without manually editing `.pi/tmp/workflows/active.json`.

### Scope

- `/workflow status`:
  - show no-active-workflow message when state is absent;
  - show workflow id/type/name/workdir/current step when active.
- `/workflow cancel`:
  - clear active state;
  - notify cancellation;
  - do not delete workflow artifacts by default.
- Reuse the existing `/workflow` command routing from the start slice.
- Provide friendly errors for unknown `/workflow` subcommands.

### TDD / Red-Green Plan

- **Red:** Add handler tests for:
  - status with no active state;
  - status with active state;
  - status when active state references a missing workflow definition;
  - cancel with no active state;
  - cancel with active state;
  - unknown `/workflow` subcommand.
- **Green:** Implement status/cancel routing and handlers.
- **Refactor:** Reuse state formatting helpers only if they keep messages deterministic and tests readable.

### Documentation Updates

- Update docs/README with:
  - `/workflow status`;
  - `/workflow cancel`;
  - cancellation semantics, including that artifacts are not deleted.

### Acceptance Criteria

- Users can inspect active workflow state.
- Users can cancel active state safely.
- Cancellation does not delete generated artifacts.
- Unknown `/workflow` subcommands produce helpful messages.
- Tests and docs for status/cancel are included.

---

## Issue 4: Polish command registration and V1 validation

### Goal

Make the V1 command surface consistent and confirm the implemented package matches the feature summary.

### Vertical Slice

When the extension loads, users have the complete V1 command surface with predictable help/usage behavior, and maintainers can validate the package with normal repo commands.

### Scope

- Verify extension command registration for:
  - `/workflow start <workflow-id> <workflow-name>`;
  - `/workflow status`;
  - `/workflow cancel`;
  - `/next`.
- Add integration-style command registration assertions if not already covered by earlier slices.
- Ensure missing/invalid arguments return friendly usage text.
- Ensure `/next` remains registered even when no workflow is active, unless Pi command unregistration is proven useful and simple.
- Run final package and repo-level validation commands as appropriate.
- Remove stale comments, misleading examples, or temporary scaffolding.

### TDD / Red-Green Plan

- **Red:** Add tests or integration-style assertions that command registration receives the expected command names and handlers, and that invalid usage produces stable help text.
- **Green:** Wire any remaining command registration or parser gaps.
- **Refactor:** Keep parser and handler boundaries small.

### Documentation Updates

- Finalize package README/docs so a developer or user can understand:
  - what Workflower does;
  - all V1 commands;
  - state and artifact locations;
  - included sample workflow;
  - V1 non-goals;
  - how to run relevant tests/build/typecheck/lint.

### Acceptance Criteria

- All V1 commands are registered by the extension.
- Invalid command usage produces helpful messages.
- Documentation reflects the implemented command behavior and non-goals.
- Final validation passes for the package and does not break existing packages.
- No separate testing-only or documentation-only follow-up story is required.

---

## Suggested Milestone Order

1. Start a registered workflow in a fresh step-0 session.
2. Advance to the next workflow step with `/next`.
3. Inspect and cancel the active workflow.
4. Polish command registration and complete V1 validation.

## V1 Guardrails

Do not include these in the above issues unless a later planning pass explicitly changes scope:

- Custom TUI wizard or question UI.
- JSON/YAML workflow DSL.
- Branching, conditionals, or parallelism.
- Multiple active workflows per project.
- Artifact existence checks or schema validation.
- Automatic guessing of output paths.
- GitHub issue orchestration inside Workflower generic code.
- Implementation-agent orchestration.
