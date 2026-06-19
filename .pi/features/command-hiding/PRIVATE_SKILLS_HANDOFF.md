# Workflower Private Skills Handoff

## Goal

Add **Workflower-private skills**: skill-like Markdown instructions that workflow steps can use without registering those skills with Pi's global skill registry.

Today, installable package skills are exposed through `package.json`:

```json
{
  "pi": {
    "skills": [
      "./extension-src/feature-workflow/internals/skills"
    ]
  }
}
```

That makes those skills globally visible/invokable as Pi skills. For workflow-only instructions, that is too much surface area.

Desired outcome:

- Workflow-only skills do **not** appear in Pi skill autocomplete.
- Workflow-only skills do **not** appear in the model's general `<available_skills>` prompt.
- Workflow-only skills cannot be manually invoked by users as `/skill:<name>`.
- Workflow steps can still use the familiar command syntax:

  ```ts
  command: "/skill:new-feature-grill"
  ```

- Workflower detects that `new-feature-grill` is a private Workflower skill and injects the skill body only for the active workflow step.
- Public/user-installed Pi skills still work as they do today.

This should be implemented with **vertical tracer bullets** and **TDD**. Do not attempt the whole feature in one large pass.

## Important design decisions

### 1. Keep workflow step syntax unchanged

Use the existing syntax:

```ts
command: "/skill:some-skill"
```

Do **not** introduce `wskill:` in this iteration.

Reasoning:

- Smaller API surface.
- Existing workflow definitions remain valid.
- Workflow authors do not need to learn another command scheme.
- Resolver order can distinguish private Workflower skills from public Pi skills.

### 2. Add `pi.workflowerSkills` to package manifests

Packages can declare Workflower-private skills under a new, Pi-ignored manifest key:

```json
{
  "pi": {
    "extensions": ["./dist/index.mjs"],
    "skills": [
      "./node_modules/@supierior/ruleplementor/skills"
    ],
    "workflowerSkills": [
      "./extension-src/feature-workflow/internals/skills"
    ]
  }
}
```

Pi currently ignores unknown manifest keys, so `workflowerSkills` will not be loaded into Pi's public skill registry.

Workflower will read this key itself.

### 3. Workflower cannot infer the caller package automatically

`import.meta.url` is lexical. Inside `@supierior/workflower`, it points to Workflower's module, not the calling package.

So package extensions must pass their own module URL:

```ts
setupWorkflower(pi, { packageUrl: import.meta.url });
```

Workflower can then:

1. convert `packageUrl` to a filesystem path;
2. walk upward to the package root containing `package.json`;
3. read `package.json.pi.workflowerSkills`;
4. resolve those paths relative to the package root;
5. load private skill files into Workflower's own private registry.

Do not use stack trace caller detection. It is fragile across bundlers, ESM/CJS, sourcemaps, minification, and tests.

### 4. Private skills are resolved before public Pi skills

When Workflower starts a workflow step whose command is `/skill:<name>`:

1. Check Workflower's private skill registry for `<name>`.
2. If found, inject the private skill content.
3. If not found, keep current behavior for public Pi skills or other commands.

This gives package authors a simple rule:

- Put a skill in `pi.skills` if it should be public.
- Put a skill in `pi.workflowerSkills` if it should only be used by workflows.

### 5. Injection should happen from Workflower, not Pi

Current Workflower step kickoff prompts say something like:

```text
Execute this command: /skill:new-feature-grill
```

However, Workflower sends that kickoff prompt through `pi.sendUserMessage()`, and Pi extension-sent user messages do not expand `/skill:*` the same way user-submitted slash skill commands do.

So Workflower must explicitly resolve and inject private skill instructions when rendering or sending the step kickoff prompt.

## User-facing examples

### Package manifest

Before:

```json
{
  "pi": {
    "extensions": ["./dist/index.mjs"],
    "skills": [
      "./extension-src/feature-workflow/internals/skills",
      "./node_modules/@supierior/ruleplementor/skills"
    ]
  }
}
```

After:

```json
{
  "pi": {
    "extensions": ["./dist/index.mjs"],
    "skills": [
      "./node_modules/@supierior/ruleplementor/skills"
    ],
    "workflowerSkills": [
      "./extension-src/feature-workflow/internals/skills"
    ]
  }
}
```

### Extension registration

Before:

```ts
setupWorkflower(pi);
```

After:

```ts
setupWorkflower(pi, { packageUrl: import.meta.url });
```

### Workflow step definition

No change:

```ts
{
  id: "grill-feature",
  command: "/skill:new-feature-grill",
  outputs: ["feature-summary.md"],
}
```

### User behavior

A user should not see this skill in autocomplete:

```text
/skill:new-feature-grill
```

A user should not be able to start it directly because it is not registered with Pi as a public skill.

But when the workflow reaches the step, Workflower should inject the skill instructions into the kickoff prompt for the agent.

## Suggested API changes

### `setupWorkflower` options

Add an optional second parameter:

```ts
export type WorkflowerSetupOptions = {
  /** URL or file path for the calling package extension module. Used to locate package.json. */
  packageUrl?: string;
};

export default function setupWorkflower(
  pi: ExtensionAPI,
  options?: WorkflowerSetupOptions,
): void;
```

Use `packageUrl`, not `packageRoot`, because callers can pass the obvious standard value:

```ts
import.meta.url
```

That avoids making callers calculate paths.

### Private skill registry API

Keep this internal at first.

Suggested internal API:

```ts
export type WorkflowerPrivateSkill = {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
};

export function registerPrivateSkill(skill: WorkflowerPrivateSkill): void;
export function findPrivateSkill(name: string): WorkflowerPrivateSkill | undefined;
export function listPrivateSkills(): WorkflowerPrivateSkill[];
export function clearPrivateSkillsForTests(): void;
```

Potential module location:

```text
packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/private-skills/private-skill-registry.ts
```

Keep this separate from workflow registry state.

### Private skill loading from package manifests

Suggested internal API:

```ts
export function loadPackageWorkflowerSkills(packageUrl: string): WorkflowerPrivateSkillLoadResult;
```

Potential module location:

```text
packages/workflower/extension-src/workflower/internals/pi-adapter/private-skills/load-package-workflower-skills.ts
```

It belongs in `pi-adapter` if it is tied to package/extension setup. Pure Markdown skill parsing can live deeper in orchestration if desired.

Return structured diagnostics instead of throwing for normal author mistakes:

```ts
export type WorkflowerPrivateSkillLoadResult = {
  skills: WorkflowerPrivateSkill[];
  diagnostics: WorkflowerPrivateSkillDiagnostic[];
};

export type WorkflowerPrivateSkillDiagnostic = {
  level: "warning" | "error";
  message: string;
  path?: string;
};
```

## Skill file parsing rules

Private Workflower skills should use the same `SKILL.md` shape as Pi skills:

```md
---
name: new-feature-grill
description: Ask clarifying questions and produce a feature summary.
---

# New Feature Grill

...
```

Implement only the minimum parser needed for this feature:

- read Markdown file;
- parse YAML-ish frontmatter;
- require `description`;
- use `name` from frontmatter or fallback to parent folder name;
- `filePath` is absolute;
- `baseDir` is the parent directory of `SKILL.md`.

Prefer reusing Pi's skill parsing only if it is exported as public API. If it is not public/exported, do not import private Pi internals.

Acceptable lightweight implementation:

- parse frontmatter between leading `---` fences;
- support simple `key: value` string/boolean lines;
- ignore unknown fields;
- do not attempt full YAML unless a dependency already exists in this package.

## Injection behavior

When the active workflow step command is:

```text
/skill:<name> [args]
```

and `<name>` is a private Workflower skill, render the command as a full skill block, similar to Pi's expansion:

```xml
<skill name="new-feature-grill" location="/abs/path/to/SKILL.md">
References are relative to /abs/path/to/skill-dir.

...skill body without frontmatter...
</skill>

...optional args...
```

Then the kickoff prompt can say something like:

```text
Execute this Workflower private skill for the current workflow step:

<skill name="new-feature-grill" location="...">
...
</skill>
```

Be explicit that this is the current workflow step's instruction. Avoid making the model choose among private skills.

### Resolver rules

Given a step command string:

```text
/skill:new-feature-grill --some args
```

Parse:

- skill name: `new-feature-grill`
- args: `--some args`

Only private skill injection should happen for exact `/skill:` commands at the beginning of the step command. Do not scan arbitrary prompt text for `/skill:` in this iteration.

## TDD plan using tracer bullets

Use small vertical slices. Each slice should include a failing test first, minimal production code, then refactor.

### Tracer bullet 1: package manifest discovery

Goal: Given a package module URL, Workflower can find `package.json` and read `pi.workflowerSkills`.

#### Red test

Create a temp package structure in a Workflower test:

```text
<tmp>/fake-package/
  package.json
  dist/index.mjs
  skills/private-one/SKILL.md
```

`package.json`:

```json
{
  "pi": {
    "workflowerSkills": ["./skills"]
  }
}
```

Test expected result:

```ts
const result = loadPackageWorkflowerSkills(pathToFileUrl("<tmp>/fake-package/dist/index.mjs"));

expect(result.skills.map((skill) => skill.name)).toEqual(["private-one"]);
expect(result.diagnostics).toEqual([]);
```

This should fail because loader does not exist.

#### Green implementation

Implement only enough to:

1. convert file URL to path;
2. walk upward until `package.json` exists;
3. read `pi.workflowerSkills`;
4. resolve entries relative to package root;
5. find `SKILL.md` files under directories.

#### Refactor

Extract path walking and manifest reading into small helpers.

### Tracer bullet 2: private skill parser

Goal: Load a `SKILL.md` into `WorkflowerPrivateSkill`.

#### Red tests

Test frontmatter name:

```md
---
name: custom-name
description: Private test skill.
---

# Body
```

Expected:

```ts
expect(skill.name).toBe("custom-name");
expect(skill.description).toBe("Private test skill.");
expect(skill.filePath).toBe(skillPath);
expect(skill.baseDir).toBe(dirname(skillPath));
```

Test fallback name:

```text
skills/fallback-name/SKILL.md
```

with no `name`, but with description.

Expected:

```ts
expect(skill.name).toBe("fallback-name");
```

Test missing description:

```ts
expect(result.skills).toEqual([]);
expect(result.diagnostics[0].message).toMatch(/description/i);
```

#### Green implementation

Write the smallest parser needed.

#### Refactor

Keep parsing side-effect free and easy to test.

### Tracer bullet 3: registry integration in `setupWorkflower`

Goal: Calling package extension can load private skills with one option.

#### Red test

In a Workflower setup/register-extension test:

1. create a fake package with `pi.workflowerSkills`;
2. call `setupWorkflower(pi, { packageUrl })`;
3. assert private skill is registered:

```ts
expect(findPrivateSkill("private-one")).toBeDefined();
```

#### Green implementation

Update Workflower default export signature:

```ts
setupWorkflower(pi, options?: { packageUrl?: string })
```

If `options.packageUrl` exists:

1. load package Workflower skills;
2. register each skill in private registry;
3. optionally notify warnings through `ctx.ui.notify` only where a context exists. During setup there may not be a context, so prefer storing diagnostics or console-free behavior initially.

Do not require `packageUrl`; existing packages must continue working.

#### Refactor

Ensure duplicate calls do not duplicate skills or produce unstable behavior.

Registry should key by skill name. Decide collision behavior:

- same name + same file path: no-op;
- same name + different file path: keep first and record diagnostic/warning.

### Tracer bullet 4: private skill command expansion

Goal: Workflower can turn `/skill:private-one args` into an injected skill block.

#### Red test

Given a registered private skill file:

```ts
const expanded = expandPrivateSkillCommand("/skill:private-one extra args");

expect(expanded).toContain('<skill name="private-one"');
expect(expanded).toContain("References are relative to");
expect(expanded).toContain("# Body");
expect(expanded).toContain("extra args");
```

Also test unknown skill:

```ts
expect(expandPrivateSkillCommand("/skill:public-skill args")).toBeUndefined();
```

Returning `undefined` for unknown is better than returning unchanged text, because the caller can cleanly fallback.

#### Green implementation

Implement parser and expander.

Potential module:

```text
packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/private-skills/expand-private-skill-command.ts
```

#### Refactor

Share frontmatter stripping helper with the parser if appropriate.

### Tracer bullet 5: kickoff prompt uses private expansion

Goal: A workflow step that references a private skill sends injected instructions instead of only saying `Execute this command: /skill:name`.

#### Red test

Use the existing step kickoff prompt tests or create a focused test around:

```ts
renderStepKickoffPrompt(workflow, state, step, {
  incomingPollen: [],
});
```

If current render function does not have access to private skill registry, either:

- have it call the registry directly; or
- pass a resolver function down from `startWorkflowStep`.

Expected prompt for private skill step:

```ts
expect(prompt).toContain('<skill name="private-one"');
expect(prompt).toContain("# Body");
expect(prompt).not.toContain("Execute this command: /skill:private-one");
```

Expected prompt for non-private command remains unchanged:

```ts
expect(prompt).toContain("Execute this command: /some-extension-command");
```

#### Green implementation

Modify step kickoff rendering with the smallest change:

```ts
const expandedPrivateSkill = expandPrivateSkillCommand(step.command);

if (expandedPrivateSkill) {
  lines.push("Execute this Workflower private skill for the current workflow step:");
  lines.push("");
  lines.push(expandedPrivateSkill);
} else {
  lines.push(`Execute this command: ${step.command}`);
}
```

#### Refactor

Keep rendering deterministic and easy to snapshot/assert.

### Tracer bullet 6: feature-workflow package switches skills to private

Goal: Feature workflow's internal skills move from public Pi skills to Workflower-private skills.

#### Red test

In `packages/feature-workflow/tests/feature-workflow.test.ts`, assert manifest shape:

```ts
expect(pkg.pi.skills).not.toContain("./extension-src/feature-workflow/internals/skills");
expect(pkg.pi.workflowerSkills).toContain("./extension-src/feature-workflow/internals/skills");
```

If the test harness captures Pi registered skills/commands, assert private skills are not exposed through Pi skill registration. Since Pi skill loading is not directly part of this package's extension harness, manifest assertion may be enough.

Also assert extension setup passes `packageUrl` by observing that private skills load when feature workflow extension is registered.

#### Green implementation

Update `packages/feature-workflow/package.json`:

```json
"pi": {
  "extensions": ["./dist/index.mjs"],
  "skills": [
    "./node_modules/@supierior/ruleplementor/skills"
  ],
  "workflowerSkills": [
    "./extension-src/feature-workflow/internals/skills"
  ]
}
```

Update feature workflow extension:

```ts
setupWorkflower(pi, { packageUrl: import.meta.url });
```

#### Refactor

Ensure tests do not depend on local workspace-only paths that will differ after package publication.

## Files likely to change

### Workflower package

```text
packages/workflower/extension-src/workflower/index.ts
packages/workflower/extension-src/workflower/internals/pi-adapter/register-extension.ts
packages/workflower/extension-src/workflower/internals/pi-adapter/private-skills/load-package-workflower-skills.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/private-skills/private-skill-registry.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/private-skills/expand-private-skill-command.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-step-kickoff-prompt.ts
packages/workflower/tests/workflower.test.ts
```

Exact locations may differ. Prefer existing package boundaries:

- Pi/extension setup code belongs under `internals/pi-adapter`.
- Pure workflow rendering/resolution belongs under `internals/workflow-orchestration`.
- Package public API types belong under `package-api` only if exposed to users.

### Feature workflow package

```text
packages/feature-workflow/package.json
packages/feature-workflow/extension-src/feature-workflow/internals/pi-adapter/register-extension.ts
packages/feature-workflow/tests/feature-workflow.test.ts
```

## Best practices and constraints

### Keep the public API small

Do not expose a broad private skill API unless needed.

Preferred public surface:

```ts
setupWorkflower(pi, { packageUrl: import.meta.url });
```

Preferred package manifest surface:

```json
"workflowerSkills": ["./path/to/skills"]
```

Avoid adding all of these unless required:

- `registerWorkflowerSkill`
- `registerWorkflowerSkillDirectory`
- `wskill:` syntax
- per-step `privateSkill` fields
- frontmatter `disableUserInvocation`

Those may be useful later, but they are unnecessary for the first vertical slice.

### Avoid importing Pi internals

Do not import from Pi's `dist/core/skills.js` or other non-public paths.

Why:

- internal paths may change;
- package export maps may block them;
- Workflower should remain compatible with Pi public APIs.

### Keep errors helpful

For author mistakes, prefer diagnostics/warnings over hard crashes:

- missing package file for `packageUrl`;
- missing `pi.workflowerSkills`;
- missing skill directory;
- invalid/missing skill description;
- duplicate private skill names.

But tests should still be strict for expected behavior.

### Preserve public Pi skill fallback

If a workflow step uses:

```ts
command: "/skill:some-user-installed-skill"
```

and that skill is not private, do not break it.

The first implementation may still render:

```text
Execute this command: /skill:some-user-installed-skill
```

That is current behavior. A later improvement can expand public Pi skills too, but this private-skill change should not require it.

### Do not scan arbitrary user prompts

Private skills are workflow step assets. Only expand them from `WorkflowStep.command` during Workflower step kickoff.

Do not add a global `/skill:` input hook for private skills in this first iteration unless tests prove it is needed.

## Suggested test names

Workflower:

```ts
it("loads workflower private skills from a package manifest")
it("uses frontmatter name when loading a private skill")
it("falls back to the skill directory name when no private skill name is set")
it("reports a diagnostic for private skills without descriptions")
it("registers package private skills when setupWorkflower receives packageUrl")
it("expands a private skill command into a skill block")
it("returns undefined when expanding an unknown private skill command")
it("injects private skill content into the step kickoff prompt")
it("leaves non-private step commands unchanged")
```

Feature workflow:

```ts
it("declares workflow-only skills as workflowerSkills instead of public pi skills")
it("loads feature workflow private skills during extension setup")
```

## End-to-end acceptance criteria

The feature is complete when all of these are true:

1. `packages/feature-workflow/package.json` no longer exposes internal feature workflow skills through `pi.skills`.
2. `packages/feature-workflow/package.json` declares those same internal skills through `pi.workflowerSkills`.
3. Feature workflow still exposes Ruleplementor skills publicly if those are intended to remain public.
4. `featureWorkflowExtension` calls `setupWorkflower(pi, { packageUrl: import.meta.url })`.
5. Workflower loads private skills from `pi.workflowerSkills`.
6. Workflower step kickoff expands private `/skill:<name>` commands into skill content.
7. Unknown/private-missing `/skill:<name>` commands continue through existing behavior.
8. Tests prove private skills do not rely on Pi's public skill registry.
9. Package-local tests, typecheck, lint, and build pass.

## Validation commands

Run focused commands first while developing:

```bash
cd packages/workflower
pnpm test
pnpm typecheck
```

Then run package checks:

```bash
cd packages/workflower
pnpm lint
pnpm build
```

For feature workflow changes:

```bash
cd packages/feature-workflow
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Finally, from the repo root if time permits:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Suggested implementation order summary

Use this exact order to stay red/green and avoid a tangled implementation:

1. **Loader test red**: can read `pi.workflowerSkills` from a temp package.
2. **Loader green**: minimal package URL + manifest + directory scan.
3. **Parser tests red/green**: parse `SKILL.md` into private skill metadata.
4. **Registry test red/green**: `setupWorkflower(pi, { packageUrl })` registers private skills.
5. **Expansion test red/green**: `/skill:name args` becomes a skill XML block.
6. **Kickoff test red/green**: private skill content appears in active step prompt.
7. **Feature package test red/green**: move internal skills from `pi.skills` to `pi.workflowerSkills`.
8. **Refactor**: clean boundaries, diagnostics, duplicate handling.
9. **Full validation**: package tests/typecheck/lint/build.

---

# Addendum: Workflower-private commands

## Why this addendum exists

The private-skill design handles Markdown instruction assets. It does not fully solve the related problem of **workflow-only extension commands**.

Some packages may want command-like workflow steps that are implemented in TypeScript, but should not be registered with Pi via:

```ts
pi.registerCommand("some-command", ...)
```

Registering with Pi makes the command visible in Pi's command surfaces, including slash-command discovery/autocomplete and command RPC listings. If the command is only meaningful inside a workflow, that is unnecessary surface area and can confuse users.

The preferred direction is to let third-party workflow packages register command handlers with Workflower instead of Pi:

```ts
registerWorkflowerCommand({
  name: "feature:prepare-draft",
  description: "Prepare the feature draft for the next workflow step.",
  handler: async (args, ctx) => {
    return {
      kind: "prompt",
      content: "Prepare the feature draft using the active workflow state...",
    };
  },
});
```

Then workflow steps can keep command-style syntax:

```ts
{
  id: "prepare-draft",
  command: "/feature:prepare-draft --strict",
}
```

Workflower resolves `/feature:prepare-draft` from its private command registry and handles it internally. Pi never sees it as a registered public command.

## Design goal

Add **Workflower-private commands** with these properties:

- not registered with `pi.registerCommand()`;
- not visible in Pi slash-command autocomplete;
- not visible in Pi command lists or command RPC responses;
- not included as model tools or general model context;
- invokable only by Workflower when a workflow step references the command;
- compatible with existing workflow `command: "/name args"` syntax;
- fall back to existing behavior for commands not registered with Workflower.

This is about reducing **surface/context pollution**. The agent should not receive a global list of workflow-internal commands. The workflow definition already chooses the command at the correct time.

## Important distinction: hidden command does not mean hidden Pi command

Pi currently has no native hidden command option for `pi.registerCommand()`.

So do **not** implement this by registering a Pi command with a hidden flag. There is no such flag today.

Instead, Workflower-private commands are a separate Workflower registry. They are closer to workflow step handlers than Pi slash commands.

## Suggested public API

Add this to `@supierior/workflower`:

```ts
export type WorkflowerCommandResult =
  | {
      kind: "prompt";
      content: string;
    }
  | {
      kind: "none";
    };

export type WorkflowerCommandContext = {
  workflowId: string;
  workflowName: string;
  stepId: string;
  stepName?: string;
  gardenName: string;
  cwd: string;
  signal?: AbortSignal;
};

export type WorkflowerCommandDefinition = {
  name: string;
  description?: string;
  handler: (
    args: string,
    ctx: WorkflowerCommandContext,
  ) => Promise<WorkflowerCommandResult> | WorkflowerCommandResult;
};

export function registerWorkflowerCommand(command: WorkflowerCommandDefinition): void;
```

Keep the first version intentionally small.

Do **not** expose these until a test forces them:

- `userInvocable`;
- `modelInvocable`;
- completions;
- aliases;
- direct manual invocation;
- arbitrary `ExtensionCommandContext` access.

A Workflower-private command should be workflow-invoked, not user-invoked and not model-selected.

## Why not reuse Pi `RegisteredCommand` directly?

Pi command handlers receive `ExtensionCommandContext`, which includes command-only session control operations such as `newSession`, `fork`, `switchSession`, and `reload`.

Workflower step execution usually happens from normal extension/runtime paths, not from Pi's command dispatcher. Those paths do not naturally have an `ExtensionCommandContext`.

Therefore, the first Workflower-private command API should use a smaller `WorkflowerCommandContext` that contains only what Workflower can safely provide.

If a future private command truly needs command-context-only operations, design that separately and test it carefully. Do not smuggle or fake `ExtensionCommandContext` in the first slice.

## Execution model

When Workflower starts a step:

1. Inspect `step.command`.
2. If it starts with `/skill:<name>`, try private skill expansion first.
3. Otherwise parse it as a slash-style command:

   ```text
   /command-name optional args
   ```

4. If `command-name` exists in the Workflower-private command registry, execute its handler.
5. If the handler returns `{ kind: "prompt", content }`, include that content in the step kickoff prompt.
6. If the handler returns `{ kind: "none" }`, continue the step without adding command-specific prompt content.
7. If no private command matches, preserve the current fallback behavior:

   ```text
   Execute this command: /command-name optional args
   ```

This keeps existing public/user-installed Pi commands and non-Workflower command steps working.

## Example rendering behavior

Given:

```ts
registerWorkflowerCommand({
  name: "feature:prepare-draft",
  handler: () => ({
    kind: "prompt",
    content: "Prepare a feature draft from the active garden context.",
  }),
});
```

and step:

```ts
{
  id: "prepare-draft",
  command: "/feature:prepare-draft --strict",
}
```

The kickoff prompt should include something like:

```text
Execute this Workflower private command for the current workflow step:

Prepare a feature draft from the active garden context.
```

It should not include:

```text
Execute this command: /feature:prepare-draft --strict
```

because that would ask the model/user-facing command system to handle a command that Pi does not know about.

## TDD tracer bullets for private commands

Implement this after or alongside private skills, but keep the slices separate.

### Command tracer 1: private command registry

#### Red test

```ts
it("registers and finds a workflower private command", () => {
  registerWorkflowerCommand({
    name: "feature:prepare-draft",
    handler: () => ({ kind: "none" }),
  });

  expect(findWorkflowerCommand("feature:prepare-draft")).toBeDefined();
});
```

Also test duplicate behavior:

```ts
it("does not silently replace a different private command with the same name", () => {
  // first registration wins or diagnostic is recorded; choose one behavior and assert it
});
```

#### Green implementation

Create an internal registry similar to the private skill registry.

Suggested file:

```text
packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/private-commands/private-command-registry.ts
```

Expose only `registerWorkflowerCommand` from the package API.

### Command tracer 2: slash command parsing

#### Red test

```ts
expect(parseWorkflowerPrivateCommandInvocation("/feature:prepare-draft --strict")).toEqual({
  name: "feature:prepare-draft",
  args: "--strict",
});
```

Non-command text should return `undefined`:

```ts
expect(parseWorkflowerPrivateCommandInvocation("Please do thing")).toBeUndefined();
```

#### Green implementation

Implement a tiny parser. Do not use Pi internals.

### Command tracer 3: execute private command for a step

#### Red test

```ts
it("executes a private command referenced by a workflow step", async () => {
  registerWorkflowerCommand({
    name: "feature:prepare-draft",
    handler: (args, ctx) => {
      expect(args).toBe("--strict");
      expect(ctx.workflowId).toBe("test-workflow");
      expect(ctx.stepId).toBe("prepare-draft");
      return {
        kind: "prompt",
        content: "Private command prompt content.",
      };
    },
  });

  const result = await resolveWorkflowerStepCommand(step, runtimeContext);

  expect(result).toEqual({
    kind: "private-command-prompt",
    content: "Private command prompt content.",
  });
});
```

#### Green implementation

Add a resolver that runs before the existing generic command rendering fallback.

Potential file:

```text
packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/resolve-workflow-step-command.ts
```

### Command tracer 4: kickoff prompt uses private command result

#### Red test

```ts
it("injects private command prompt content into the step kickoff prompt", async () => {
  // arrange registered private command and step.command = "/feature:prepare-draft --strict"

  expect(prompt).toContain("Private command prompt content.");
  expect(prompt).not.toContain("Execute this command: /feature:prepare-draft --strict");
});
```

#### Green implementation

Thread resolved command content into `renderStepKickoffPrompt`, or move command resolution into the rendering path if that keeps boundaries simpler.

Prefer the cleaner boundary:

- runtime resolves executable step command;
- prompting renders the resolved result.

### Command tracer 5: fallback remains unchanged

#### Red test

```ts
it("leaves public or unknown commands as normal command text", async () => {
  const prompt = await renderPromptForStepCommand("/some-public-command args");

  expect(prompt).toContain("Execute this command: /some-public-command args");
});
```

#### Green implementation

Make sure private command resolution is opt-in by registry match only.

## Suggested command-related files

```text
packages/workflower/extension-src/workflower/index.ts
packages/workflower/extension-src/workflower/package-api/register-workflower-command.ts
packages/workflower/extension-src/workflower/package-api/workflower-command.types.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/definitions/private-commands/private-command-registry.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/resolve-workflow-step-command.ts
packages/workflower/extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-step-kickoff-prompt.ts
packages/workflower/tests/workflower.test.ts
```

## Acceptance criteria for private commands

Private commands are complete when:

1. Third-party packages can call `registerWorkflowerCommand(...)`.
2. Registered private commands are not passed to `pi.registerCommand(...)`.
3. Private commands do not appear in Pi command autocomplete/listing/RPC surfaces.
4. Workflow steps can reference private commands with existing `command: "/name args"` syntax.
5. Workflower executes/resolves private command handlers before generic command fallback.
6. Private command prompt output is included in the step kickoff prompt.
7. Unknown/public commands keep existing behavior.
8. Tests prove the registry, parser, execution path, rendering path, and fallback behavior.

## Best-practice warning

Do not turn Workflower-private commands into global model tools just to make them "agent hidden".

Global tools are still model-visible capability surface. That would move the pollution from slash commands to tool context.

For this feature, the workflow is the invoker. The command is selected by the workflow definition, not by the model and not by the user.
