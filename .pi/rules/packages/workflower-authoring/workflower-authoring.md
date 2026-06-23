---
kind: rules
paths:
  - "packages/workflower-authoring/**/*"
summary: Standalone Pi skill package for authoring Workflower workflow packages.
triggers:
  - workflower-authoring
  - workflower authoring
  - workflow package skill
  - create Workflower workflow
  - scaffold workflow package
---

# Workflower Authoring

Enter here when changing the standalone skill package that teaches Pi agents how to create or modify Workflower workflow packages. Keep this package skill-only: it should not load the Workflower runtime extension or require users to install `@supierior/workflower` just to ask Pi to scaffold a workflow.

## Subdirectories

| Directory | When to enter |
| --------- | ------------- |
| `skills/` | Editing the Workflower workflow-package authoring instructions, templates, validation checklist, or packaging guidance. |

## Package Rules

- Keep `@supierior/workflower-authoring` independent of the Workflower runtime at install time; generated workflow packages should depend on `@supierior/workflower` themselves.
- Optimize instructions for agents creating packages for users, not for humans reading Workflower runtime internals.
- Keep examples simple and aligned with the public Workflower API: `registerWorkflow`, `WorkflowDefinition`, default `setupWorkflower(pi)`, workflow/step runtime settings, and `createWorkflowerRuntime` when relevant.
- For package structure guidance, distinguish monorepo package paths from standalone package roots.
- When garden state drives later steps or routing, require explicit state keys, `workflower_state_set` instructions, and deterministic router commands/tools instead of printed slash commands.
- When explaining compact kickoff display, clarify that full prompts still enter model context and hidden private skill text may still be injected.
- This is a Markdown-only Pi skill package; avoid extension runtime code unless the package purpose changes explicitly.
