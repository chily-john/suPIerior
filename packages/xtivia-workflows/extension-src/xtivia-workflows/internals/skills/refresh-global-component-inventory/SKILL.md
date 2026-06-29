---
name: refresh-global-component-inventory
description: Maintains a persistent global component inventory that tracks all reusable components across workflow runs.
---

# Refresh Global Component Inventory

## Purpose

Maintains a persistent global component inventory that tracks all reusable components across workflow runs. This skill ensures agents can consult the inventory before creating new components to avoid duplication.

## When to Use

- At the start of each workflow run to refresh the component inventory
- When new components are added to the project
- When verifying component usage across the codebase

## Inputs

- `projectPath`: Absolute path to the project directory to scan
- `workflowerWorkdir`: Optional path to the Workflower workdir (defaults to projectPath)

## Outputs

- Writes/updates `.workflower/components/global-components.md` with the component inventory
- Returns the inventory array and the output path

## Behavior

1. Reads existing inventory from `.workflower/components/global-components.md` if it exists
2. Scans the project for component files in standard directories (components/, src/components/, @/components/)
3. Extracts component metadata from:
   - File names
   - Directory structure
   - JSDoc comments (purpose, variants, atomic elements)
   - Type definitions
4. Merges new components with existing inventory, deduplicating by source file path
5. Validates inventory against actual files and flags discrepancies
6. Writes updated inventory to `.workflower/components/global-components.md`

## Component Metadata

Each component entry includes:
- **name**: Component name
- **purpose**: Component description/purpose
- **variants**: Available variants (if any)
- **atomic elements used**: Atomic elements this component uses
- **source file path**: Absolute path to the component file
- **usage examples**: Example usage patterns

## Example Usage

```typescript
import { refreshGlobalComponentInventory } from './refresh-global-component-inventory';

const result = await refreshGlobalComponentInventory('/path/to/project');
console.log(`Inventory updated with ${result.inventory.length} components`);
```

## Validation

The skill validates that:
- All components in the inventory still exist at their declared paths
- No duplicate components exist (by source path)
- Component metadata is complete

## Notes

- Inventory persists across workflow runs via the `.workflower/components/` directory
- First run creates the inventory from scratch
- Subsequent runs merge new components and validate existing ones
- Uses gitignore-safe file scanning to avoid node_modules and other excluded directories
