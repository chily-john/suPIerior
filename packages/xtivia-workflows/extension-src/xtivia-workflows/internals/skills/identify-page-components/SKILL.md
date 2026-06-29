---
name: identify-page-components
description: Classifies each UI element on a captured page to determine whether it should reuse an existing global component, reuse with a variant, create a new global component, split/refactor an existing component, or remain as a page-specific component.
---

# Identify Page Components Skill

## Purpose

Classifies each UI element on a captured page to determine whether it should reuse an existing global component, reuse with a variant, create a new global component, split/refactor an existing component, or remain as a page-specific component.

## When to Use

- After page capture and atomic audit steps
- When analyzing a new page to determine component architecture
- To prevent duplicate component creation
- To identify opportunities for component reuse and consolidation

## Inputs

- `projectPath`: Absolute path to the project directory
- `workflowerWorkdir`: Optional path to the Workflower workdir (defaults to projectPath)

## Outputs

- Writes classified components to `.workflower/components/current-page-components.md`
- Returns array of classified elements with decisions and rationale

## Behavior

1. Reads DOM summary from capture artifacts
2. Reads atomic elements catalog from Story 001
3. Reads global component inventory from Story 002
4. For each UI element in the DOM summary:
   - Checks if it matches an existing global component
   - Checks if it can be built from atomic elements
   - Determines the best classification
5. Writes classification results to markdown file
6. Returns structured classification data

## Classification Types

- **reuse-existing**: Element matches an existing global component exactly
- **reuse-with-variant**: Element matches a global component with a specific variant
- **create-new**: Element requires a new global component to be created
- **split-refactor**: Element should be split or refactored from an existing component
- **page-specific**: Element is specific to this page and should not be global

## Decision Priority

1. Prefer reuse of existing global components (with or without variants)
2. Prefer creating new global components over page-specific when element appears multiple times
3. Use split/refactor when existing components are too monolithic
4. Mark as page-specific only when element is truly unique to this page

## Example Usage

```typescript
import { identifyPageComponents } from "./identify-page-components/identify-page-components";

const result = await identifyPageComponents("/path/to/project");
console.log(`Classified ${result.classifications.length} components`);
```

## Validation

The skill validates that:

- DOM summary file exists and is readable
- Atomic elements catalog exists
- Global component inventory exists
- All classifications have required fields (decision, rationale, target)

## Notes

- Conservative by default: prefers reuse over creation
- Includes confidence scoring for each classification
- Suggests alternatives for uncertain classifications
- Can mark classifications as reviewed/approved for team workflow
