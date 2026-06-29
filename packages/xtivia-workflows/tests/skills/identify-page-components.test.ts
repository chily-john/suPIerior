import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { identifyPageComponents, classifyElement, PageComponentClassification, GlobalComponent, AtomicElement } from "../../extension-src/xtivia-workflows/internals/skills/identify-page-components/identify-page-components";

describe("identify-page-components", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = (await mkdir("/tmp/xtivia-test-identify-" + Date.now(), {
      recursive: true,
    }))!;

    // Create mock project structure
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-next-project",
        dependencies: {
          next: "^14.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        },
      }),
    );

    // Create .workflower directories
    await mkdir(join(tempDir, ".workflower", "components"), { recursive: true });
    await mkdir(join(tempDir, ".workflower", "capture"), { recursive: true });

    // Create mock atomic elements catalog
    await writeFile(
      join(tempDir, ".workflower", "components", "atomic-elements.md"),
      `# Atomic Elements Catalog

## Next.js Built-ins

### Link
- **Import Path:** next/link
- **Purpose:** Navigation
- **Usage:** <Link href="/about">About</Link>

### Image
- **Import Path:** next/image
- **Purpose:** Image display
- **Usage:** <Image src="/img.jpg" alt="Image" width={500} height={300} />

## Design System Components

### Button
- **Import Path:** components/Button.tsx
- **Purpose:** Primary button component
- **Usage:** <Button />

### Card
- **Import Path:** components/Card.tsx
- **Purpose:** Card component for content grouping
- **Usage:** <Card />

### Typography
- **Import Path:** components/Typography.tsx
- **Purpose:** Typography component
- **Usage:** <Typography />
`,
      "utf-8",
    );

    // Create mock global component inventory
    await writeFile(
      join(tempDir, ".workflower", "components", "global-components.md"),
      `# Global Component Inventory

Last updated: 2024-01-01T00:00:00.000Z

Total components: 3

## Components

### Button

- **Purpose:** Primary button component for the design system
- **Source File Path:** /components/Button.tsx
- **Variants:** primary, secondary, danger
- **Atomic Elements Used:** button, span
- **Usage Examples:**
  - "<Button />"
  - "<Button variant=\"primary\" />"

### Card

- **Purpose:** Card component for content grouping
- **Source File Path:** /components/Card.tsx
- **Variants:** default, bordered, shadow
- **Atomic Elements Used:** div
- **Usage Examples:**
  - "<Card />"
  - "<Card variant=\"bordered\" />"

### Typography

- **Purpose:** Typography component
- **Source File Path:** /components/Typography.tsx
- **Variants:** h1, h2, h3, body
- **Atomic Elements Used:** p, span, h1, h2, h3
- **Usage Examples:**
  - "<Typography variant=\"h1\" />"
  - "<Typography variant=\"body\" />"
`,
      "utf-8",
    );

    // Create mock DOM summary from capture
    await writeFile(
      join(tempDir, ".workflower", "capture", "dom-summary.json"),
      JSON.stringify({
        pageUrl: "http://localhost:3000/test-page",
        pageTitle: "Test Page",
        elements: [
          {
            id: "card-1",
            type: "div",
            classes: ["card"],
            textContent: "Feature Card",
            children: [],
          },
        ],
      }, null, 2),
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // Red Phase test from story
  it("should classify a Card element as reuse of existing global Card component", async () => {
    // Create a test DOM element that looks like a Card
    const cardElement = {
      id: "card-1",
      type: "div",
      classes: ["card"],
      textContent: "Test Card",
      children: [],
    };

    // Mock the global components inventory
    const globalComponents = [
      { name: "Card", purpose: "Card component for content grouping", variants: ["default", "bordered", "shadow"], atomicElements: ["div"], sourceFilePath: "/components/Card.tsx", usageExamples: ["<Card />"] },
      { name: "Button", purpose: "Primary button component", variants: ["primary", "secondary", "danger"], atomicElements: ["button", "span"], sourceFilePath: "/components/Button.tsx", usageExamples: ["<Button />"] },
    ];

    const atomicElements: AtomicElement[] = [
      { name: "div", importPath: "raw-html", purpose: "Container", usage: "<div>...</div>", type: "raw-html" },
      { name: "button", importPath: "raw-html", purpose: "Button", usage: "<button>...</button>", type: "raw-html" },
    ];

    const classification = classifyElement(cardElement, globalComponents, atomicElements);
    
    expect(classification.decision).toBe('reuse-existing');
    expect(classification.targetComponent).toBe('Card');
    expect(classification.rationale).toContain('matches existing global Card component');
  });

  it("should write classified components to .workflower/components/current-page-components.md", async () => {
    const outputPath = join(tempDir, ".workflower", "components", "current-page-components.md");
    
    const result = await identifyPageComponents(tempDir);
    
    // Check that the output file was created
    const content = await readFile(outputPath, "utf-8");
    expect(content).toContain("# Current Page Components");
    expect(content).toContain("## Classifications");
    expect(content).toContain("### card-1");
    expect(content).toContain("- **Decision:** reuse-existing");
    expect(content).toContain("- **Target Component:** Card");
  });

  it("should enforce rule: do not create duplicate page-local cards when shared component with variants would work", async () => {
    // Create two card-like elements on the page
    const cardElement1 = {
      id: "card-1",
      type: "div",
      classes: ["card"],
      textContent: "Card 1",
      children: [],
    };

    const cardElement2 = {
      id: "card-2",
      type: "div",
      classes: ["card"],
      textContent: "Card 2",
      children: [],
    };

    const globalComponents = [
      { name: "Card", purpose: "Card component", variants: ["default", "bordered", "shadow"], atomicElements: ["div"], sourceFilePath: "/components/Card.tsx", usageExamples: ["<Card />"] },
    ];

    const atomicElements: any[] = [];

    const classification1 = classifyElement(cardElement1, globalComponents, atomicElements);
    const classification2 = classifyElement(cardElement2, globalComponents, atomicElements);

    // Both should be classified as reuse-existing with Card component
    expect(classification1.decision).toBe('reuse-existing');
    expect(classification1.targetComponent).toBe('Card');
    
    expect(classification2.decision).toBe('reuse-existing');
    expect(classification2.targetComponent).toBe('Card');
  });
});
