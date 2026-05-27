import type { DiscoveryContext } from "@domain/model";

export const defaultFeatureDocumentTemplate = `## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories. Each user story should be in the format:

1. As an <actor>, I want a <feature>, so that <benefit>

Cover all known aspects of the feature from discovery.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built or modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do not include specific file paths or code snippets unless a prototype produced a snippet that encodes a decision more precisely than prose can. If included, trim it to the decision-rich parts and note that it came from a prototype.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test: test external behavior, not implementation details
- Which modules will be tested
- Prior art for the tests, such as similar test styles in the codebase

## Out of Scope

A description of the things that are out of scope for this feature.

## Further Notes

Any further notes about the feature.
`;

export function renderDraft(context: DiscoveryContext): string {
  return `# Feature Draft: ${context.slug}\n\n## Original description\n\n${context.description}\n\n## Intent\n\n${context.intent}\n\n## Discovery summary\n\n${context.answers.map((answer) => `- ${answer.summary}`).join("\n") || "- No discovery answers captured."}\n\n## Decisions\n\n${list(context.decisions)}\n\n## Constraints\n\n${list(context.constraints)}\n\n## Assumptions\n\n${list(context.assumptions)}\n\n## Requirements\n\n${list(context.requirements)}\n\n## Open questions\n\n${list(context.openQuestions)}\n`;
}

export function renderFeature(context: DiscoveryContext, blockerAnswers: string[] = []): string {
  return `# Feature: ${context.slug}\n\n## Summary\n\n${context.description}\n\n## Problem / Motivation\n\n${context.intent}\n\n## Goals\n\n${list(context.requirements.length ? context.requirements : [context.description])}\n\n## Non-goals / Out of scope\n\n${list(context.constraints.filter((item) => /scope|out of scope|boundary/i.test(item)))}\n\n## Key decisions\n\n${list(context.decisions)}\n\n## Requirements\n\n${list(context.requirements)}\n\n## Constraints\n\n${list(context.constraints)}\n\n## Assumptions\n\n${list(context.assumptions)}\n\n## Open questions\n\n${list([...context.openQuestions, ...blockerAnswers])}\n`;
}

export function renderPlan(context: DiscoveryContext): string {
  return `# Plan: ${context.slug}\n\n## Implementation approach\n\nBuild the feature in small, validated increments. Prefer targeted inspection of affected areas over broad codebase research, and record uncertainty where details still need confirmation.\n\n## Task breakdown\n\n- Confirm package or feature ownership.\n- Implement the smallest cohesive domain model and runtime integration.\n- Add templates, prompts, or UI affordances needed by the user-visible workflow.\n- Add unit tests for pure domain behavior.\n- Add integration coverage for command orchestration or adapter boundaries where practical.\n- Run package and root validation.\n\n## Acceptance criteria\n\n${list(context.requirements.length ? context.requirements : ["The requested feature works as described."])}\n\n## Validation plan\n\n- Run targeted unit tests for changed modules.\n- Run package build, typecheck, lint, and test scripts.\n- Manually exercise the primary user workflow when UI behavior changes.\n\n## Risks / Watchouts\n\n${list(context.openQuestions)}\n\n## Verified affected areas\n\n- To be verified during implementation.\n\n## Likely / To-verify affected areas\n\n${list(context.decisions)}\n`;
}

function list(items: string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- None identified for V1.";
}
