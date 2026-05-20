# GitHub Project board

The intended GitHub Projects v2 board is named `suPIerior`.

## Source of truth

The project board should reflect GitHub Issues and PRs. Do not create committed per-task YAML files in this first workflow pass.

## Recommended status states

- Todo
- In Progress
- Review
- Blocked
- Done
- Released

Optional fields may be added later, but should remain lightweight:

- Package
- Owner
- Conflict Risk
- Release Impact
- Linked PR

Do not make these optional fields required initially.

## Project location

Project URL/number: _not configured in this repository yet_.

Current CLI blocker: the authenticated `gh` token needs GitHub Projects scopes before project creation/listing works:

```bash
gh auth refresh -s read:project -s project
```

After refreshing scopes, create or locate the project with:

```bash
gh project list --owner chily-john
gh project create --owner chily-john --title suPIerior
```

GitHub Projects v2 field/status configuration may require GraphQL or the GitHub UI. If `gh project` does not support the needed field setup cleanly, configure the Status field manually in the GitHub UI with the states above.

## Adding issues and PRs

Use one of these approaches:

```bash
# Inspect exact command support first.
gh project --help

# Add an issue or PR item when supported by the installed gh version.
gh project item-add <project-number> --owner chily-john --url <issue-or-pr-url>
```

Manual fallback:

1. Open the `suPIerior` project.
2. Add the issue or PR by URL or repository search.
3. Set Status to `Todo`, `In Progress`, `Review`, `Blocked`, `Done`, or `Released`.

Keep project metadata minimal unless it clearly improves coordination.
