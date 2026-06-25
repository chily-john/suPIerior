# Counter Loop Handoff Contract

The `counter` and `counter-loop` workflows demonstrate Workflower garden state handoff.

## Workflow responsibilities

- `counter` initializes the shared `counter` garden state and hands off to `counter-loop`.
- `counter-loop` increments `current`, then decides whether to hand off to another `counter-loop` flower.
- `counter-loop` is model-invocable and not user-invocable. Users start `/wf:counter`.

## Handoff rules

- Use the `workflower_handoff` tool with workflowId `"counter-loop"` to continue the loop.
- Do not print or send `/wf:counter-loop` as text; assistant text does not execute slash commands.
- Do not pass a garden name. Workflower is already active and will hand off inside the current garden.

## Completion rule

After incrementing, compare `current` with `end`:

- if `current < end`, hand off to another `counter-loop` workflow;
- if `current >= end`, do not hand off and report that the counter loop is complete.
