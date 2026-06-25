---
name: workflower-authoring
description: Creates or modifies Pi Workflower workflow packages, workflow definitions, and companion step skills. Use when a user asks Pi to create, scaffold, or update a Workflower workflow.
allowed-tools: read write edit bash
---

# Workflower Authoring

Use this skill when the user wants a Workflower workflow created or changed.

This is a standalone authoring skill. The user does not need to install or run `@supierior/workflower` just to use this skill. Generated workflow packages should depend on `@supierior/workflower` internally and initialize it from their extension entrypoint, so workflow users can install the generated workflow package rather than manually installing Workflower first.

Workflower runs garden-scoped multi-step workflows. Start the first flower with `/wf:<workflow-id> <garden-name>`, hand off to another workflow while active with `/wf:<next-workflow-id>`, and advance steps with `/next`. A workflow package usually registers a `WorkflowDefinition` from a Pi extension entrypoint and may ship companion skills used by each step.

## First, clarify the workflow

Ask only for missing information. Gather:

1. Workflow id, for example `feature`, `github_issue`, or `release-notes`.
2. Initial garden name example for README smoke tests, such as `demo-garden`.
3. What the workflow should accomplish.
4. Step list, including each step's purpose.
5. Command for each step. Prefer `/skill:<skill-name>` when the step should be implemented by a bundled skill.
6. Expected output files for each step, if any.
7. Pollen behavior:
   - pass the latest completed step outputs by default when handing off to another workflow;
   - set workflow-level `pollen` when only specific output path(s) should be pinned and handed off;
   - set workflow-level `acceptPollen: false` when a workflow should ignore incoming pollen paths from a previous flower.
8. Lifecycle preferences:
   - preserve artifacts after final garden completion? Set `cleanupOnCompletion: false`.
   - keep same visible session on start? Set `clearOnStart: false`.
   - keep same visible session on completion? Set `clearOnCompletion: false`.
   - keep context between specific steps? Set that step's `clearOnNext: false`.
   - immediately advance after a step finishes? Set that step's `autoNext: true`.

## Validate the design

Before writing files:

- Workflow ids must be folder-safe and match `^[a-z0-9_-]+$`: lowercase ASCII letters, digits, underscores, and hyphens only. Do not use colon-separated, uppercase, whitespace, slash, dot-segment, or quoted ids.
- The initial garden name is provided by the user at runtime with `/wf:<workflow-id> <garden-name>` and becomes `.workflower/workflows/<garden-name>/`.
- The first workflow execution creates a flower workdir like `.workflower/workflows/<garden-name>/0001-<workflow-id>/` and a flower index at `.workflower/workflows/<garden-name>/0001-<workflow-id>/index.json`.
- While a workflow is active, hand off to another workflow with `/wf:<next-workflow-id>` and no garden name; Workflower creates the next flower in the same garden, such as `.workflower/workflows/<garden-name>/0002-<next-workflow-id>/`.
- Step ids should be short, stable, lowercase kebab-case.
- Step commands should exist or be created as bundled skills/commands.
- Output paths should be relative file paths under the workflow workdir.
- If a skill writes an output, its instructions must mention the exact output filename declared in the workflow definition.
- If a skill reads a previous output, its instructions must read from the previous-step output path provided by the kickoff prompt.

## Minimal workflow package shape

For a new package, create this structure. In a monorepo it may live under `packages/<package-name>/`; in a standalone repo it can live at the repository root.

```text
<package-root>/
├── extension-src/<package-name>/
│   ├── index.ts
│   ├── package-api/
│   │   └── my-workflow.ts
│   └── internals/
│       └── pi-adapter/
│           └── register-extension.ts
├── skills/<step-skill>/SKILL.md       # when using skill-backed steps
├── package.json
├── README.md
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

Use an existing small workflow package as a scaffold when available, but prefer the architecture above for new packages.

## Architecture guidance

Generated TypeScript workflow packages should follow the suPIerior package architecture direction:

- Keep the root extension entrypoint small and stable.
- Put exported workflow definitions or public contracts under `package-api/`.
- Put Pi runtime lifecycle code under `internals/pi-adapter/`.
- If the workflow needs substantial non-Pi logic, put it under `internals/<domain-capability>/` using workflow domain language, not generic names like `utils` or `helpers`.
- Keep adapter imports one-way: Pi adapter code may import workflow definitions and internal logic; internal workflow logic should not import the Pi adapter or root entrypoint.
- Do not create empty architecture folders for tiny packages; add seams when they clarify navigation.

Markdown-only companion skill packages can stay simple. If a skill grows beyond one `SKILL.md` plus a few directly referenced files, use an analogous split with `SKILL.md`, `skill-api/`, and `internals/`.

## Extension entrypoint templates

`extension-src/<package-name>/index.ts`:

```ts
export { myWorkflow } from "./package-api/my-workflow";
export { default } from "./internals/pi-adapter/register-extension";
```

`extension-src/<package-name>/package-api/my-workflow.ts`:

```ts
import type { WorkflowDefinition } from "@supierior/workflower";

export const myWorkflow: WorkflowDefinition = {
  id: "my-workflow",
  cleanupOnCompletion: false,
  model: ["openai-codex/gpt-5.3-codex-spark"],
  thinkingLevel: "medium",
  pollen: "second-step.md",
  acceptPollen: true,
  steps: [
    {
      id: "first-step",
      command: "/skill:my-first-step",
      outputs: ["first-step.md"],
      thinkingLevel: "high",
      clearOnNext: false,
    },
    {
      id: "second-step",
      command: "/skill:my-second-step",
      outputs: ["second-step.md"],
    },
  ],
};
```

`extension-src/<package-name>/internals/pi-adapter/register-extension.ts`:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { myWorkflow } from "../../package-api/my-workflow";

export default function myWorkflowExtension(pi: ExtensionAPI): void {
  registerWorkflow(myWorkflow);
  setupWorkflower(pi);
}
```

Use `setupWorkflower(pi)` in workflow packages so installing the workflow package also initializes Workflower's `/wf`, `/wf:<id>`, and `/next` commands.

Workflow-level `model` and `thinkingLevel` set defaults for every step. Step-level `model` and `thinkingLevel` override those defaults for only that step; the next step falls back to the workflow settings, then the model and thinking level that were active when the garden started. `model` accepts a `provider/model-id` string or an ordered fallback array.

Workflow-level `pollen?: string | string[]` pins the output path or paths that should be referenced when another workflow is started in the same garden. If omitted, completed step outputs become unpinned pollen as `/next` advances. Workflow-level `acceptPollen?: boolean` defaults to `true`; set `acceptPollen: false` when a workflow should not receive previous flower pollen paths in its kickoff prompt. Pollen paths are referenced from the previous flower's `index.json`; files are not copied into the new flower.

## Garden state and deterministic routing

Use Workflower garden state for small structured facts that must survive context-clearing boundaries or drive deterministic routing. State lives at `.workflower/workflows/<garden-name>/state.json`, is shared by all flowers in the garden, and is deleted on final garden completion. Use output files for large artifacts: do not use state for large reports, logs, diffs, or plans; write those as declared output files instead.

When authoring workflows and companion skills:

- Declare expected state keys in README and skill instructions, for example `review.rating`, `review.summary`, and `review.required_changes`.
- Tell agents exactly when to call `workflower_state_set` and which JSON value shape to write.
- Tell agents to use `workflower_state_get` when a later step depends on previously saved state.
- Use code/router commands or model-callable tools for deterministic branching, then call `createWorkflowerRuntime(pi, ctx).handoff(...)` or the `workflower_handoff` tool.
- For autonomous branching, prefer a model-callable router tool. Do not rely on assistant text to invoke `/wf:<id>` or `/review-route`; printed slash commands are not executed by Pi.

Example reviewer instruction:

```markdown
After writing `implementation-review.md`, call `workflower_state_set` three times:

1. `{ "key": "review.rating", "value": <integer 1-5> }`
2. `{ "key": "review.summary", "value": "<one-sentence summary>" }`
3. `{ "key": "review.required_changes", "value": ["<change>"] }`
```

Example deterministic router:

```ts
const rating = await wf.state.getValue("review.rating");
const nextWorkflow =
  typeof rating === "number" && rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
await wf.handoff(nextWorkflow);
```

## Compact kickoff prompt display

Current Workflower shows generated workflow kickoff prompts compactly in chat. A user may see only a label such as `Workflow: my-workflow — demo-garden` or `Step: first-step` instead of the whole generated prompt.

Teach junior workflow authors these rules:

- The model still receives the full kickoff prompt, including workflow id, garden name, workdir, previous pollen paths, previous outputs, expected output paths, and expanded private skill instructions.
- Private Workflower skills may be injected into model context even when their Markdown body is not visible in the transcript. Do not rely on visible transcript content to verify full private skill injection.
- This is not a token-saving feature. Keep workflow prompts and private skills concise because the full prompt still uses context.
- Assistant text that prints `/wf:<id>`, `/next`, or a router command does not execute that slash command. Autonomous workflow movement should call `workflower_handoff` or a deterministic model-callable router tool instead.

## Step skill template

```markdown
---
name: my-first-step
description: Performs the first step of the my-workflow Workflower workflow and writes first-step.md.
allowed-tools: read write edit bash
---

# My First Step

You are step 1 of the `my-workflow` Workflower workflow.

## Goal

Describe the concrete outcome of this step.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, garden name, active flower workdir, previous pollen paths, previous outputs, and expected output paths.
2. Create the declared output file: `first-step.md`.
3. Write the file at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
4. If this step is expected to write garden state, call `workflower_state_set` with the exact documented key names and JSON-compatible values.
5. Tell the user what was written and, unless this step has `autoNext: true`, tell them to inspect the output and run `/next` when ready.
```

## package.json requirements

A workflow package should include:

```json
{
  "keywords": ["pi-package", "pi", "workflow", "workflower"],
  "dependencies": {
    "@supierior/workflower": "workspace:*"
  },
  "peerDependencies": {
    "@mariozechner/pi-coding-agent": "*"
  },
  "pi": {
    "extensions": ["./dist/index.mjs"],
    "skills": ["./skills"]
  }
}
```

For published packages outside this monorepo, replace `workspace:*` with a real `@supierior/workflower` version/range. Follow current Pi package dependency rules for the target distribution method; if publishing an npm Pi package that depends on another Pi package, consider adding `@supierior/workflower` to `bundledDependencies` so the generated package is self-contained for users.

## README smoke test

Document how to run the workflow from a fresh session:

```text
/wf:<workflow-id> <garden-name>
```

Then after each non-auto step:

```text
/next
```

If the README demonstrates chaining to another workflow while active, use the handoff form with no garden name:

```text
/wf:<next-workflow-id>
```

Also mention:

```text
/wf status
/wf stop
/wf list
```

and where artifacts are written:

```text
.workflower/workflows/<garden-name>/0001-<workflow-id>/
.workflower/workflows/<garden-name>/0001-<workflow-id>/index.json
```

Cleanup waits until the whole garden completes. Handoffs preserve earlier flowers so their pollen can be referenced by later workflows; final `/next` cleanup applies each flower's producing workflow `cleanupOnCompletion` setting.

## Final checklist

Before finishing:

- The workflow is registered exactly once during extension startup.
- The package initializes Workflower with `setupWorkflower(pi)`.
- Every `/skill:<name>` command has a matching bundled skill.
- Skill instructions and workflow `outputs` agree.
- The package manifest loads both extension and skills.
- The README includes a copy-paste smoke test using `/wf:<workflow-id> <garden-name>`.
- The README and bundled skills explain active handoff with `/wf:<next-workflow-id>` when relevant.
- The README or workflow usage notes explain compact prompt display and warn authors not to verify private skill injection by visible transcript content alone.
- Artifact examples use `.workflower/workflows/<garden-name>/0001-<workflow-id>/` flower paths and mention `index.json`.
- Workflow-level `pollen` and `acceptPollen` choices are documented when handoff behavior matters.
- Expected garden state keys and `workflower_state_set` calls are documented when state drives later steps or routing.
- Deterministic routers are implemented as commands/tools or extension code, not as printed slash-command text.
- Cleanup timing is clear: flower artifacts are cleaned only after final garden completion, not during handoff; garden state is also deleted on final completion.
- Run package-local validation when practical: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
