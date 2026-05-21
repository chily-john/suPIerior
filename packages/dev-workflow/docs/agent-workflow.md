# Agent workflow

Agents may create branches and PRs, but should keep work PR-sized and avoid overwriting human changes.

## Start checklist

```bash
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
```

If the worktree is dirty, ask before continuing unless the user has explicitly instructed you to proceed or the dirty files are clearly unrelated/generated.

## Work loop

1. Read the linked GitHub issue and acceptance criteria.
2. Create a branch from updated `main`.
3. Make focused changes.
4. Run relevant validation, at minimum:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

5. Open a PR with the repository PR template.
6. Link the issue using `Closes #...` or `Refs #...`.
7. Mark validation performed and note release impact.

## Operating rules

- Prefer GitHub Issues/Projects over duplicated local task files.
- Do not add workflow commands to `@supierior/pi-rules`.
- Keep required metadata minimal.
- Ask before discarding or overwriting human work.
- Document GitHub limitations rather than building heavy custom automation too early.
