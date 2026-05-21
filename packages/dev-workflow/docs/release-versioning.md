# Release and versioning

suPIerior packages should remain in beta for now. Do not publish to npm until explicitly approved.

## Current state

Changesets are enabled with `@changesets/cli` and repository config in `.changeset/config.json`.

Create a changeset with:

```bash
pnpm changeset
```

Use Changesets to create deterministic beta version bumps and changelogs. Keep package versions in beta until the project explicitly decides otherwise.

## Changesets policy

A PR should include a changeset when it changes user-facing package behavior, APIs, commands, or documented behavior that should appear in a changelog.

A changeset is usually not needed for internal-only workflow docs/templates, CI maintenance, or refactors that do not affect published package behavior.

## Publishing

Npm publishing is not enabled. Future release flow should be:

1. Feature/fix PR includes changeset when needed.
2. Merge to `main` after review and CI.
3. Changesets creates or updates a version PR.
4. Human reviews and merges the version PR.
5. Create tags/GitHub release.
6. Enable npm publishing only after explicit approval.
