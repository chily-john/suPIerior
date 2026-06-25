# @supierior/experimental-workflows

Pi Workflower package for cool experimental workflows that are useful as playgrounds for engine patterns, even when they do not have a practical product purpose.

This package depends on `@supierior/workflower` and registers experimental workflows as workflow-only skills and commands.

It currently registers these workflows:

```text
counter
counter-loop
stateful-grilling
stateful-grilling-finalize
```

## `counter` and `counter-loop`

Workflow ids: `counter`, `counter-loop`

Use these tiny workflows to play with Workflower handoffs, garden state, and loop-style repetition through skills.

The `counter` workflow initializes the active garden state key `counter` from user-provided integer values, then hands off to `counter-loop` by calling Workflower's `workflower_handoff` tool. The `counter-loop` workflow reads that garden state, increments `current`, saves the updated `counter` value, and either calls `workflower_handoff` for another `counter-loop` flower when `current < end` or stops when `current >= end`.

`counter-loop` is an internal handoff workflow: it does not register a user-facing `/wf:counter-loop` command. Users start `/wf:counter`; the loop is entered and repeated through `workflower_handoff`. The counter workflows use `workflower_state_get` and `workflower_state_set` instead of output files or pollen.

During the active garden, the state is stored at:

```text
.workflower/workflows/<garden>/state.json
```

### Smoke test

```text
/wf:counter demo-counter
```

Enter a starting value and ending value when prompted. After the `counter` garden state is saved, run:

```text
/next
```

The loop handoff and later loop iterations are configured to auto-advance.

## `stateful-grilling`

Workflow ids: `stateful-grilling`, `stateful-grilling-finalize`

Use this workflow to demonstrate a state-cleared interview loop. The public `stateful-grilling` workflow asks the user 1-3 focused feature-discovery questions, then updates the active garden state key `statefulGrilling.feature` with a durable feature understanding and an `understandingPercent` estimate. If the estimate is below 95%, the workflow hands off to another `stateful-grilling` flower so the next mini-interview starts with cleared context and only the garden state as durable memory.

When the estimate reaches 95% or higher, the workflow hands off to the hidden `stateful-grilling-finalize` workflow, which writes the final artifact:

```text
.workflower/workflows/<garden>/<sequence>-stateful-grilling-finalize/feature-description.md
```

The final workflow sets `cleanupOnCompletion: false`, so the final document remains after completion while loop flowers can be cleaned up.

### Smoke test

```text
/wf:stateful-grilling demo-feature
```

Answer the mini-interview questions. When ready for the workflow to consolidate that mini-conversation, run:

```text
/next
```

The update step auto-advances into routing. Routing uses Workflower handoff tools for loops or finalization, and the final document generation step auto-completes.

## Useful Workflower commands

```text
/wf status
/wf stop
/wf list
```
