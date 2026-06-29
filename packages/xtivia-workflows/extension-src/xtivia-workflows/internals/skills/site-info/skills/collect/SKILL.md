---
name: wp-migration-site-info
description: Collect site information for an XTIVIA WordPress-to-Next.js page migration.
---

# WP Migration Site Info

## Shared Context

Before acting, read and apply:

```text
../../garden-state-contract.md
../../migration-methodology.md
```

## Goal

Collect the source page and target-route inputs for the current `wp-page-migration` workflow, write `site-info.md`, and save small garden-state values that later workflow steps can read.

## Required inputs

Ask exactly these required inputs when they are missing from the kickoff prompt or conversation:

1. source URL
2. target route/path
3. notes or constraints

Do not infer missing values. If any required input is absent, ask the user for only the missing values and wait for the answer.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, workdir, and declared outputs. This workflow step is not `autoNext`.
2. Resolve the declared `site-info.md` output to its absolute expected output path in the workflow workdir.
3. Write `site-info.md` at that absolute expected output path with these concise sections:
   - Source URL
   - Target route/path
   - Notes or constraints
4. After the file is written, call `workflower_state_set` for each key:
   - `wpMigrationSiteInfoPath`: absolute path to `site-info.md`
   - `wpMigrationSourceUrl`: collected source URL
   - `wpMigrationTargetRoute`: collected target route/path
   - `wpMigrationNotes`: collected notes or constraints
5. Tell the user to run `/next` only after `site-info.md` is written and the garden state keys are saved.

## Completion

Do not report completion until `site-info.md` exists at the declared absolute output path and all four `wpMigration*` garden state keys above are saved. If writing the file or saving state fails, report the blocker clearly instead of continuing.
