import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Represents a component in the global inventory
 */
export interface ComponentInventoryItem {
  name: string;
  purpose: string;
  variants: string[];
  atomicElements: string[];
  sourceFilePath: string;
  usageExamples: string[];
}

/**
 * Result of refreshing the global component inventory
 */
export interface RefreshInventoryResult {
  inventory: ComponentInventoryItem[];
  outputPath: string;
  created: boolean;
  updated: boolean;
  warnings: string[];
  discrepancies: string[];
}

/**
 * Scans a project directory for components and refreshes the global inventory
 * @param projectPath - Absolute path to the project directory
 * @param workflowerWorkdir - Optional path to Workflower workdir (defaults to projectPath)
 * @returns Promise with the refresh result
 */
export async function refreshGlobalComponentInventory(
  projectPath: string,
  workflowerWorkdir?: string,
): Promise<RefreshInventoryResult> {
  const warnings: string[] = [];
  const discrepancies: string[] = [];
  const workdir = workflowerWorkdir || projectPath;
  const inventoryPath = join(workdir, ".workflower", "components", "global-components.md");

  // Read existing inventory if it exists
  let existingInventory: ComponentInventoryItem[] = [];
  try {
    const inventoryContent = await readFile(inventoryPath, "utf-8");
    existingInventory = parseInventoryMarkdown(inventoryContent);
  } catch {
    // Inventory file doesn't exist yet, that's fine
  }

  // Scan for components in the project
  const discoveredComponents = await scanForComponents(projectPath, warnings);

  // Validate existing inventory against actual files
  for (const existingItem of existingInventory) {
    try {
      const fileStat = await stat(existingItem.sourceFilePath);
      if (!fileStat.isFile()) {
        discrepancies.push(
          `Component '${existingItem.name}' references a non-file path: ${existingItem.sourceFilePath}`,
        );
      }
    } catch {
      discrepancies.push(
        `Component '${existingItem.name}' not found at: ${existingItem.sourceFilePath}`,
      );
    }
  }

  // Merge discovered components with existing inventory
  // Deduplicate by source file path
  const mergedInventory = mergeInventories(existingInventory, discoveredComponents);

  // Ensure output directory exists
  await mkdir(join(workdir, ".workflower", "components"), { recursive: true });

  // Write updated inventory
  const markdown = generateInventoryMarkdown(mergedInventory);
  await writeFile(inventoryPath, markdown, "utf-8");

  return {
    inventory: mergedInventory,
    outputPath: inventoryPath,
    created: existingInventory.length === 0,
    updated: mergedInventory.length !== existingInventory.length || discrepancies.length > 0,
    warnings,
    discrepancies,
  };
}

/**
 * Parses a markdown inventory file into ComponentInventoryItem array
 */
function parseInventoryMarkdown(markdown: string): ComponentInventoryItem[] {
  const items: ComponentInventoryItem[] = [];
  const lines = markdown.split("\n");

  let currentItem: Partial<ComponentInventoryItem> | null = null;

  for (const line of lines) {
    // Match component section headers (### Component Name)
    const componentMatch = line.match(/^###\s+(.+)$/);
    if (componentMatch) {
      // Save previous item if exists
      if (currentItem && currentItem.name) {
        items.push(normalizeItem(currentItem));
      }
      currentItem = { name: componentMatch[1] };
      continue;
    }

    if (!currentItem) continue;

    // Match field lines (- **Field:** value)
    const fieldMatch = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1] as keyof ComponentInventoryItem;
      const fieldValue = fieldMatch[2].trim();

      // Handle different field types
      switch (fieldName) {
        case "name":
        case "purpose":
        case "sourceFilePath":
          currentItem[fieldName] = fieldValue;
          break;
        case "variants":
          currentItem.variants = fieldValue.split(", ").map((v) => v.trim());
          break;
        case "atomicElements":
          currentItem.atomicElements = fieldValue.split(", ").map((e) => e.trim());
          break;
        case "usageExamples":
          // Handle multi-line usage examples
          currentItem.usageExamples = [fieldValue];
          break;
      }
      continue;
    }

    // Handle usage examples that are indented
    const usageMatch = line.match(/^\s+-\s+"(.*?)"$/);
    if (usageMatch && currentItem) {
      if (!currentItem.usageExamples) {
        currentItem.usageExamples = [];
      }
      currentItem.usageExamples.push(usageMatch[1]);
      continue;
    }
  }

  // Save the last item
  if (currentItem && currentItem.name) {
    items.push(normalizeItem(currentItem));
  }

  return items;
}

/**
 * Normalizes a partial item to ensure all arrays are initialized
 */
function normalizeItem(item: Partial<ComponentInventoryItem>): ComponentInventoryItem {
  return {
    name: item.name || "",
    purpose: item.purpose || "",
    variants: item.variants || [],
    atomicElements: item.atomicElements || [],
    sourceFilePath: item.sourceFilePath || "",
    usageExamples: item.usageExamples || [],
  };
}

/**
 * Scans a project directory for component files
 */
async function scanForComponents(
  projectPath: string,
  warnings: string[],
): Promise<ComponentInventoryItem[]> {
  const components: ComponentInventoryItem[] = [];
  const componentDirs = ["components", "src/components", "@/components"];
  let foundAnyComponentDir = false;

  for (const dir of componentDirs) {
    const fullPath = join(projectPath, dir);
    try {
      const files = await readdir(fullPath);
      foundAnyComponentDir = true;
      for (const file of files) {
        const filePath = join(fullPath, file);
        const fileStat = await stat(filePath);

        if (fileStat.isFile() && isComponentFile(file)) {
          const component = await extractComponentMetadata(filePath, projectPath);
          if (component) {
            components.push(component);
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Add warning if no component directories were found
  if (!foundAnyComponentDir) {
    warnings.push(
      "No standard component directories found (components/, src/components/, @/components/)",
    );
  }

  return components;
}

/**
 * Checks if a file is a component file based on extension
 */
function isComponentFile(filename: string): boolean {
  return /\.(tsx|jsx|ts|js)$/.test(filename);
}

/**
 * Extracts component metadata from a component file
 */
async function extractComponentMetadata(
  filePath: string,
  projectPath: string,
): Promise<ComponentInventoryItem | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const relativePath = relative(projectPath, filePath);
    const fileName = filePath
      .split("/")
      .pop()!
      .replace(/\.(tsx|jsx|ts|js)$/, "");

    // Extract JSDoc comments
    const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    let purpose = `Component: ${fileName}`;
    let variants: string[] = [];
    let atomicElements: string[] = [];
    let usageExamples: string[] = [];

    if (jsdocMatch) {
      const jsdoc = jsdocMatch[0];

      // Extract purpose from description
      const descriptionMatch = jsdoc.match(/\*\s+(.+?)(?:\n\s+\*\s+@|\n\s+\*\/)/);
      if (descriptionMatch) {
        purpose = descriptionMatch[1].trim();
      }

      // Extract variants
      const variantsMatch = jsdoc.match(/@variants\s+(.+?)(?:\n\s+\*\s+@|\n\s+\*\/)/);
      if (variantsMatch) {
        variants = variantsMatch[1].split(",").map((v) => v.trim());
      }

      // Extract atomic elements
      const atomicMatch = jsdoc.match(/@atomic\s+(.+?)(?:\n\s+\*\s+@|\n\s+\*\/)/);
      if (atomicMatch) {
        atomicElements = atomicMatch[1].split(",").map((e) => e.trim());
      }
    }

    // Try to extract usage examples from the file
    // Look for export default statements
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    const componentName = exportMatch ? exportMatch[1] : fileName;

    // Generate a basic usage example
    usageExamples = [`<${componentName} />`, `<${componentName} variant="primary" />`];

    return {
      name: componentName,
      purpose,
      variants,
      atomicElements,
      sourceFilePath: filePath,
      usageExamples,
    };
  } catch {
    return null;
  }
}

/**
 * Merges existing inventory with newly discovered components
 * Deduplicates by source file path
 */
function mergeInventories(
  existing: ComponentInventoryItem[],
  discovered: ComponentInventoryItem[],
): ComponentInventoryItem[] {
  const merged = new Map<string, ComponentInventoryItem>();

  // Add existing items
  for (const item of existing) {
    merged.set(item.sourceFilePath, item);
  }

  // Add or update with discovered items
  for (const item of discovered) {
    merged.set(item.sourceFilePath, item);
  }

  return Array.from(merged.values());
}

/**
 * Generates markdown from the inventory
 */
export function generateInventoryMarkdown(inventory: ComponentInventoryItem[]): string {
  const lines: string[] = [];

  lines.push("# Global Component Inventory");
  lines.push("");
  lines.push(`Last updated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Total components: ${inventory.length}`);
  lines.push("");

  if (inventory.length === 0) {
    lines.push("No components found.");
    return lines.join("\n");
  }

  lines.push("## Components");
  lines.push("");

  for (const item of inventory.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`### ${item.name}`);
    lines.push("");
    lines.push(`- **Purpose:** ${item.purpose}`);
    lines.push(`- **Source File Path:** ${item.sourceFilePath}`);

    if (item.variants && item.variants.length > 0) {
      lines.push(`- **Variants:** ${item.variants.join(", ")}`);
    }

    if (item.atomicElements && item.atomicElements.length > 0) {
      lines.push(`- **Atomic Elements Used:** ${item.atomicElements.join(", ")}`);
    }

    if (item.usageExamples && item.usageExamples.length > 0) {
      lines.push(`- **Usage Examples:**`);
      for (const example of item.usageExamples) {
        lines.push(`  - "` + example + `"`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
