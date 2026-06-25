# Feature Workflow Garden State Contract

Use Workflower garden state for small routing facts only. Store large content in files.

## Keys

- `featureDocPath`: absolute path to `feature-doc.md`.
- `implementationDocPath`: absolute path to `implementation-doc.md`.
- `implementationDocReview`: structured review object for the implementation doc.
- `implementationDocReviewAttempts`: integer maintained by the router.
- `implementationDocStatus`: `accepted` or `needs-improvement`.
- `storyManifest`: ordered story manifest written after the implementation doc passes review.
- `currentStoryIndex`: zero-based index of the story currently being implemented.
- `currentStory`: current story descriptor with `id`, `title`, `path`, `dependencies`, and `status`.
- `storyReview`: structured review object for the current story implementation.
- `storyReviewAttempts`: integer maintained by the router.
- `storyReviewStatus`: latest story review route status.
- `featureWorkflowStatus`: `implemented` when all stories pass.

## Review object shape

Reviewer skills must write review keys with this shape:

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
  "reviewedPath": "/absolute/path/to/artifact-or-story.md"
}
```

Rules:

- `score` is an integer from 1 to 5.
- `passes` is `true` only when `score >= 4`.
- `summary` must explain the score in one or two concise paragraphs.
- `requiredImprovements` is an array of specific fixes required before another review.
- Review skills do not write review report files unless explicitly asked; the garden state object is the routing contract.

## Story manifest shape

```json
{
  "stories": [
    {
      "id": "001",
      "title": "Thin tracer bullet through the command",
      "path": "/absolute/path/to/stories/001-thin-tracer-bullet.md",
      "dependencies": [],
      "status": "ready"
    }
  ]
}
```

Stories must be topologically ordered so the router can implement them one at a time by index.
