# @supierior/architecture

Pi skill package for architecture routing and AI-navigable structure guidance.

Install this package when you want Pi to automatically consult architecture guidance before creating or reorganizing folders, creating related files that affect module shape, adding package layouts, designing skill suites, or changing public surfaces and import direction.

## Skills

- `architecture` — routing skill. Use this as the default installed skill. It decides which architecture guidance to load.
- `ai-navigable-folder-architecture` — general folder, file placement, module seam, and import-direction guidance.
- `skill-suite-architecture` — guidance for collections of related skills that share contracts, schemas, templates, examples, or operating rules.
- `supierior-package-architecture` — suPIerior-specific package architecture guidance for TypeScript Pi extension packages and Markdown-only skill packages.

## Recommended setup

Install the whole package when you want the routing skill and all referenced architecture skills:

```json
{
  "pi": {
    "skills": ["./skills"]
  }
}
```

The package manifest already exposes `./skills` for Pi package installation.

## Grabbing individual skills

Each non-router skill is self-contained enough to copy by directory:

```text
skills/ai-navigable-folder-architecture/
skills/skill-suite-architecture/
skills/supierior-package-architecture/
```

The specialized skills include a local copy of the general folder architecture reference so they remain useful when copied outside this package.

## Router behavior

The `architecture` skill should be loaded before structural work. It routes to:

1. `supierior-package-architecture` when editing suPIerior packages or Pi package source layout.
2. `skill-suite-architecture` when designing a suite of related skills.
3. `ai-navigable-folder-architecture` for general folder/file/module structure decisions.

Project-specific rules still win over this package. If a local `.pi/rules` file conflicts with these skills, follow the project rule and call out the conflict.
