# @supierior/feature-workflow

Pi Workflower package for turning feature conversations into feature docs, reviewed implementation plans, split story files, and reviewed story-by-story implementations.

It registers three user-facing workflows:

```text
new-feature
take-it-away
feature-doc
```

It also registers private loop workflows used through `workflower_handoff`:

```text
implementation-doc-loop
implementation-stories-split
story-implementation-loop
```

All feature-workflow skills are private Workflower skills exposed through `pi.workflowerSkills`.

## User-facing workflows

### `new-feature`

Use when starting from a new idea. The workflow clears context on start and always grills the user first.

Steps:

1. `grill` — `/skill:feature-grill`
   - clarifies the feature through focused questioning;
   - writes no files;
   - user runs `/next` when alignment is reached.
2. `create-feature-doc` — `/skill:feature-doc-create`, writes `feature-doc.md`
   - converts the grill conversation into an intermediate feature document;
   - saves `featureDocPath` in Workflower garden state;
   - pins `feature-doc.md` as pollen.
3. `start-implementation-doc-loop` — private router command
   - reads garden state and asks the model to call `workflower_handoff` for `implementation-doc-loop`.

### `take-it-away`

Use after an organic conversation with Pi. The workflow preserves the current conversation on start, creates a feature doc first, then enters the same implementation flow as `new-feature`.

Runtime profile:

- defaults to `openai/gpt-5.4-mini` with low thinking for quick workflow movement;
- keeps feature-doc creation at medium thinking;
- hands implementation planning to a higher-thinking step in `implementation-doc-loop`;
- keeps review steps at medium thinking and router steps at minimal thinking.

Steps:

1. `create-feature-doc` — `/skill:feature-doc-create`, writes `feature-doc.md` and saves `featureDocPath`.
2. `start-implementation-doc-loop` — private router command to hand off to `implementation-doc-loop`.

### `feature-doc`

Use when you only want a durable feature document from the current conversation.

Steps:

1. `create-feature-doc` — `/skill:feature-doc-create`, writes `feature-doc.md` and saves `featureDocPath`.

This workflow does not clean up its workdir on completion, so the generated document remains in `.workflower/workflows/<garden>/0001-feature-doc/`.

## Private loop workflows

### `implementation-doc-loop`

Creates or improves `implementation-doc.md`, reviews it, and routes based on garden state.

Runtime profile:

- workflow default: `openai/gpt-5.4-mini` with low thinking;
- planning step override: `openai/gpt-5.5` fallback to `openai/gpt-5.4-mini`, with high thinking;
- review step override: medium thinking;
- router step override: minimal thinking.

- Passing review score: `>= 4` on a 1-5 scale.
- Maximum improvement attempts: `5`.
- Review facts are saved under `implementationDocReview`.
- The router mutates `implementationDocReviewAttempts` and loops through `workflower_handoff` when review fails.
- On success, it hands off to `implementation-stories-split`.

### `implementation-stories-split`

Splits an accepted implementation doc into topologically ordered story files under `stories/` and saves `storyManifest` plus the first `currentStory` routing state.

Runtime profile:

- workflow default: `openai/gpt-5.4-mini` with low thinking;
- story-splitting step override: medium thinking;
- router step override: minimal thinking.

Story files are implementation-ready and written as instructions to a junior developer.

### `story-implementation-loop`

Implements one story, reviews it, and routes based on garden state.

Runtime profile:

- workflow default: `openai/gpt-5.4-mini` with low thinking;
- implementation step stays low thinking on the fast model;
- review step is raised to medium thinking;
- router step stays minimal.

- Passing review score: `>= 4` on a 1-5 scale.
- Maximum improvement attempts per story: `3`.
- Review facts are saved under `storyReview`.
- On failure, the router hands off to another loop iteration for the same story.
- On success, the router advances `currentStory` to the next story.
- When all stories pass, the router reports completion and does not hand off.

## Context management

The architecture keeps creation and review context small:

- large artifacts live in files, not garden state;
- reviewer skills save compact structured ratings and required improvements in garden state;
- private router commands read garden state and emit only the next routing instruction;
- loop continuation uses `workflower_handoff`, not printed slash commands;
- workflow steps clear context between create/review/router phases where possible.

Router commands intentionally act as deterministic script steps for loop decisions, while creator skills receive only the current artifact plus concise state feedback.

## Garden state keys

Core keys:

```text
featureDocPath
implementationDocPath
implementationDocReview
implementationDocReviewAttempts
implementationDocStatus
storyManifest
currentStoryIndex
currentStory
storyReview
storyReviewAttempts
storyReviewStatus
featureWorkflowStatus
```

Reviewer object shape (`score >= 4` passes):

```json
{
  "score": 4,
  "passes": true,
  "summary": "Short reason for the score.",
  "methodologyRatings": {
    "tdd": 4,
    "verticalSlicing": 4,
    "tracerBullet": 4,
    "dependencies": 4,
    "architecture": 4
  },
  "requiredImprovements": [],
  "reviewedPath": "/absolute/path/to/file.md"
}
```

## Smoke tests

Start from scratch:

```text
/wf:new-feature demo
```

After the grill reaches alignment:

```text
/next
```

Use an existing conversation:

```text
/wf:take-it-away demo
```

Generate only a feature doc:

```text
/wf:feature-doc demo
```

Useful Workflower inspection:

```text
/wf status
/wf state list
/wf state get implementationDocReview
/wf state get storyManifest
```
