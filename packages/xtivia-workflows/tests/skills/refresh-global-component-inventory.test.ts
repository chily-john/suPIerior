import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { refreshGlobalComponentInventory } from "../../extension-src/xtivia-workflows/internals/skills/refresh-global-component-inventory/refresh-global-component-inventory";

describe("refresh-global-component-inventory", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = (await mkdir("/tmp/xtivia-test-inventory-" + Date.now(), {
      recursive: true,
    }))!;

    // Create a mock project structure
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: {
          next: "^14.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        },
      }),
    );

    // Create components directory with some components
    await mkdir(join(tempDir, "components"), { recursive: true });
    await writeFile(
      join(tempDir, "components", "Button.tsx"),
      `/**
 * Primary button component for the design system
 * @variants primary, secondary, danger
 * @atomic button, span
 */
export default function Button({ variant = "primary" }) {
  return <button className={variant}>Click me</button>;
}`,
    );
    await writeFile(
      join(tempDir, "components", "Card.tsx"),
      `/**
 * Card component for content grouping
 * @variants default, bordered, shadow
 * @atomic div
 */
export default function Card() {
  return <div>Card content</div>;
}`,
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should create inventory from scratch when file does not exist", async () => {
    const inventoryPath = join(tempDir, ".workflower", "components", "global-components.md");
    
    // Ensure the inventory file does not exist
    await rm(inventoryPath, { force: true, recursive: true });

    // Call the function
    const result = await refreshGlobalComponentInventory(tempDir);

    // Read the generated inventory
    const inventoryContent = await readFile(inventoryPath, "utf-8");
    const inventory = result.inventory;

    // Should create inventory with discovered components
    expect(inventory).toHaveLength(2);
    expect(inventory.map(i => i.name)).toContain("Button");
    expect(inventory.map(i => i.name)).toContain("Card");
    
    // Check that the output file was created
    expect(inventoryContent).toContain("# Global Component Inventory");
    expect(inventoryContent).toContain("## Components");
    expect(inventoryContent).toContain("### Button");
    expect(inventoryContent).toContain("### Card");
    
    // Check result flags
    expect(result.created).toBe(true);
    expect(result.outputPath).toBe(inventoryPath);
  });

  it("should merge new components with existing inventory", async () => {
    const inventoryPath = join(tempDir, ".workflower", "components", "global-components.md");
    
    // Create an existing inventory file
    await mkdir(join(tempDir, ".workflower", "components"), { recursive: true });
    const existingInventory = `# Global Component Inventory

Last updated: 2024-01-01T00:00:00.000Z

Total components: 1

## Components

### ExistingComponent

- **Purpose:** An existing component
- **Source File Path:** /existing/path/ExistingComponent.tsx
- **Variants:** default, large
- **Atomic Elements Used:** div, span
- **Usage Examples:**
  - "<ExistingComponent />"
`;
    await writeFile(inventoryPath, existingInventory, "utf-8");

    // Call the function - it should merge
    const result = await refreshGlobalComponentInventory(tempDir);

    // Should have both existing and new components
    expect(result.inventory).toHaveLength(3);
    expect(result.inventory.map(i => i.name)).toContain("ExistingComponent");
    expect(result.inventory.map(i => i.name)).toContain("Button");
    expect(result.inventory.map(i => i.name)).toContain("Card");
    
    // Should not be marked as created (since file existed)
    expect(result.created).toBe(false);
    expect(result.updated).toBe(true);
  });

  it("should detect discrepancies when components are missing", async () => {
    const inventoryPath = join(tempDir, ".workflower", "components", "global-components.md");
    
    // Create an existing inventory with a component that doesn't exist
    await mkdir(join(tempDir, ".workflower", "components"), { recursive: true });
    const existingInventory = `# Global Component Inventory

## Components

### MissingComponent

- **Purpose:** A component that no longer exists
- **Source File Path:** /nonexistent/path/MissingComponent.tsx
- **Variants:** default
- **Atomic Elements Used:** div
- **Usage Examples:**
  - "<MissingComponent />"
`;
    await writeFile(inventoryPath, existingInventory, "utf-8");

    // Call the function
    const result = await refreshGlobalComponentInventory(tempDir);

    // Should flag the discrepancy
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(result.discrepancies[0]).toContain("MissingComponent");
    expect(result.discrepancies[0]).toContain("not found");
  });

  it("should handle projects with no components", async () => {
    const emptyDir = (await mkdir("/tmp/xtivia-test-empty-" + Date.now(), {
      recursive: true,
    }))!;

    await writeFile(
      join(emptyDir, "package.json"),
      JSON.stringify({ name: "empty-project" }),
    );

    const result = await refreshGlobalComponentInventory(emptyDir);

    expect(result.inventory).toHaveLength(0);
    expect(result.created).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);

    // Cleanup
    await rm(emptyDir, { recursive: true, force: true });
  });

  it("should extract metadata from JSDoc comments", async () => {
    const inventoryPath = join(tempDir, ".workflower", "components", "global-components.md");
    await rm(inventoryPath, { force: true, recursive: true });

    const result = await refreshGlobalComponentInventory(tempDir);
    
    // Find the Button component
    const buttonComponent = result.inventory.find(i => i.name === "Button");
    expect(buttonComponent).toBeDefined();
    
    // Check that JSDoc metadata was extracted
    expect(buttonComponent!.purpose).toContain("Primary button component");
    expect(buttonComponent!.variants).toContain("primary");
    expect(buttonComponent!.variants).toContain("secondary");
    expect(buttonComponent!.variants).toContain("danger");
    expect(buttonComponent!.atomicElements).toContain("button");
    expect(buttonComponent!.atomicElements).toContain("span");
  });
});
