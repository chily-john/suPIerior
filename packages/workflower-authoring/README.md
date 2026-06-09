# @supierior/workflower-authoring

Standalone Pi skill package for creating Workflower workflow packages.

Install this package when you want to ask Pi to scaffold or modify a workflow package. It does not load the Workflower runtime extension itself; generated workflow packages should depend on `@supierior/workflower` and initialize it from their extension entrypoint.

## Skill

```text
/skill:workflower-authoring create a workflow for <goal>
```

The skill helps an agent:

- design a workflow id and step list;
- choose step commands and companion skills;
- scaffold a Pi package that registers a `WorkflowDefinition`;
- organize generated TypeScript workflow packages with a small entrypoint, `package-api/` for public workflow contracts, and `internals/pi-adapter/` for Pi runtime lifecycle code;
- add package metadata that loads the generated extension and skills;
- document a smoke test using `/wf:<workflow-id> <workflow-name>` and `/next`.

## Why standalone?

Authoring workflows and running workflows are separate concerns:

- `@supierior/workflower-authoring` teaches Pi how to create workflow packages.
- `@supierior/workflower` provides the runtime commands and workflow state handling.
- Generated workflow packages can depend on `@supierior/workflower` internally so users install only the workflow package they intend to run. The authoring guidance follows the repository architecture notes for AI-navigable package structure without adding unnecessary folders to this small Markdown-only skill package.
