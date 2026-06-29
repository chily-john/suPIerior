import { describe, it, expect } from "vitest";
import { generateEnhancedImplementationDoc } from "../../extension-src/xtivia-workflows/internals/skills/implementation-doc-generation/implementation-doc-generation";

describe("Implementation Doc Generation Enhancement", () => {
  it("should include atomic elements reference in implementation doc", () => {
    const atomicElementsCatalog = "# Atomic Elements Catalog\n\n## Next.js Built-ins\n\n### Link";
    const globalComponentInventory = "# Global Component Inventory\n\n### Button";
    const pageComponentDecisions =
      "# Current Page Components\n\n### hero-section\n- **Decision:** create-new";
    const existingDoc = "# Implementation Plan";

    const result = generateEnhancedImplementationDoc({
      existingDoc,
      atomicElementsCatalog,
      globalComponentInventory,
      pageComponentDecisions,
      projectPath: "/test/project",
    });

    expect(result.doc).toMatch(/Atomic Elements/);
  });
});
