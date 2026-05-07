# @supierior/pi-rules

Pi package that adds hierarchical `.pi/rules` discovery, injection, status commands, and background rule maintenance to Pi. The runtime is a bundled TypeScript Pi extension built from `extension-src/pi-rules/` into `dist/extensions/pi-rules.js`; skills and scripts support bootstrapping and maintaining rules documentation.

This root context file contains a map of the codebase. The rest of the information —
coding rules, directory-specific details, and component inventories — lives in
path-scoped context files under `.pi/rules/`.

Use injected `.pi/rules` context as the first source of project-specific guidance. Trust injected rules as current; do not verify the rules system or update rules during normal implementation. If the injected rules do not answer where or how to proceed, inspect `.pi/rules` before doing broad source-code searches. Read source files to verify local style, existing APIs, or implementation details.

## Project Structure

├── extension-src/ # Extension implementation; enter for runtime behavior, commands, events, injection, routing, or maintainer changes
│ └── pi-rules/ # Domain modules for the pi-rules extension
├── skills/ # Pi skills used to initialize and maintain `.pi/rules` documentation
│ ├── init-advanced/ # User-invoked documentation bootstrap workflow and templates
│ └── rules-maintainer/ # Hidden background documentation maintenance workflow
├── scripts/ # Project reconnaissance helpers used by skills
├── package.json # Pi package metadata and extension/skill registration
└── README.md # User-facing package behavior and installation notes

## Commands

```bash
pi install -l /absolute/path/to/packages/pi-rules # Install locally into another project
pi -e /absolute/path/to/packages/pi-rules # Test package temporarily in another project
```

## Environment Variables

None required by this package.

## Gotchas

- This package documents codebases; avoid mixing application-code fixes into skill or rules-documentation tasks.
- The rules maintainer runs as a background sub-agent with its own context window to avoid polluting the main conversation; preserve that separation when changing maintainer launch behavior.
- Rule injection scoring and default limits are experimental; treat routing changes as behavior-sensitive and verify with realistic prompts.
