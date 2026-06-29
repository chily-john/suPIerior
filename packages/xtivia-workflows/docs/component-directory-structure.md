# Component Directory Structure Convention

This document describes the required directory structure for all components in the XTIVIA workflows package.

## Required Structure

Every component **must** have the following files:

```
component-name/
├── Component.tsx      # Main component file (or Component.jsx)
├── index.ts           # Barrel export file
└── component.types.ts # Type definitions (optional but recommended)
```

## For Components with Parts

Components that have sub-components or parts should organize them in a `parts/` directory:

```
component-name/
├── Component.tsx
├── index.ts
├── component.types.ts
└── parts/
    ├── Part1.tsx
    ├── Part2.tsx
    └── index.ts       # Optional: barrel export for parts
```

## Rules

### Required Files

- **Component.tsx** or **Component.jsx**: The main component implementation
- **index.ts**: Barrel export that exports the component as the default export

### Recommended Files

- **component.types.ts**: Type definitions for the component's props and internal types

### Parts Directory

- For complex components with multiple sub-components, create a `parts/` directory
- Each part should be in its own file (e.g., `parts/Header.tsx`, `parts/Footer.tsx`)
- Parts can optionally have their own `index.ts` for barrel exports

### No Inline Components

- **Do not** define components inline within other component files
- Every component, no matter how small, should have its own file
- This ensures better discoverability, testability, and maintainability

## Validation

The component structure can be validated using the validation script:

```bash
node packages/xtivia-workflows/scripts/validate-component-structure.js --path components/MyComponent
```

This script checks:

- ✅ Presence of Component.tsx or Component.jsx
- ✅ Presence of index.ts
- ⚠️ Presence of component.types.ts (warning only)
- ⚠️ Presence of parts/ directory if component has parts (warning only)

## Example: Simple Component

```
Button/
├── Component.tsx
├── index.ts
└── component.types.ts
```

### Button/Component.tsx

```tsx
export const Button = ({ children }: ButtonProps) => {
  return <button>{children}</button>;
};
```

### Button/index.ts

```ts
export { Button } from "./Component";
export type { ButtonProps } from "./component.types";
```

### Button/component.types.ts

```ts
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}
```

## Example: Component with Parts

```
Card/
├── Component.tsx
├── index.ts
├── component.types.ts
└── parts/
    ├── Header.tsx
    ├── Body.tsx
    ├── Footer.tsx
    └── index.ts
```

### Card/Component.tsx

```tsx
import { Header } from "./parts/Header";
import { Body } from "./parts/Body";
import { Footer } from "./parts/Footer";

export const Card = ({ children }: CardProps) => {
  return (
    <div className="card">
      <Header />
      <Body>{children}</Body>
      <Footer />
    </div>
  );
};
```

### Card/parts/Header.tsx

```tsx
export const Header = () => {
  return <div className="card-header">Card Header</div>;
};
```

## Auto-Fix Capability (Future)

The validation script will eventually support auto-fixing missing files:

```bash
node packages/xtivia-workflows/scripts/validate-component-structure.js --path components/MyComponent --fix
```

This will create any missing required files with appropriate templates.

## Custom Structure Templates (Future)

Custom templates will be available for different component types (e.g., presentational, container, form components).

## Pre-commit Hooks (Future)

Git hooks will be added to automatically validate component structure before commits.
