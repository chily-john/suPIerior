---
name: discover-atomic-elements
description: Scans the target Next.js project and discovers all available atomic/design-system elements, producing a structured catalog at .workflower/components/atomic-elements.md.
---

# Discover Atomic Elements Skill

## Purpose

Scans the target Next.js project and discovers all available atomic/design-system elements, producing a structured catalog at `.workflower/components/atomic-elements.md`.

## User-Visible Behavior

When triggered as part of a workflow (e.g., `discover-atomic-elements` step), this skill:

1. Detects if the target project is a Next.js project by checking `package.json`
2. Scans common directories (`components/`, `src/components/`, `@/components/`) for atomic elements
3. Identifies Next.js built-in atomic elements (Link, Image)
4. Identifies design system components by convention
5. Writes a markdown catalog to `.workflower/components/atomic-elements.md`

## Inputs

- Target project directory path (from garden state or workflow context)

## Outputs

- `.workflower/components/atomic-elements.md` - Markdown catalog

## Fallback Behavior

If Next.js is not detected, falls back to raw HTML elements with warnings.
