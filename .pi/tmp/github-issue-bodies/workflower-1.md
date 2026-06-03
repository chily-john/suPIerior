## Goal

Create the Workflower package and deliver the first usable end-to-end behavior: a user can start a known workflow, Workflower persists active state, creates the workflow workdir, opens a fresh Pi session, and sends the step-0 kickoff prompt.

## Vertical slice

A user can run `/workflow start feature-to-github-issues <workflow-name>` and land in a fresh session ready to execute the first workflow step.

## Dependencies

- None. This is the foundation slice for Workflower V1.
- Blocks: #56 (/next advancement), #57 (status/cancel lifecycle), and #58 (final V1 command validation).

## Scope

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
    { id: "create-github-issues", command: "/github-create-issues" },
  ],
});
```

- Implement workdir path generation: `.pi/workflows/<workflow-type>/<workflow-name>/`.
- Implement durable active-state storage at `.pi/tmp/workflows/active.json`.
- Write active state with `workflowId`, `type`, `name`, `workdir`, `currentStepIndex`, `startedAt`, and `updatedAt`.
- Generate the kickoff prompt for step 0, including workflow id/type/name, workdir, current step id/command, expected outputs, and the instruction to use `/next` after user verification.
- Use `ctx.newSession()` and send the kickoff prompt inside `withSession` via the replacement context.
- Handle user-facing start failures in this slice:
  - unknown workflow id;
  - existing active workflow;
  - invalid/missing arguments;
  - workdir/state write failure;
  - cancelled or failed session creation.

## TDD / red-green plan

- **Red:** Add tests for extension/package smoke loading, `defineWorkflow()`, registry lookup, path generation, active-state write/read, deterministic prompt generation, `/workflow start` success, and all listed failure paths.
- **Green:** Implement only enough package, registry, state, prompt, and command code to make start work end-to-end.
- **Refactor:** Separate generic runner modules from concrete workflow definitions once tests are green.

## Documentation updates

Add initial package README or docs covering what Workflower is, `/workflow start <workflow-id> <workflow-name>`, state/artifact locations, the included sample workflow, and relevant V1 non-goals.

## Acceptance criteria

- [ ] `packages/workflower` exists as a new workspace package and builds/typechecks.
- [ ] `/workflow start feature-to-github-issues <workflow-name>` is registered and starts step 0 in a fresh session.
- [ ] Workdir and active state are created on disk before the fresh session is launched.
- [ ] The step-0 prompt includes expected output paths resolved relative to the workdir.
- [ ] Unknown workflow ids, invalid usage, existing active workflows, filesystem failures, and session replacement failures are reported clearly.
- [ ] Generic Workflower modules do not depend on feature-planning-specific logic.
- [ ] Tests and docs for the delivered start behavior are included.
