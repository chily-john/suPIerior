---
kind: rules
paths:
  - "packages/workflower/extension-src/**/*"
summary: Workflower TypeScript source for package API, internal workflow orchestration, Pi adapter commands/events/tools, and public entrypoint.
triggers:
  - workflower source
  - workflow command source
  - workflower registry source
  - package-api
  - pi-adapter
---

# Extension Source

Enter here when changing Workflower runtime source. The package uses alias-separated layers for package API exports, internal workflow orchestration, and Pi adapter command, event, and tool registration.

## Subdirectories

| Directory      | When to enter                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `workflower/`  | Editing the public entrypoint, package API, internal orchestration, or Pi command/event/tool runtime. |
