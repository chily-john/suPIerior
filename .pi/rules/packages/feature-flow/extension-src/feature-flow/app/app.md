---
kind: rules
paths:
  - "packages/feature-flow/extension-src/feature-flow/app/**/*"
summary: Feature-flow workflow orchestration that connects UI questions, domain helpers, and artifact writes.
triggers:
  - runFeatureWorkflow
  - feature workflow orchestration
  - write feature artifacts
  - blocker review
---

# app

`app/` owns the end-to-end `/feature` workflow. Enter here when changing the order of prompts, model-backed discovery loop, slug confirmation, feature template selection, replacement behavior, draft/final artifact writes, optional kanban handoff, the `FeatureFlowStateController`, status updates, or how `@supierior/tui-tools` queues are used.

## Patterns & Conventions

- Keep this layer orchestration-focused: delegate path, slug, config, discovery-summary, model-response parsing, and rendering logic to `domain/` or `templates/`.
- Use the `PiQuestionUi` surface from `tui-tools`; only add feature-flow-specific UI extensions locally when they are not reusable.
- During discovery, rebase the `QuestionQueue` from each model response, keep the submitted answer visible through busy/rendering transitions, and route status changes through the shared `FeatureFlowStateController`.
- Use `FeatureFlowStateController` for workflow-wide busy/rendering/input-ready status and loader cleanup instead of calling question loading helpers directly.
- `FeatureWorkflowContext.discoveryModelAdapter` and `createDiscoveryModelAdapter` are the test/integration seams for discovery and final feature-document generation; production command wiring supplies the Pi adapter.
- The workflow writes a draft before final artifacts and removes the draft after finalization. Preserve that lifecycle unless intentionally changing user-visible behavior.
- Run configured kanban converters only after feature and plan artifacts are written and confirmed by the user.
