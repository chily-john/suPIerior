# @supierior/workflower-authoring

Standalone Pi skill package for creating Workflower workflow packages.

Install this package when you want to ask Pi to scaffold or modify a workflow package. It does not load the Workflower runtime extension itself; generated workflow packages should depend on `@supierior/workflower` and initialize it from their extension entrypoint.

## Skill

```text
/skill:workflower-authoring create a workflow for <goal>
```

The skill helps an agent:

- design a folder-safe workflow id and step list;
- choose step commands and companion skills;
- scaffold a Pi package that registers a `WorkflowDefinition`;
- organize generated TypeScript workflow packages with a small entrypoint, `package-api/` for public workflow contracts, and `internals/pi-adapter/` for Pi runtime lifecycle code;
- teach the garden/flower artifact model, including `.pi/workflows/<garden-name>/0001-<workflow-id>/` and each flower's `index.json`;
- configure workflow-level `model` and `thinkingLevel` defaults, optional step-level runtime overrides, and workflow-level `pollen`/`acceptPollen` when chained workflows should pass or ignore previous flower outputs;
- add package metadata that loads the generated extension and skills;
- document a smoke test using `/wf:<workflow-id> <garden-name>`, optional active handoff with `/wf:<next-workflow-id>`, and `/next`.

## Why standalone?

Authoring workflows and running workflows are separate concerns:

- `@supierior/workflower-authoring` teaches Pi how to create workflow packages.
- `@supierior/workflower` provides the runtime commands and workflow state handling.
- Generated workflow packages can depend on `@supierior/workflower` internally so users install only the workflow package they intend to run. The authoring guidance follows the repository architecture notes for AI-navigable package structure without adding unnecessary folders to this small Markdown-only skill package.

## Runtime model taught by this package

Generated guidance should align with Workflower's garden/flower model:

- Workflow ids must be folder-safe (`^[a-z0-9_-]+$`) because ids become `/wf:<workflow-id>` commands and flower folder names.
- Start a fresh garden with `/wf:<workflow-id> <garden-name>`.
- While a workflow is active, hand off to another workflow in the same garden with `/wf:<next-workflow-id>` and no garden name.
- Artifacts live in flower folders such as `.pi/workflows/<garden-name>/0001-<workflow-id>/`; each flower has an `index.json` recording status and pollen paths.
- Use workflow-level `model` and `thinkingLevel` as defaults for all steps; step-level runtime settings override only the current step before falling back to workflow settings and then starting defaults.
- Use workflow-level `pollen` and `acceptPollen` to control which output paths are referenced during handoff.
- Cleanup waits until the whole garden completes; handoffs preserve previous flowers for pollen and inspection.
