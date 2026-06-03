## Goal

Make the V1 command surface consistent and confirm the implemented package matches the feature summary.

## Vertical slice

When the extension loads, users have the complete V1 command surface with predictable help/usage behavior, and maintainers can validate the package with normal repo commands.

## Dependencies

- Depends on #56 for `/next` registration and advancement semantics.
- Depends on #57 for `/workflow status`, `/workflow cancel`, and unknown-subcommand behavior.
- Transitively depends on #55 for the package and start behavior.

## Scope

- Verify extension command registration for:
  - `/workflow start <workflow-id> <workflow-name>`;
  - `/workflow status`;
  - `/workflow cancel`;
  - `/next`.
- Add integration-style command registration assertions if not already covered by earlier slices.
- Ensure missing/invalid arguments return friendly usage text.
- Ensure `/next` remains registered even when no workflow is active, unless Pi command unregistration is proven useful and simple.
- Run final package and repo-level validation commands as appropriate.
- Remove stale comments, misleading examples, or temporary scaffolding.

## TDD / red-green plan

- **Red:** Add tests or integration-style assertions that command registration receives the expected command names and handlers, and that invalid usage produces stable help text.
- **Green:** Wire any remaining command registration or parser gaps.
- **Refactor:** Keep parser and handler boundaries small.

## Documentation updates

Finalize package README/docs so a developer or user can understand what Workflower does, all V1 commands, state and artifact locations, the included sample workflow, V1 non-goals, and how to run relevant tests/build/typecheck/lint.

## Acceptance criteria

- [ ] All V1 commands are registered by the extension.
- [ ] Invalid command usage produces helpful messages.
- [ ] Documentation reflects the implemented command behavior and non-goals.
- [ ] Final validation passes for the package and does not break existing packages.
- [ ] No separate testing-only or documentation-only follow-up story is required.
