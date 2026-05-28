---
kind: rules
paths:
  - "packages/tui-tools/extension-src/**/*"
summary: Source tree for reusable TUI domains and package public exports.
triggers:
  - tui-tools source
  - tui-tools exports
  - reusable TUI source
---

# extension-src

Enter here for runtime source changes in `@supierior/tui-tools`. The package root should expose domain entrypoints rather than reaching into domain internals.

## Subdirectories

| Directory    | When to enter                                                |
| ------------ | ------------------------------------------------------------ |
| `tui-tools/` | Changing package root exports or reusable TUI domain source. |
