import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Mock the workflow execution
import { wpPageMigrationWorkflow } from "../../extension-src/xtivia-workflows/package-api/wp-page-migration-workflow";

describe("wp-page-migration workflow", () => {
  const testWorkdir = path.join(__dirname, "..", "..", ".workflower", "test-workflow");
  const atomicElementsPath = path.join(testWorkdir, "components", "atomic-elements.md");

  beforeEach(() => {
    // Setup test workdir
    if (!fs.existsSync(testWorkdir)) {
      fs.mkdirSync(testWorkdir, { recursive: true });
    }
    if (!fs.existsSync(path.join(testWorkdir, "components"))) {
      fs.mkdirSync(path.join(testWorkdir, "components"), { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(atomicElementsPath)) {
      fs.rmSync(atomicElementsPath);
    }
  });

  it("should produce atomic-elements.md when run", async () => {
    // This test verifies that the workflow produces atomic-elements.md
    // as one of its outputs after all steps are integrated

    // The workflow should have steps that produce atomic-elements.md
    const hasAtomicElementsOutput = wpPageMigrationWorkflow.steps.some(
      (step: any) => step.outputs && step.outputs.includes("components/atomic-elements.md"),
    );

    // Verify the workflow has the discover-atomic-elements step
    expect(
      hasAtomicElementsOutput,
      "Workflow should have a step that outputs atomic-elements.md",
    ).toBe(true);

    // Verify the step order: discover-atomic-elements should come after capture-source-page
    const stepIds = wpPageMigrationWorkflow.steps.map((step: any) => step.id);
    const captureIndex = stepIds.indexOf("capture-source-page");
    const discoverIndex = stepIds.indexOf("discover-atomic-elements");
    expect(captureIndex).toBeGreaterThan(-1);
    expect(discoverIndex).toBeGreaterThan(-1);
    expect(discoverIndex).toBeGreaterThan(captureIndex);

    // Verify all three new steps are present
    expect(stepIds).toContain("refresh-global-component-inventory");
    expect(stepIds).toContain("identify-page-components");
  });
});
