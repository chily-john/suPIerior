import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Represents an atomic element in the catalog
 */
export interface AtomicElement {
  name: string;
  importPath: string;
  purpose: string;
  usage: string;
  type: "next-builtin" | "design-system" | "raw-html";
}

/**
 * Catalog of atomic elements
 */
export interface AtomicElementsCatalog {
  nextBuiltins: AtomicElement[];
  designSystem: AtomicElement[];
  rawHtml: AtomicElement[];
  isNextJs: boolean;
  warnings: string[];
}

/**
 * Scans a project directory for atomic elements and writes the catalog
 * Returns the path to the generated catalog file
 */
export async function discoverAtomicElements(
  projectPath: string,
): Promise<{ catalog: AtomicElementsCatalog; outputPath: string }> {
  const warnings: string[] = [];
  const nextBuiltins: AtomicElement[] = [];
  const designSystem: AtomicElement[] = [];
  const rawHtml: AtomicElement[] = [];

  // Check if it's a Next.js project
  const packageJsonPath = join(projectPath, "package.json");
  let isNextJs = false;

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    isNextJs = packageJson.dependencies?.next !== undefined;
  } catch {
    warnings.push("package.json not found or invalid");
  }

  if (!isNextJs) {
    warnings.push("Next.js not detected in project dependencies");
    // Fallback to raw HTML
    rawHtml.push({
      name: "a",
      importPath: "raw-html",
      purpose: "Navigation link",
      usage: '<a href="...">...</a>',
      type: "raw-html",
    });
    rawHtml.push({
      name: "img",
      importPath: "raw-html",
      purpose: "Image display",
      usage: '<img src="..." alt="..." />',
      type: "raw-html",
    });
  }

  // Scan for Next.js built-ins
  const nextBuiltinsData = [
    {
      name: "Link",
      importPath: "next/link",
      purpose: "Client-side navigation without full page reload",
      usage: '<Link href="/about">About</Link>',
    },
    {
      name: "Image",
      importPath: "next/image",
      purpose: "Optimized image loading with automatic format conversion and lazy loading",
      usage: '<Image src="/image.jpg" alt="Description" width={500} height={300} />',
    },
  ];

  for (const data of nextBuiltinsData) {
    nextBuiltins.push({
      ...data,
      type: "next-builtin",
    });
  }

  // Scan for design system components
  const componentDirs = ["components", "src/components", "@/components"];
  const designSystemPatterns = [
    "Button",
    "Typography",
    "Card",
    "Container",
    "Icon",
    "Input",
    "Textarea",
    "Select",
    "Checkbox",
    "Radio",
    "Modal",
    "Dialog",
    "Alert",
    "Badge",
    "Avatar",
    "Nav",
    "Navbar",
    "Footer",
    "Header",
  ];

  if (isNextJs) {
    for (const dir of componentDirs) {
      const fullPath = join(projectPath, dir);
      try {
        const files = await readdir(fullPath);
        for (const file of files) {
          const fileName = file.replace(/\.tsx?$|\.jsx?$|\.ts$|\.js$/, "");
          if (designSystemPatterns.some((p) => fileName === p)) {
            designSystem.push({
              name: fileName,
              importPath: `${dir}/${file}`,
              purpose: `Design system ${fileName}`,
              usage: `<${fileName} />`,
              type: "design-system",
            });
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
  }

  const catalog: AtomicElementsCatalog = {
    nextBuiltins,
    designSystem,
    rawHtml,
    isNextJs,
    warnings,
  };

  // Write the catalog to file
  const outputPath = join(projectPath, ".workflower", "components", "atomic-elements.md");
  const markdown = generateAtomicElementsCatalog(catalog);

  // Ensure the output directory exists
  await mkdir(join(projectPath, ".workflower", "components"), { recursive: true });

  // Write the catalog file
  await writeFile(outputPath, markdown, "utf-8");

  return { catalog, outputPath };
}

/**
 * Generates the markdown catalog from the discovered elements
 */
export function generateAtomicElementsCatalog(catalog: AtomicElementsCatalog): string {
  const lines: string[] = [];

  lines.push("# Atomic Elements Catalog");
  lines.push("");

  if (catalog.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of catalog.warnings) {
      lines.push(`- ⚠️ ${warning}`);
    }
    lines.push("");
  }

  if (!catalog.isNextJs) {
    lines.push("## Raw HTML Elements (Next.js not detected)");
    lines.push("");
    for (const element of catalog.rawHtml) {
      lines.push(`### ${element.name}`);
      lines.push(`- **Import Path:** ${element.importPath}`);
      lines.push(`- **Purpose:** ${element.purpose}`);
      lines.push(`- **Usage:** ${element.usage}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  lines.push("## Next.js Built-ins");
  lines.push("");
  for (const element of catalog.nextBuiltins) {
    lines.push(`### ${element.name}`);
    lines.push(`- **Import Path:** ${element.importPath}`);
    lines.push(`- **Purpose:** ${element.purpose}`);
    lines.push(`- **Usage:** ${element.usage}`);
    lines.push("");
  }

  lines.push("## Design System Components");
  lines.push("");
  if (catalog.designSystem.length === 0) {
    lines.push("No design system components found.");
    lines.push("");
  } else {
    for (const element of catalog.designSystem) {
      lines.push(`### ${element.name}`);
      lines.push(`- **Import Path:** ${element.importPath}`);
      lines.push(`- **Purpose:** ${element.purpose}`);
      lines.push(`- **Usage:** ${element.usage}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
