# Validate Component Structure Skill

## Purpose

Validates that component directories follow the required structure convention: `Component.tsx`, `index.ts`, `component.types.ts` (recommended), and `parts/` directory for complex components.

## User-Visible Behavior

When triggered as part of a workflow, this skill:

1. Reads the component directory path from workflow context or garden state
2. Validates the directory structure against the convention
3. Reports validation results with clear error and warning messages
4. Flags components that don't meet the required structure
5. Provides actionable feedback for fixing issues

## Inputs

- Component directory path (from workflow context or garden state)
- Optional: `requireTypes` - whether to require component.types.ts (default: false)
- Optional: `requireParts` - whether to require parts/ directory (default: false)

## Outputs

- Validation result object with:
  - `isValid`: boolean indicating if structure is valid
  - `errors`: array of error messages
  - `warnings`: array of warning messages
  - `missingFiles`: array of missing file paths
- Logs validation results to console

## Structure Convention

### Required Files

- `Component.tsx` or `Component.jsx` - Main component implementation
- `index.ts` - Barrel export file

### Recommended Files

- `component.types.ts` - Type definitions (optional but recommended)

### Parts Directory (Optional)

- `parts/` - Directory for sub-components
- Each part should have its own file (e.g., `parts/Header.tsx`)
- `parts/index.ts` - Optional barrel export for parts

## Validation Rules

1. **Required Files Check**: Component must have Component.tsx/Component.jsx and index.ts
2. **Recommended Files Check**: Warns if component.types.ts is missing
3. **Parts Directory Check**: If parts/ exists, validates its structure
4. **No Inline Components**: Every component should have its own file (enforced by structure)

## Usage in Workflows

```typescript
// In a workflow step
const result = await validateComponentStructure({
  path: componentPath,
  requireTypes: true,
  requireParts: false,
});

if (!result.isValid) {
  // Handle validation failure
  console.error("Component structure validation failed:", result.errors);
  throw new Error("Invalid component structure");
}
```

## Integration with Workflower

This skill integrates with the story implementation loop to validate component structure as part of the development workflow. It can be invoked:

1. During component creation workflows
2. As a pre-commit check
3. As part of code review automation
4. In migration workflows to ensure consistency

## Fallback Behavior

If the component directory doesn't exist, returns an error with a clear message. If the directory exists but is empty, reports missing required files.

## Related Documentation

- [Component Directory Structure Convention](../../../../docs/component-directory-structure.md)
- [Validation Script](../../../../scripts/validate-component-structure.js)
