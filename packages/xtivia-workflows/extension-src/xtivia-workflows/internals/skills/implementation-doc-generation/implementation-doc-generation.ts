/**
 * Implementation Doc Generation Enhancement
 * Story 006: Implementation Doc Generation Enhancement
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface GenerateEnhancedImplementationDocOptions {
  existingDoc: string;
  atomicElementsCatalog?: string;
  globalComponentInventory?: string;
  pageComponentDecisions?: string;
  projectPath: string;
  workflowerWorkdir?: string;
}

export interface EnhancedImplementationDocResult {
  doc: string;
  outputPath?: string;
  warnings: string[];
}

export interface PageComponentDecision {
  elementId: string;
  decision: string;
  targetComponent?: string;
  variant?: string;
}

export interface ComponentMetadata {
  componentName: string;
  globalComponent?: string;
  reuseType?: "extends" | "reuses" | "new";
  atomicElements: string[];
  newVariants: string[];
  fileStructure: string;
}

export function parseAtomicElements(catalog: string): string[] {
  const elements: string[] = [];
  const lines = catalog.split("\n");
  for (const line of lines) {
    const elementMatch = line.match(/^###\s+(.+)$/);
    if (elementMatch) {
      elements.push(elementMatch[1]);
    }
  }
  return elements;
}

export function parseGlobalComponents(inventory: string): string[] {
  const components: string[] = [];
  const lines = inventory.split("\n");
  for (const line of lines) {
    const componentMatch = line.match(/^###\s+(.+)$/);
    if (componentMatch) {
      components.push(componentMatch[1]);
    }
  }
  return components;
}

export function parsePageComponentDecisions(decisions: string): PageComponentDecision[] {
  const results: PageComponentDecision[] = [];
  const lines = decisions.split("\n");
  let currentElement: Partial<PageComponentDecision> | null = null;
  for (const line of lines) {
    const elementMatch = line.match(/^####\s+(.+)$/);
    if (elementMatch) {
      if (currentElement) {
        results.push(currentElement as PageComponentDecision);
      }
      currentElement = { elementId: elementMatch[1] };
      continue;
    }
    if (!currentElement) continue;
    const fieldMatch = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldValue = fieldMatch[2].trim();
      switch (fieldName) {
        case "Decision":
          currentElement.decision = fieldValue;
          break;
        case "Target Component":
          currentElement.targetComponent = fieldValue;
          break;
        case "Variant":
          currentElement.variant = fieldValue;
          break;
      }
      continue;
    }
  }
  if (currentElement) {
    results.push(currentElement as PageComponentDecision);
  }
  return results;
}

function generateFileStructure(componentName: string, decision: string): string {
  const lines: string[] = [];
  lines.push(`${componentName}/`);
  lines.push(`├── Component.tsx`);
  lines.push(`├── index.ts`);
  lines.push(`└── component.types.ts`);
  if (decision === "create-new" || decision === "reuse-with-variant") {
    lines.push(`    └── parts/`);
  }
  return lines.join("\n");
}

export function generateComponentMetadata(
  decisions: PageComponentDecision[],
  globalComponents: string[],
  atomicElements: string[],
): ComponentMetadata[] {
  const metadata: ComponentMetadata[] = [];
  for (const decision of decisions) {
    const componentName = decision.targetComponent || decision.elementId;
    let reuseType: "extends" | "reuses" | "new" | undefined;
    if (decision.decision === "reuse-existing") {
      reuseType = "reuses";
    } else if (decision.decision === "reuse-with-variant") {
      reuseType = "extends";
    } else if (decision.decision === "create-new") {
      reuseType = "new";
    }
    const newVariants: string[] = [];
    if (decision.variant) {
      newVariants.push(decision.variant);
    }
    const fileStructure = generateFileStructure(componentName, decision.decision);
    metadata.push({
      componentName,
      globalComponent: decision.decision.includes("reuse") ? decision.targetComponent : undefined,
      reuseType,
      atomicElements: [],
      newVariants,
      fileStructure,
    });
  }
  return metadata;
}

export function generateEnhancedImplementationDoc(
  options: GenerateEnhancedImplementationDocOptions,
): EnhancedImplementationDocResult {
  const warnings: string[] = [];
  const {
    existingDoc,
    atomicElementsCatalog = "",
    globalComponentInventory = "",
    pageComponentDecisions = "",
  } = options;

  const atomicElements = parseAtomicElements(atomicElementsCatalog);
  const globalComponents = parseGlobalComponents(globalComponentInventory);
  const decisions = parsePageComponentDecisions(pageComponentDecisions);
  const componentMetadata = generateComponentMetadata(decisions, globalComponents, atomicElements);

  const lines: string[] = [];
  lines.push(existingDoc);
  lines.push("");
  lines.push("## References");
  lines.push("");
  lines.push("### Atomic Elements Reference");
  lines.push("");
  if (atomicElements.length > 0) {
    lines.push("The following atomic elements are available for use:");
    lines.push("");
    for (const element of atomicElements) {
      lines.push(`- ${element}`);
    }
  } else {
    lines.push("No atomic elements catalog found.");
    warnings.push("Atomic elements catalog is empty or not provided");
  }
  lines.push("");
  lines.push("### Global Component Reuse");
  lines.push("");
  if (globalComponents.length > 0) {
    lines.push("The following global components are available for reuse:");
    lines.push("");
    for (const component of globalComponents) {
      lines.push(`- ${component}`);
    }
  } else {
    lines.push("No global component inventory found.");
    warnings.push("Global component inventory is empty or not provided");
  }
  lines.push("");
  lines.push("### New Component Decisions");
  lines.push("");
  if (componentMetadata.length > 0) {
    lines.push("Component decisions from page analysis:");
    lines.push("");
    for (const metadata of componentMetadata) {
      lines.push(`#### ${metadata.componentName}`);
      lines.push("");
      lines.push(`- **Global Component:** ${metadata.globalComponent || "N/A"}`);
      lines.push(`- **Reuse Type:** ${metadata.reuseType || "N/A"}`);
      lines.push(`- **Atomic Elements Used:** ${metadata.atomicElements.join(", ") || "None"}`);
      lines.push(`- **New Variants Needed:** ${metadata.newVariants.join(", ") || "None"}`);
      lines.push(`- **File Structure:**`);
      for (const line of metadata.fileStructure.split("\n")) {
        lines.push(`  ${line}`);
      }
      lines.push("");
    }
  } else {
    lines.push("No component decisions found.");
    warnings.push("Page component decisions is empty or not provided");
  }

  const doc = lines.join("\n");
  return { doc, warnings };
}
