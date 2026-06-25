# Stateful Grilling Loop Contract

The user starts the public workflow with:

```text
/wf:stateful-grilling <garden-name>
```

Looping is internal and tool-driven:

- Use `workflower_handoff` when continuing or finalizing the active garden.
- Do not print or send `/wf:stateful-grilling` or `/wf:stateful-grilling-finalize` as text when a handoff is required.
- Do not pass a garden name during handoff; Workflower keeps the current garden.
- `stateful-grilling` performs another cleared-context mini-interview loop.
- `stateful-grilling-finalize` writes the final `feature-description.md` artifact.
- The final workflow has `cleanupOnCompletion: false`, so its flower directory and output file remain after completion while earlier loop flowers can be cleaned up.
