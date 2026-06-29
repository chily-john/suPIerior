import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Classification decision types
 */
export type ClassificationDecision = 
  | "reuse-existing"
  | "reuse-with-variant"
  | "create-new"
  | "split-refactor"
  | "page-specific";

/**
 * A single page element from DOM summary
 */
export interface PageElement {
  id: string;
  type: string;
  classes: string[];
  textContent: string;
  children: PageElement[];
}

/**
 * DOM summary structure from capture
 */
export interface DomSummary {
  pageUrl: string;
  pageTitle: string;
  elements: PageElement[];
}

/**
 * Atomic element from catalog
 */
export interface AtomicElement {
  name: string;
  importPath: string;
  purpose: string;
  usage: string;
  type: "next-builtin" | "design-system" | "raw-html";
}

/**
 * Global component from inventory
 */
export interface GlobalComponent {
  name: string;
  purpose: string;
  variants: string[];
  atomicElements: string[];
  sourceFilePath: string;
  usageExamples: string[];
}

/**
 * Classification result for a single element
 */
export interface PageComponentClassification {
  elementId: string;
  elementType: string;
  elementClasses: string[];
  decision: ClassificationDecision;
  targetComponent: string;
  variant?: string;
  rationale: string;
  confidence: number; // 0-100
  suggestion?: string;
  reviewed?: boolean;
  blocked?: boolean;
  blockingReason?: string;
}

/**
 * Result of identifying page components
 */
export interface IdentifyPageComponentsResult {
  classifications: PageComponentClassification[];
  outputPath: string;
  warnings: string[];
  blocked: boolean;
  blockingReason?: string;
}

/**
 * Parses atomic elements catalog markdown into AtomicElement array
 */
export function parseAtomicElementsCatalog(markdown: string): AtomicElement[] {
  const elements: AtomicElement[] = [];
  const lines = markdown.split("\n");

  let currentSection: "next-builtins" | "design-system" | "raw-html" | null = null;
  let currentElement: Partial<AtomicElement> | null = null;

  for (const line of lines) {
    // Section headers
    if (line.match(/^## Next\.js Built-ins$/i)) {
      currentSection = "next-builtins";
      continue;
    }
    if (line.match(/^## Design System Components$/i)) {
      currentSection = "design-system";
      continue;
    }
    if (line.match(/^## Raw HTML Elements/i)) {
      currentSection = "raw-html";
      continue;
    }

    // Element headers (### Element Name)
    const elementMatch = line.match(/^###\s+(.+)$/);
    if (elementMatch) {
      if (currentElement) {
        elements.push(normalizeAtomicElement(currentElement, currentSection));
      }
      currentElement = { name: elementMatch[1] };
      continue;
    }

    if (!currentElement) continue;

    // Field lines (- **Field:** value)
    const fieldMatch = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldValue = fieldMatch[2].trim();

      switch (fieldName) {
        case "Import Path":
          currentElement.importPath = fieldValue;
          break;
        case "Purpose":
          currentElement.purpose = fieldValue;
          break;
        case "Usage":
          currentElement.usage = fieldValue;
          break;
      }
      continue;
    }
  }

  // Save the last element
  if (currentElement) {
    elements.push(normalizeAtomicElement(currentElement, currentSection));
  }

  return elements;
}

/**
 * Normalizes atomic element with default values
 */
function normalizeAtomicElement(
  element: Partial<AtomicElement>,
  section: string | null,
): AtomicElement {
  const typeMap: Record<string, "next-builtin" | "design-system" | "raw-html"> = {
    "next-builtins": "next-builtin",
    "design-system": "design-system",
    "raw-html": "raw-html",
  };

  return {
    name: element.name || "",
    importPath: element.importPath || "",
    purpose: element.purpose || "",
    usage: element.usage || "",
    type: section ? typeMap[section] || "raw-html" : "raw-html",
  };
}

/**
 * Parses global component inventory markdown into GlobalComponent array
 */
export function parseGlobalComponentInventory(markdown: string): GlobalComponent[] {
  const components: GlobalComponent[] = [];
  const lines = markdown.split("\n");

  let currentComponent: Partial<GlobalComponent> | null = null;

  for (const line of lines) {
    // Component headers (### Component Name)
    const componentMatch = line.match(/^###\s+(.+)$/);
    if (componentMatch) {
      if (currentComponent && currentComponent.name) {
        components.push(normalizeGlobalComponent(currentComponent));
      }
      currentComponent = { name: componentMatch[1] };
      continue;
    }

    if (!currentComponent) continue;

    // Field lines (- **Field:** value)
    const fieldMatch = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldValue = fieldMatch[2].trim();

      switch (fieldName) {
        case "Purpose":
          currentComponent.purpose = fieldValue;
          break;
        case "Source File Path":
          currentComponent.sourceFilePath = fieldValue;
          break;
        case "Variants":
          currentComponent.variants = fieldValue.split(", ").map((v) => v.trim());
          break;
        case "Atomic Elements Used":
          currentComponent.atomicElements = fieldValue.split(", ").map((e) => e.trim());
          break;
        case "Usage Examples":
          // This is a multi-line field, handle separately
          break;
      }
      continue;
    }

    // Handle usage examples that are indented
    const usageMatch = line.match(/^\s+-\s+"(.*?)"/);
    if (usageMatch && currentComponent) {
      if (!currentComponent.usageExamples) {
        currentComponent.usageExamples = [];
      }
      currentComponent.usageExamples.push(usageMatch[1]);
      continue;
    }
  }

  // Save the last component
  if (currentComponent && currentComponent.name) {
    components.push(normalizeGlobalComponent(currentComponent));
  }

  return components;
}

/**
 * Normalizes global component with default values
 */
function normalizeGlobalComponent(
  component: Partial<GlobalComponent>,
): GlobalComponent {
  return {
    name: component.name || "",
    purpose: component.purpose || "",
    variants: component.variants || [],
    atomicElements: component.atomicElements || [],
    sourceFilePath: component.sourceFilePath || "",
    usageExamples: component.usageExamples || [],
  };
}

/**
 * Classifies a single page element
 */
export function classifyElement(
  element: PageElement,
  globalComponents: GlobalComponent[],
  atomicElements: AtomicElement[],
): PageComponentClassification {
  const elementName = deriveElementName(element);
  const elementClassesStr = element.classes.join(" ");

  // Rule: "Do not create duplicate page-local cards/sections when a shared component with variants would work"
  // Check for Card-like elements first
  if (elementName.toLowerCase().includes("card") || elementClassesStr.includes("card")) {
    const cardComponent = globalComponents.find(
      (c) => c.name.toLowerCase() === "card",
    );
    if (cardComponent) {
      // Only return reuse-with-variant if there's an explicit variant match in classes
      // (not just "card" which is the base class)
      const matchingVariant = findBestVariant(element, cardComponent);
      const hasExplicitVariant = element.classes.some(
        (c) => cardComponent.variants.some(
          (v) => c.toLowerCase() === v.toLowerCase() && !c.toLowerCase().includes("card")
        )
      );
      if (matchingVariant && hasExplicitVariant) {
        return {
          elementId: element.id,
          elementType: element.type,
          elementClasses: element.classes,
          decision: "reuse-with-variant",
          targetComponent: "Card",
          variant: matchingVariant,
          rationale: `Element '${element.id}' with classes '${elementClassesStr}' matches existing global Card component with variant '${matchingVariant}'`,
          confidence: 95,
        };
      }
      // Default to reuse-existing
      return {
        elementId: element.id,
        elementType: element.type,
        elementClasses: element.classes,
        decision: "reuse-existing",
        targetComponent: "Card",
        rationale: `Element '${element.id}' with classes '${elementClassesStr}' matches existing global Card component`,
        confidence: 90,
      };
    }
  }

  // Check for Button-like elements
  if (elementName.toLowerCase().includes("button") || 
      element.type === "button" || 
      elementClassesStr.includes("btn")) {
    const buttonComponent = globalComponents.find(
      (c) => c.name.toLowerCase() === "button",
    );
    if (buttonComponent) {
      // Only return reuse-with-variant if there's an explicit variant match (not just "btn")
      const matchingVariant = findBestVariant(element, buttonComponent);
      // Check if variant appears in classes (but not just "btn" which is the base class)
      const hasExplicitVariant = element.classes.some(
        (c) => buttonComponent.variants.some(
          (v) => c.toLowerCase() === v.toLowerCase() && c !== "btn"
        )
      );
      if (matchingVariant && hasExplicitVariant) {
        return {
          elementId: element.id,
          elementType: element.type,
          elementClasses: element.classes,
          decision: "reuse-with-variant",
          targetComponent: "Button",
          variant: matchingVariant,
          rationale: `Element '${element.id}' with classes '${elementClassesStr}' matches existing global Button component with variant '${matchingVariant}'`,
          confidence: 95,
        };
      }
      return {
        elementId: element.id,
        elementType: element.type,
        elementClasses: element.classes,
        decision: "reuse-existing",
        targetComponent: "Button",
        rationale: `Element '${element.id}' with type '${element.type}' or classes '${elementClassesStr}' matches existing global Button component`,
        confidence: 90,
      };
    }
  }

  // Check for Typography-like elements
  if (elementName.toLowerCase().includes("typography") ||
      elementName.toLowerCase().includes("text") ||
      ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span"].includes(element.type)) {
    const typographyComponent = globalComponents.find(
      (c) => c.name.toLowerCase() === "typography",
    );
    if (typographyComponent) {
      const matchingVariant = findBestVariant(element, typographyComponent);
      if (matchingVariant) {
        return {
          elementId: element.id,
          elementType: element.type,
          elementClasses: element.classes,
          decision: "reuse-with-variant",
          targetComponent: "Typography",
          variant: matchingVariant,
          rationale: `Element '${element.id}' with type '${element.type}' matches existing global Typography component with variant '${matchingVariant}'`,
          confidence: 90,
        };
      }
      return {
        elementId: element.id,
        elementType: element.type,
        elementClasses: element.classes,
        decision: "reuse-existing",
        targetComponent: "Typography",
        rationale: `Element '${element.id}' with type '${element.type}' matches existing global Typography component`,
        confidence: 85,
      };
    }
  }

  // Check all global components for matches
  for (const component of globalComponents) {
    if (matchesComponent(element, component)) {
      // Only return reuse-with-variant if there's an explicit variant match in classes
      const matchingVariant = findBestVariant(element, component);
      if (matchingVariant && elementClassesStr.includes(matchingVariant.toLowerCase())) {
        return {
          elementId: element.id,
          elementType: element.type,
          elementClasses: element.classes,
          decision: "reuse-with-variant",
          targetComponent: component.name,
          variant: matchingVariant,
          rationale: `Element '${element.id}' matches existing global ${component.name} component with variant '${matchingVariant}'`,
          confidence: 85,
        };
      }
      return {
        elementId: element.id,
        elementType: element.type,
        elementClasses: element.classes,
        decision: "reuse-existing",
        targetComponent: component.name,
        rationale: `Element '${element.id}' matches existing global ${component.name} component`,
        confidence: 80,
      };
    }
  }

  // Check if element can be built from atomic elements
  const canBuildFromAtomic = canBuildFromAtomicElements(element, atomicElements);
  if (canBuildFromAtomic) {
    // Even if it can be built from atomic, prefer create-new for truly unknown elements
    // unless we have a specific reason to make it page-specific
    return {
      elementId: element.id,
      elementType: element.type,
      elementClasses: element.classes,
      decision: "create-new",
      targetComponent: elementName,
      rationale: `Element '${element.id}' can be built from atomic elements: ${canBuildFromAtomic.join(", ")}. Consider creating a new global component.`,
      confidence: 70,
      suggestion: "Consider creating a new global component or adding to design system",
    };
  }

  // Default: create new global component
  return {
    elementId: element.id,
    elementType: element.type,
    elementClasses: element.classes,
    decision: "create-new",
    targetComponent: elementName,
    rationale: `Element '${element.id}' with type '${element.type}' and classes '${elementClassesStr}' has no matching component. Consider adding to global component inventory.`,
    confidence: 60,
    suggestion: "Review if this should be a new global component or page-specific",
  };
}

/**
 * Derives a component name from an element
 */
function deriveElementName(element: PageElement): string {
  // Try to derive from ID
  if (element.id) {
    // Remove common prefixes and convert to PascalCase
    const name = element.id
      .replace(/^\w+-/g, "") // Remove prefix like "card-", "hero-", "test-"
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    if (name && name !== "Id") return name;
  }

  // Try to derive from classes
  if (element.classes && element.classes.length > 0) {
    // Try each class, preferring longer/more specific ones
    for (const cls of element.classes) {
      // Skip very generic class names
      if (cls === "btn" || cls === "primary" || cls === "container") continue;
      const className = cls
        .replace(/^[a-z0-9]+-/g, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      if (className) return className;
    }
    // Fallback to first class
    const className = element.classes[0]
      .replace(/^[a-z0-9]+-/g, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    if (className) return className;
  }

  // Use element type with capitalization
  return element.type
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Checks if an element matches a global component
 */
function matchesComponent(element: PageElement, component: GlobalComponent): boolean {
  const elementName = deriveElementName(element).toLowerCase();
  const componentName = component.name.toLowerCase();

  // Direct name match
  if (elementName === componentName) {
    return true;
  }

  // Check if element type matches component's atomic elements
  if (component.atomicElements.some((ae) => ae.toLowerCase() === element.type.toLowerCase())) {
    return true;
  }

  // Check if any class matches component name
  if (element.classes.some((c) => c.toLowerCase() === componentName)) {
    return true;
  }

  // Check if element name contains component name
  if (elementName.includes(componentName)) {
    return true;
  }

  return false;
}

/**
 * Finds the best matching variant for an element
 */
function findBestVariant(element: PageElement, component: GlobalComponent): string | undefined {
  if (!component.variants || component.variants.length === 0) {
    return undefined;
  }

  const elementClassesStr = element.classes.join(" ").toLowerCase();

  // Check for exact variant match in classes
  for (const variant of component.variants) {
    if (elementClassesStr.includes(variant.toLowerCase())) {
      return variant;
    }
  }

  // Check for variant in ID
  const elementIdLower = element.id.toLowerCase();
  for (const variant of component.variants) {
    if (elementIdLower.includes(variant.toLowerCase())) {
      return variant;
    }
  }

  // Return first variant as default
  return component.variants[0];
}

/**
 * Checks if an element can be built from atomic elements
 */
function canBuildFromAtomicElements(
  element: PageElement,
  atomicElements: AtomicElement[],
): string[] {
  const buildableElements: string[] = [];
  const atomicElementNames = new Set(atomicElements.map((ae) => ae.name.toLowerCase()));

  // Check if element type is atomic
  if (atomicElementNames.has(element.type.toLowerCase())) {
    buildableElements.push(element.type);
  }

  // Check if any child is atomic
  for (const child of element.children) {
    if (atomicElementNames.has(child.type.toLowerCase())) {
      buildableElements.push(child.type);
    }
  }

  return buildableElements;
}

/**
 * Reads and parses the DOM summary
 */
async function readDomSummary(projectPath: string): Promise<DomSummary | null> {
  const domSummaryPath = join(projectPath, ".workflower", "capture", "dom-summary.json");
  
  try {
    const content = await readFile(domSummaryPath, "utf-8");
    return JSON.parse(content) as DomSummary;
  } catch {
    return null;
  }
}

/**
 * Reads and parses the atomic elements catalog
 */
async function readAtomicElements(projectPath: string): Promise<AtomicElement[]> {
  const atomicElementsPath = join(projectPath, ".workflower", "components", "atomic-elements.md");
  
  try {
    const content = await readFile(atomicElementsPath, "utf-8");
    return parseAtomicElementsCatalog(content);
  } catch {
    return [];
  }
}

/**
 * Reads and parses the global component inventory
 */
async function readGlobalComponents(workdir: string): Promise<GlobalComponent[]> {
  const globalComponentsPath = join(workdir, ".workflower", "components", "global-components.md");
  
  try {
    const content = await readFile(globalComponentsPath, "utf-8");
    return parseGlobalComponentInventory(content);
  } catch {
    return [];
  }
}

/**
 * Main function to identify page components
 */
export async function identifyPageComponents(
  projectPath: string,
  workflowerWorkdir?: string,
): Promise<IdentifyPageComponentsResult> {
  const warnings: string[] = [];
  const workdir = workflowerWorkdir || projectPath;
  const outputPath = join(workdir, ".workflower", "components", "current-page-components.md");

  // Read inputs
  const domSummary = await readDomSummary(projectPath);
  if (!domSummary) {
    return {
      classifications: [],
      outputPath,
      warnings: ["DOM summary not found at .workflower/capture/dom-summary.json"],
      blocked: true,
      blockingReason: "DOM summary not found",
    };
  }

  const atomicElements = await readAtomicElements(projectPath);
  if (atomicElements.length === 0) {
    warnings.push("Atomic elements catalog not found or empty");
  }

  const globalComponents = await readGlobalComponents(workdir);
  if (globalComponents.length === 0) {
    warnings.push("Global component inventory not found or empty");
  }

  // Classify all elements
  const classifications: PageComponentClassification[] = [];
  for (const element of domSummary.elements) {
    const classification = classifyElement(element, globalComponents, atomicElements);
    classifications.push(classification);
  }

  // Generate markdown output
  const markdown = generateClassificationsMarkdown(domSummary, classifications);

  // Ensure output directory exists
  await mkdir(join(workdir, ".workflower", "components"), { recursive: true });

  // Write output
  await writeFile(outputPath, markdown, "utf-8");

  return {
    classifications,
    outputPath,
    warnings,
    blocked: false,
  };
}

/**
 * Generates markdown from classifications
 */
export function generateClassificationsMarkdown(
  domSummary: DomSummary,
  classifications: PageComponentClassification[],
): string {
  const lines: string[] = [];

  lines.push("# Current Page Components");
  lines.push("");
  lines.push(`**Page URL:** ${domSummary.pageUrl}`);
  lines.push(`**Page Title:** ${domSummary.pageTitle}`);
  lines.push(`**Total Elements:** ${classifications.length}`);
  lines.push("");
  lines.push("## Classifications");
  lines.push("");

  // Group by decision type
  const grouped = new Map<ClassificationDecision, PageComponentClassification[]>();
  for (const c of classifications) {
    if (!grouped.has(c.decision)) {
      grouped.set(c.decision, []);
    }
    grouped.get(c.decision)!.push(c);
  }

  // Show reuse decisions first
  const decisionOrder: ClassificationDecision[] = [
    "reuse-existing",
    "reuse-with-variant",
    "split-refactor",
    "create-new",
    "page-specific",
  ];

  for (const decision of decisionOrder) {
    const decisionClassifications = grouped.get(decision);
    if (!decisionClassifications || decisionClassifications.length === 0) continue;

    lines.push(`### ${formatDecision(decision)} (${decisionClassifications.length})`);
    lines.push("");

    for (const classification of decisionClassifications) {
      lines.push(`#### ${classification.elementId}`);
      lines.push("");
      lines.push(`- **Element Type:** ${classification.elementType}`);
      lines.push(`- **Element Classes:** ${classification.elementClasses.join(", ")}`);
      lines.push(`- **Decision:** ${classification.decision}`);
      lines.push(`- **Target Component:** ${classification.targetComponent}`);
      
      if (classification.variant) {
        lines.push(`- **Variant:** ${classification.variant}`);
      }
      
      lines.push(`- **Rationale:** ${classification.rationale}`);
      lines.push(`- **Confidence:** ${classification.confidence}%`);
      
      if (classification.suggestion) {
        lines.push(`- **Suggestion:** ${classification.suggestion}`);
      }
      
      if (classification.reviewed) {
        lines.push(`- **Reviewed:** ✅`);
      }
      
      if (classification.blocked) {
        lines.push(`- **Blocked:** ⚠️ ${classification.blockingReason}`);
      }
      
      lines.push("");
    }
  }

  // Add summary statistics
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Reuse Existing:** ${grouped.get("reuse-existing")?.length || 0}`);
  lines.push(`- **Reuse with Variant:** ${grouped.get("reuse-with-variant")?.length || 0}`);
  lines.push(`- **Create New:** ${grouped.get("create-new")?.length || 0}`);
  lines.push(`- **Split/Refactor:** ${grouped.get("split-refactor")?.length || 0}`);
  lines.push(`- **Page-Specific:** ${grouped.get("page-specific")?.length || 0}`);

  return lines.join("\n");
}

/**
 * Formats a decision for display
 */
function formatDecision(decision: ClassificationDecision): string {
  const map: Record<ClassificationDecision, string> = {
    "reuse-existing": "🔄 Reuse Existing",
    "reuse-with-variant": "🔄 Reuse with Variant",
    "create-new": "✨ Create New",
    "split-refactor": "🔀 Split/Refactor",
    "page-specific": "📄 Page-Specific",
  };
  return map[decision] || decision;
}
