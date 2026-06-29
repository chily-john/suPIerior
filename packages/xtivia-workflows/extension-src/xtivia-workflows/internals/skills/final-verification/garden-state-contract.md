# XTIVIA Migration Garden State Contract

Use Workflower garden state only for small routing facts and durable artifact paths. Keep captures, plans, stories, screenshots, and detailed reports in files under the workflow workdir.

## Site information

- `wpMigrationSiteInfoPath`: absolute path to `site-info.md`.
- `wpMigrationSourceUrl`: WordPress/source page URL to capture.
- `wpMigrationTargetRoute`: target Next.js route/path to implement.
- `wpMigrationNotes`: user-provided notes, constraints, or migration context.

## Capture and planning

- `wpMigrationCapturePath`: absolute path to `page-capture.md`.
- `wpMigrationPlanPath`: absolute path to `implementation-doc.md`.
- `wpMigrationPlanReview`: structured review object for the migration plan.
- `wpMigrationPlanReviewAttempts`: integer maintained by the route step.
- `wpMigrationPlanStatus`: `accepted` or `needs-improvement`.

## Story implementation

- `wpMigrationStoryManifest`: ordered story manifest with story descriptors.
- `wpMigrationCurrentStoryIndex`: zero-based index of the current story.
- `wpMigrationCurrentStory`: current story descriptor with `id`, `title`, `path`, `dependencies`, and `status`.
- `wpMigrationStoryReview`: structured review object for the current story implementation.
- `wpMigrationStoryReviewAttempts`: integer maintained by the route step.
- `wpMigrationStoryReviewStatus`: latest story review route status.

## Completion

- `wpMigrationFinalReportPath`: absolute path to `final-report.md`.
- `wpMigrationStatus`: `implemented` when all migration workflow steps pass.

## Review object shape

Use this compact shape for `wpMigrationPlanReview` and `wpMigrationStoryReview`:

```json
{
  "score": 4,
  "passes": true,
  "summary": "Short reason for the score.",
  "methodologyRatings": {
    "capture": 4,
    "visualParity": 4,
    "architecture": 4,
    "componentReuse": 4,
    "pocScope": 4
  },
  "requiredImprovements": [],
  "reviewedPath": "/absolute/path/to/artifact-or-story.md"
}
```

Scores are integers from 1 to 5. `passes` is true only for scores `>= 4`. Keep summaries concise and put detailed findings in files, not garden state.

## Story manifest shape

```json
{
  "stories": [
    {
      "id": "001",
      "title": "Implement hero section",
      "path": "/absolute/path/to/stories/001-implement-hero-section.md",
      "dependencies": [],
      "status": "ready"
    }
  ]
}
```
