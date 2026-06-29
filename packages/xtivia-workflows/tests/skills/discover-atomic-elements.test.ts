import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  discoverAtomicElements,
  generateAtomicElementsCatalog,
} from "../../extension-src/xtivia-workflows/internals/skills/discover-atomic-elements/discover-atomic-elements";

describe("discover-atomic-elements", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = (await mkdir("/tmp/xtivia-test-" + Date.now(), {
      recursive: true,
    }))!;

    // Create a mock Next.js project structure
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

    // Create components directory with atomic elements
    await mkdir(join(tempDir, "components"), { recursive: true });
    await writeFile(
      join(tempDir, "components", "Link.tsx"),
      `import Link from 'next/link';
export default Link;`,
    );
    await writeFile(
      join(tempDir, "components", "Image.tsx"),
      `import Image from 'next/image';
export default Image;`,
    );
    await writeFile(
      join(tempDir, "components", "Button.tsx"),
      `export default function Button() { return <button>Click</button>; }`,
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should discover Next.js Link and Image in a standard Next.js project", async () => {
    const { catalog } = await discoverAtomicElements(tempDir);

    // Check that Next.js is detected
    expect(catalog.isNextJs).toBe(true);

    // Check that Next.js built-ins are discovered
    const builtinNames = catalog.nextBuiltins.map((e) => e.name);
    expect(builtinNames).toContain("Link");
    expect(builtinNames).toContain("Image");

    // Check that no warnings about Next.js not being detected
    expect(catalog.warnings).not.toContain("Next.js not detected");
  });

  it("should handle case where Next.js is not available", async () => {
    // Create a project without Next.js
    const nonNextDir = (await mkdir("/tmp/xtivia-test-non-next-" + Date.now(), {
      recursive: true,
    }))!;

    await writeFile(
      join(nonNextDir, "package.json"),
      JSON.stringify({
        name: "test-non-next-project",
        dependencies: {
          react: "^18.0.0",
        },
      }),
    );

    const { catalog } = await discoverAtomicElements(nonNextDir);

    // Check that Next.js is not detected
    expect(catalog.isNextJs).toBe(false);

    // Check that warnings are present
    expect(catalog.warnings).toContain("Next.js not detected in project dependencies");

    // Check that raw HTML fallback is present
    const rawHtmlNames = catalog.rawHtml.map((e) => e.name);
    expect(rawHtmlNames).toContain("a");
    expect(rawHtmlNames).toContain("img");

    // Cleanup
    await rm(nonNextDir, { recursive: true, force: true });
  });

  it("should discover design system components by convention", async () => {
    // Add design system components
    await mkdir(join(tempDir, "components"), { recursive: true });
    await writeFile(
      join(tempDir, "components", "Button.tsx"),
      `export default function Button() { return <button>Click</button>; }`,
    );
    await writeFile(
      join(tempDir, "components", "Card.tsx"),
      `export default function Card() { return <div>Card</div>; }`,
    );
    await writeFile(
      join(tempDir, "components", "Typography.tsx"),
      `export default function Typography() { return <p>Text</p>; }`,
    );

    const { catalog } = await discoverAtomicElements(tempDir);

    // Check that design system components are discovered
    const designSystemNames = catalog.designSystem.map((e) => e.name);
    expect(designSystemNames).toContain("Button");
    expect(designSystemNames).toContain("Card");
    expect(designSystemNames).toContain("Typography");
  });

  it("should write catalog to .workflower/components/atomic-elements.md", async () => {
    const { outputPath, catalog } = await discoverAtomicElements(tempDir);

    // Check that the output path is correct
    expect(outputPath).toBe(join(tempDir, ".workflower", "components", "atomic-elements.md"));

    // Check that the file was written
    const content = await readFile(outputPath, "utf-8");
    expect(content).toContain("# Atomic Elements Catalog");
    expect(content).toContain("## Next.js Built-ins");
    expect(content).toContain("### Link");
    expect(content).toContain("### Image");
    expect(content).toContain("**Import Path:** next/link");
    expect(content).toContain("**Import Path:** next/image");
  });

  it("should generate catalog markdown with correct format", async () => {
    const catalog = {
      nextBuiltins: [
        {
          name: "Link",
          importPath: "next/link",
          purpose: "Navigation",
          usage: "<Link>",
          type: "next-builtin" as const,
        },
      ],
      designSystem: [],
      rawHtml: [],
      isNextJs: true,
      warnings: [],
    };

    const markdown = generateAtomicElementsCatalog(catalog);

    expect(markdown).toContain("# Atomic Elements Catalog");
    expect(markdown).toContain("## Next.js Built-ins");
    expect(markdown).toContain("### Link");
    expect(markdown).toContain("- **Import Path:** next/link");
    expect(markdown).toContain("- **Purpose:** Navigation");
    expect(markdown).toContain("- **Usage:** <Link>");
  });
});
