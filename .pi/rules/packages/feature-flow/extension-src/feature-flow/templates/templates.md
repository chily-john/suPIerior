---
kind: rules
paths:
  - 'packages/feature-flow/extension-src/feature-flow/templates/**/*'
summary: Text renderers for generated feature-flow artifacts and prompts.
triggers:
  - feature.md template
  - plan.md template
  - feature draft
  - feature document prompt
  - reviewer prompt
  - discovery prompt
---

# templates

`templates/` owns generated Markdown, default handoff structure, and prompt text for the feature workflow. Enter here when changing the shape, section names, wording, discovery/repair prompts, selected-template handoff prompts, or generated text for `feature.draft.md`, `feature.md`, or `plan.md`.

## Patterns & Conventions

- Keep artifact rendering deterministic and based on `DiscoveryContext`; avoid filesystem, Pi UI, or command-registration concerns here.
- Discovery prompts should require the minimal JSON envelope parsed by `domain/discovery/parse-response.ts` and include configured turn/question budgets when available.
- Generated plans should preserve documented uncertainty instead of implying unverified implementation details.
- Feature-document prompts must stay grounded in `DiscoveryContext` and the selected template, and should not ask new user questions.
