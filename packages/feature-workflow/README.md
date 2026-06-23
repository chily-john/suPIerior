# @supierior/feature-workflow

Pi Workflower package for turning feature ideas into reviewed, TDD-first, vertically sliced GitHub issues or implementation plans.

This package depends on `@supierior/workflower` and `@supierior/ruleplementor`; installing it also installs the workflow runtime and Ruleplementor implementation/review skills used by `take-it-away`.

It registers four workflows:

```text
new-feature
take-it-away
counter
counter-loop
```

## `new-feature`

Workflow id: `new-feature`

Use this workflow when you want to clarify a new feature from the beginning, generate reviewed GitHub issues, and publish them.

Artifacts are written under the workflow's flower directory while the workflow is running:

```text
.pi/workflows/<garden>/0001-new-feature/
```

The workflow pins `issues.md` as pollen so downstream flowers in the same garden can receive the reviewed issue artifact without users copying paths manually. The workflow is configured to clean up its workdir on completion.

### Steps

1. `grill` — `/skill:new-feature-grill`
   - asks the user to describe the desired feature;
   - relentlessly clarifies scope, behavior, edge cases, tests, docs, and integration details;
   - preserves conversation context for the next step;
   - does not auto-advance.
2. `summary` — `/skill:new-feature-summary`, writes `feature-summary.md`
   - summarizes the retained conversation into a detailed feature summary;
   - auto-advances.
3. `convert-to-issues-prep` — `/skill:new-feature-convert-to-issues-prep`, writes `issues.md`
   - creates GitHub issue outlines from `feature-summary.md`;
   - emphasizes TDD red/green implementation and vertical slicing;
   - auto-advances.
4. `review-issues` — `/skill:new-feature-review-issues`, updates `issues.md`
   - reviews and corrects issues for TDD, vertical slicing, dependencies, dependents, and labels;
   - auto-advances.
5. `publish-issues` — `/skill:new-feature-publish-issues`
   - creates GitHub issues with the `gh` CLI;
   - updates `issues.md` with created issue URLs;
   - completes the workflow.

### Smoke test

```text
/wf:new-feature demo
```

Complete the grill conversation. When the skill says you have reached a common understanding, run:

```text
/next
```

The remaining steps auto-advance through summary, issue drafting, issue review, and GitHub issue publication.

## `take-it-away`

Workflow id: `take-it-away`

Use this workflow after an organic conversation and exploration phase for a smaller change. It preserves the visible session on start so the first step can summarize the prior context, then clears context between auto-advanced steps so each step works from artifacts.

Artifacts are written under the workflow's flower directory while the workflow is running:

```text
.pi/workflows/<garden>/0001-take-it-away/
```

When started as a downstream flower, this workflow accepts incoming pollen by default. It pins `implementation-review.md` as pollen so another flower can receive the implementation review artifact. The workflow is configured to clean up its workdir on completion.

### Steps

1. `summarize-context` — `/skill:take-it-away-summary`, writes `context-summary.md`
   - captures the previous conversation and exploration in a detailed summary;
   - auto-advances and clears context for the next step.
2. `plan-implementation` — `/skill:take-it-away-plan`, writes `implementation-plan.md`
   - converts the summary into one in-depth implementation plan;
   - emphasizes strict behavioral-red TDD and vertical slicing;
   - auto-advances and clears context for the next step.
3. `review-plan` — `/skill:take-it-away-review-plan`, updates `implementation-plan.md`
   - reviews and corrects the plan in place for TDD structure, slice quality, dependencies, validation, and blocked states;
   - auto-advances and clears context for the next step.
4. `implement-plan` — `/skill:implementor`
   - uses Ruleplementor's implementor skill to read `implementation-plan.md` and implement the change with strict TDD;
   - auto-advances and clears context for the next step.
5. `review-implementation` — `/skill:reviewer`, writes `implementation-review.md`
   - uses Ruleplementor's reviewer skill to review the current working tree against `implementation-plan.md`;
   - records findings, makes safe fixes for blocking and clear recommended issues, and completes the workflow.

### Smoke test

After discussing and exploring a smaller change with Pi, run:

```text
/wf:take-it-away demo
```

All steps are configured to auto-advance through summary, planning, plan review, implementation, and implementation review.

To hand off from an active flower in the same garden, start `take-it-away` without a new garden name:

```text
/wf:take-it-away
```

Workflower will create the next flower, for example `.pi/workflows/demo/0002-take-it-away/`, and include the previous flower's pollen paths in the kickoff prompt.

## `counter` and `counter-loop`

Workflow ids: `counter`, `counter-loop`

Use these tiny test workflows to exercise Workflower handoffs and loop-style repetition through skills.

The `counter` workflow initializes the active garden state key `counter` from user-provided integer values, then hands off to `counter-loop` by calling Workflower's `workflower_handoff` tool. The `counter-loop` workflow reads that garden state, increments `current`, saves the updated `counter` value, and either calls `workflower_handoff` for another `counter-loop` flower when `current < end` or stops when `current >= end`.

`counter-loop` is an internal handoff workflow: it does not register a user-facing `/wf:counter-loop` command. Users start `/wf:counter`; the loop is entered and repeated through `workflower_handoff`. The counter workflows use `workflower_state_get` and `workflower_state_set` instead of output files or pollen.

During the active garden, the state is stored at:

```text
.pi/workflows/<garden>/state.json
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

## Review-loop garden state example

Reviewer steps can publish deterministic routing facts to Workflower garden state. For example, after `take-it-away` runs the `review-implementation` step, the reviewer skill or a companion router tool can call `workflower_state_set` three times:

```json
{ "key": "review.rating", "value": 3 }
{ "key": "review.summary", "value": "Implementation is close, but needs edge-case tests." }
{ "key": "review.required_changes", "value": ["Add empty-input tests"] }
```

A human can inspect or repair those values with:

```text
/wf state list
/wf state get review.rating
/wf state set review.rating 4
```

A deterministic router command/tool can read the rating and hand off to another workflow without asking the model to guess:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWorkflowerRuntime } from "@supierior/workflower";

export function registerReviewRouter(pi: ExtensionAPI): void {
  pi.registerCommand("feature-review-route", {
    description: "Route the active feature garden based on review.rating.",
    handler: async (_args, ctx) => {
      const wf = createWorkflowerRuntime(pi, ctx);
      const rating = await wf.state.getValue("review.rating");
      if (typeof rating !== "number") {
        ctx.ui.notify("review.rating must be a number.", "error");
        return;
      }

      const nextWorkflow = rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
      const result = await wf.handoff(nextWorkflow);
      ctx.ui.notify(result.message, result.ok ? "info" : "error");
    },
  });
}
```

For autonomous loops, expose the same router as a model-callable tool and use `pi.sendUserMessage(prompt, { deliverAs: "followUp" })` in the runtime options. Do not rely on a workflow step printing `/feature-review-route`; assistant text does not execute slash commands.

## Useful Workflower commands

```text
/wf status
/wf stop
/wf list
```

## GitHub publishing prerequisites

The final `new-feature` step uses the GitHub CLI from the current repository. Before running the workflow, ensure:

```bash
gh --version
gh auth status
```

The publishing skill creates any needed labels before creating issues. Generated labels are feature-specific and workflow-oriented, such as `feature:<slug>`, `mode:afk`, `mode:hitl`, and `stream:<name>`.
