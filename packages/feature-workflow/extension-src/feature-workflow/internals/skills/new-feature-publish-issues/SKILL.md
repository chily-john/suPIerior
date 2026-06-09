---
name: new-feature-publish-issues
description: Publishes reviewed issues.md entries to GitHub issues with gh and records created URLs.
allowed-tools: read write bash
---

# New Feature Publish Issues

You are step 5 of the `new-feature` Workflower workflow.

## Goal

Read the reviewed `issues.md`, create matching GitHub issues with the GitHub CLI, and update `issues.md` with the created issue URLs.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Read `issues.md` from the previous-step output path provided by the kickoff prompt. If no absolute previous-output path is visible, read it from the current working directory.
3. Publish immediately. Do not ask for confirmation.
4. Before creating issues, verify the GitHub CLI is available and authenticated:
   - run `gh --version`;
   - run `gh auth status`.
5. Use the current repository by default. If the kickoff prompt or `issues.md` explicitly names a repository, pass it with `--repo`.
6. For each issue block:
   - create any labels from the issue metadata before creating the issue;
   - labels should include `feature:<slug>`, one `mode:*` label, one `stream:*` label, and any clear package/area labels;
   - if `gh label create` reports that a label already exists, continue;
   - create the GitHub issue with `gh issue create`;
   - use a temporary body file or equivalent safe shell quoting so Markdown is preserved;
   - pass every label with `--label`;
   - include dependencies and dependents in the issue body.
7. Create issues in dependency order:
   - issues with empty `blockedBy` first;
   - then issues whose blockers were already created;
   - stop and report the problem if dependencies are circular or reference missing issue titles.
8. When an issue is blocked by another issue that was just created, update the body before publishing so the `Dependencies` section includes the created blocker URL as well as the title.
9. Capture each created issue URL from `gh issue create` output.
10. Update `issues.md` after each successful creation by adding `createdUrl: "<url>"` to that issue's metadata. This makes the workflow recoverable if publishing stops midway.
11. If a failure occurs after some issues were created, do not delete or roll back created issues. Update `issues.md` with all URLs created so far and clearly report where publishing stopped.
12. When all issues are created, tell the user how many GitHub issues were created and list their URLs. This is the final workflow step.

## Suggested CLI pattern

Use commands equivalent to:

```bash
gh label create "feature:example" --color "5319e7" --description "Feature workflow grouping" || true
gh label create "mode:afk" --color "0e8a16" --description "Can be implemented without human-in-the-loop decisions" || true
gh label create "mode:hitl" --color "fbca04" --description "Requires human-in-the-loop input or review" || true
gh label create "stream:core" --color "1d76db" --description "Concurrent implementation stream" || true
gh issue create --title "Issue title" --body-file /tmp/issue-body.md --label "feature:example" --label "mode:afk" --label "stream:core"
```
