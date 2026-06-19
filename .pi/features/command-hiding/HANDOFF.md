# Workflower Command Hiding Handoff

## Goal

Add first-class Workflower invocation visibility so workflow authors can hide generated workflow slash commands from users while still allowing model/tool-driven handoffs when desired.

Primary target behavior:

```ts
const counterLoopWorkflow: WorkflowDefinition = {
  id: "counter-loop",
  userInvocable: false,
  modelInvocable: true,
  steps: [/* ... */],
};
```

This should mean:

- `/wf:counter-loop` is not registered, so it is not shown in user autocomplete or command listings.
- A user cannot start `counter-loop` directly, either as a new garden or as a manual active-garden handoff.
- `workflower_handoff({ workflowId: "counter-loop" })` can still start it because `modelInvocable` remains enabled.

## Decisions from discussion

1. Workflow user visibility and model/tool visibility are separate axes.
2. `userInvocable: false` should hide and block human slash-command invocation.
3. `userInvocable: false` must not prevent `workflower_handoff` unless `modelInvocable: false` is also set.
4. No source workflow allowlists in this iteration.
5. For commands, true hiding should be implemented by not registering hidden generated commands. Pi currently has no native hidden command option.
6. For exact typed hidden commands, add a Workflower input guard so `/wf:<hidden-id>` gets a friendly error instead of falling through to the LLM as text.

## Proposed API

Extend `WorkflowDefinition`:

```ts
export type WorkflowDefinition = {
  id: string;
  userInvocable?: boolean;
  modelInvocable?: boolean;
  // existing fields...
};
```

Defaults:

- `userInvocable !== false` means user-invokable.
- `modelInvocable !== false` means model/tool-invokable.

Use positive names rather than `disable*` to keep definitions readable:

```ts
userInvocable: false,
modelInvocable: false,
```

## Behavior details

### Generated workflow commands

Workflower currently registers one generated command per workflow:

```text
/wf:<workflow-id>
```

Change generated command registration so it only registers workflows where:

```ts
workflow.userInvocable !== false
```

Hidden workflows must not appear in:

- TUI slash autocomplete;
- extension command lists returned by `pi.getCommands()`;
- RPC `get_commands` results;
- user-facing generated command smoke tests.

Because those surfaces derive from registered commands, not registering is the clean hiding mechanism.

### Manual handoff through slash commands

When a workflow is active, users can currently run:

```text
/wf:<next-workflow-id>
```

For `userInvocable: false`, that command should not exist, so manual handoff is blocked along with initial starts.

### Exact typed hidden command guard

If a user knows the hidden id and types:

```text
/wf:counter-loop
```

Pi will not find an extension command because Workflower did not register it. Without a guard, the text may continue as a normal prompt to the model.

Add an `input` handler in Workflower that:

1. checks raw input before skill/template expansion;
2. matches `/wf:<workflow-id>` at the start of the input;
3. finds the workflow in the registry;
4. if `workflow.userInvocable === false`, notifies the user and returns `{ action: "handled" }`.

Suggested message:

```text
Workflow counter-loop is not user-invokable.
```

This guard should only block registered hidden workflows. Unknown `/wf:<id>` input can continue to existing behavior.

### Handoff tool visibility

Update `workflower_handoff` so it rejects workflows where:

```ts
workflow.modelInvocable === false
```

Suggested failure message:

```text
Workflow <id> is not model-invokable.
```

Do not reject workflows solely because `userInvocable === false`.

### `/wf list` and `/wf status`

No change required for active-state visibility in this iteration.

- `/wf status` should still show the current active workflow, even if it is not user-invokable.
- `/wf list` should still show active states, including hidden workflow ids, because it is an active-state inspection command rather than a command discovery surface.

If that is later considered too visible, add a separate active-state display policy; do not overload `userInvocable`.

## Files to change

### `packages/workflower/extension-src/workflower/package-api/workflow-definition.types.ts`

Add fields to `WorkflowDefinition`:

```ts
/** Whether Workflower should register /wf:<id> for user invocation. Defaults to true. */
userInvocable?: boolean;

/** Whether workflower_handoff may start this workflow. Defaults to true. */
modelInvocable?: boolean;
```

### `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/generated-starts/watch-startable-workflows.ts`

Filter startable workflows:

```ts
export function listStartableWorkflows(): WorkflowDefinition[] {
  return listWorkflows().filter((workflow) => workflow.userInvocable !== false);
}
```

For late registration listeners, only notify for user-invokable workflows:

```ts
export function onStartableWorkflowRegistered(
  listener: (workflow: WorkflowDefinition) => void,
): () => void {
  return onWorkflowRegistered((workflow) => {
    if (workflow.userInvocable !== false) listener(workflow);
  });
}
```

### New input guard module

Create something like:

```text
packages/workflower/extension-src/workflower/internals/pi-adapter/events/block-hidden-workflow-input.ts
```

Suggested behavior:

```ts
pi.on("input", (event, ctx) => {
  const match = event.text.trim().match(/^\/wf:([a-z0-9_-]+)(?:\s|$)/);
  if (!match) return;

  const workflow = findWorkflow(match[1]);
  if (!workflow || workflow.userInvocable !== false) return;

  ctx.ui.notify(`Workflow ${workflow.id} is not user-invokable.`, "error");
  return { action: "handled" as const };
});
```

Register it from:

```text
packages/workflower/extension-src/workflower/internals/pi-adapter/register-extension.ts
```

### `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/handoff/handoff-workflow-by-id.ts`

After finding the workflow, reject only `modelInvocable: false`:

```ts
if (workflow.modelInvocable === false) {
  return failure(`Workflow ${workflowId} is not model-invokable.`);
}
```

### `packages/feature-workflow/extension-src/feature-workflow/package-api/counter-loop-workflow.ts`

Mark the loop workflow hidden from users but still handoff-enabled:

```ts
export const counterLoopWorkflow: WorkflowDefinition = {
  id: "counter-loop",
  userInvocable: false,
  modelInvocable: true,
  // existing fields...
};
```

This gives a concrete smoke-test workflow for the behavior.

## Tests to add/update

### Workflower tests

Add coverage in `packages/workflower/tests/workflower.test.ts` or a focused new test file.

1. **Does not register hidden workflow command**
   - Register a workflow with `userInvocable: false`.
   - Initialize Workflower.
   - Assert `pi.commands["wf:<id>"]` is `undefined`.

2. **Registers normal workflow command by default**
   - Existing tests should continue proving default behavior.
   - Add an explicit assertion if useful.

3. **Does not register late hidden workflow command**
   - Initialize Workflower.
   - Register a new workflow with `userInvocable: false`.
   - Assert no generated command appears.

4. **Blocks exact hidden workflow input**
   - Register hidden workflow.
   - Run the Workflower input handler with `/wf:<id>`.
   - Assert it returns `{ action: "handled" }` and notifies with an error.

5. **Handoff can start user-hidden workflow**
   - Register a target workflow with `userInvocable: false` and default/true `modelInvocable`.
   - Create an active source workflow state.
   - Call `workflower_handoff` with the target id.
   - Assert success and active state moves to the target.

6. **Handoff rejects model-hidden workflow**
   - Register a target workflow with `modelInvocable: false`.
   - Create an active source workflow state.
   - Call `workflower_handoff`.
   - Assert failure and active state remains unchanged.

7. **`/wf status` still reports hidden active workflow**
   - Manually write active state for a hidden workflow.
   - Run `/wf status`.
   - Assert status includes the workflow id and step details.

### Feature-workflow tests

Update `packages/feature-workflow/tests/feature-workflow.test.ts` expectations:

- `counter-loop` workflow definition includes `userInvocable: false`.
- After registering feature workflow, `pi.commands["wf:counter-loop"]` should be `undefined`.
- Other public workflows remain command-visible:
  - `wf:new-feature`
  - `wf:take-it-away`
  - `wf:counter`

## README/docs updates

Update `packages/workflower/README.md`:

- document `userInvocable` and `modelInvocable` defaults;
- explain hidden workflows are still valid handoff targets unless model invocation is disabled;
- explain hidden workflows do not register `/wf:<id>`.

Update `packages/feature-workflow/README.md`:

- explain `counter-loop` is an internal handoff workflow;
- users start `/wf:counter`, not `/wf:counter-loop`.

## Skill hiding notes for later

This handoff focuses on workflow command hiding. Skill hiding needs a separate design because Pi package `pi.skills` are loaded by Pi before Workflower can filter them.

A future Workflower-private skill design could preserve step commands like:

```ts
command: "/skill:counter-increment"
```

while resolving private workflow skill files through Workflower before falling back to Pi's global skill registry. That would allow workflow-only skills to avoid Pi's skill registry entirely.

Do not include that in the first command-hiding implementation unless explicitly requested.

## Validation commands

For runtime/package changes:

```bash
cd packages/workflower
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

For feature workflow definition/test changes:

```bash
cd packages/feature-workflow
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
