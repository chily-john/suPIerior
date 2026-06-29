import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routeXtiviaWorkflow } from "../extension-src/xtivia-workflows/internals/workflow-routing/register-xtivia-workflow-commands";

const timestamp = "2026-06-24T00:00:00.000Z";

describe("XTIVIA workflow routing", () => {
  it("routes captured sources to the migration plan loop", async () => {
    await withGardenState(
      {
        wpMigrationCapturePath: { value: "/tmp/page-capture.md", updatedAt: timestamp },
        wpMigrationPlanReviewAttempts: { value: 3, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("start-migration-plan-loop", ctx);

        expect(prompt).toContain("wp-migration-plan-loop");
        expect(prompt).toContain("workflower_handoff");
        await expect(readFile(statePath, "utf8")).resolves.toContain('"wpMigrationPlanReviewAttempts"');
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationPlanReviewAttempts.value).toBe(0);
      },
    );
  });

  it("routes accepted migration plans to story splitting", async () => {
    await withGardenState(
      {
        wpMigrationPlanReview: {
          value: {
            score: 4,
            passes: true,
            summary: "Plan is ready for story splitting.",
            requiredImprovements: [],
          },
          updatedAt: timestamp,
        },
        wpMigrationPlanReviewAttempts: { value: 2, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("migration-plan-review", ctx);

        expect(prompt).toContain("wp-migration-stories-split");
        expect(prompt).toContain("workflower_handoff");
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationPlanReviewAttempts.value).toBe(0);
        expect(state.values.wpMigrationPlanStatus.value).toBe("accepted");
      },
    );
  });

  it("routes rejected migration plans back to the planning loop", async () => {
    await withGardenState(
      {
        wpMigrationPlanReview: {
          value: {
            score: 2,
            passes: false,
            summary: "Plan does not use the capture artifacts.",
            requiredImprovements: ["Reference the desktop and mobile capture artifacts."],
          },
          updatedAt: timestamp,
        },
        wpMigrationPlanReviewAttempts: { value: 0, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("migration-plan-review", ctx);

        expect(prompt).toContain("wp-migration-plan-loop");
        expect(prompt).toContain("workflower_handoff");
        expect(prompt).toContain("Reference the desktop and mobile capture artifacts.");
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationPlanReviewAttempts.value).toBe(1);
        expect(state.values.wpMigrationPlanStatus.value).toBe("needs-improvement");
      },
    );
  });

  it("starts the first migration story from manifest", async () => {
    await withGardenState(
      {
        wpMigrationStoryManifest: {
          value: {
            stories: [
              {
                id: "001",
                title: "Implement hero section",
                path: "/tmp/stories/001-implement-hero-section.md",
                dependencies: [],
                status: "ready",
              },
            ],
          },
          updatedAt: timestamp,
        },
        wpMigrationStoryReviewAttempts: { value: 3, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("migration-stories", ctx);

        expect(prompt).toContain("wp-migration-story-implementation-loop");
        expect(prompt).toContain("workflower_handoff");
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationCurrentStoryIndex.value).toBe(0);
        expect(state.values.wpMigrationCurrentStory.value).toEqual({
          id: "001",
          title: "Implement hero section",
          path: "/tmp/stories/001-implement-hero-section.md",
          dependencies: [],
          status: "ready",
        });
        expect(state.values.wpMigrationStoryReviewAttempts.value).toBe(0);
      },
    );
  });

  it("loops the same migration story when review fails", async () => {
    await withGardenState(
      {
        wpMigrationStoryManifest: {
          value: {
            stories: [
              {
                id: "001",
                title: "Implement hero section",
                path: "/tmp/stories/001-implement-hero-section.md",
                dependencies: [],
                status: "ready",
              },
            ],
          },
          updatedAt: timestamp,
        },
        wpMigrationCurrentStoryIndex: { value: 0, updatedAt: timestamp },
        wpMigrationCurrentStory: {
          value: {
            id: "001",
            title: "Implement hero section",
            path: "/tmp/stories/001-implement-hero-section.md",
            dependencies: [],
            status: "ready",
          },
          updatedAt: timestamp,
        },
        wpMigrationStoryReview: {
          value: {
            score: 3,
            passes: false,
            summary: "Hero needs mobile parity fixes.",
            requiredImprovements: ["Fix the mobile hero spacing."],
          },
          updatedAt: timestamp,
        },
        wpMigrationStoryReviewAttempts: { value: 0, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("migration-story-review", ctx);

        expect(prompt).toContain("wp-migration-story-implementation-loop");
        expect(prompt).toContain("workflower_handoff");
        expect(prompt).toContain("Fix the mobile hero spacing.");
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationCurrentStoryIndex.value).toBe(0);
        expect(state.values.wpMigrationCurrentStory.value.status).toBe("ready");
        expect(state.values.wpMigrationStoryReviewAttempts.value).toBe(1);
        expect(state.values.wpMigrationStoryReviewStatus.value).toBe("needs-improvement");
      },
    );
  });

  it("hands off to finalization after the last story passes", async () => {
    await withGardenState(
      {
        wpMigrationStoryManifest: {
          value: {
            stories: [
              {
                id: "001",
                title: "Implement hero section",
                path: "/tmp/stories/001-implement-hero-section.md",
                dependencies: [],
                status: "ready",
              },
            ],
          },
          updatedAt: timestamp,
        },
        wpMigrationCurrentStoryIndex: { value: 0, updatedAt: timestamp },
        wpMigrationCurrentStory: {
          value: {
            id: "001",
            title: "Implement hero section",
            path: "/tmp/stories/001-implement-hero-section.md",
            dependencies: [],
            status: "ready",
          },
          updatedAt: timestamp,
        },
        wpMigrationStoryReview: {
          value: {
            score: 4,
            passes: true,
            summary: "Story meets the visual parity bar.",
            requiredImprovements: [],
          },
          updatedAt: timestamp,
        },
        wpMigrationStoryReviewAttempts: { value: 2, updatedAt: timestamp },
      },
      async ({ ctx, statePath }) => {
        const prompt = await routeXtiviaWorkflow("migration-story-review", ctx);

        expect(prompt).toContain("wp-migration-finalize");
        expect(prompt).toContain("workflower_handoff");
        const state = JSON.parse(await readFile(statePath, "utf8"));
        expect(state.values.wpMigrationStoryManifest.value.stories[0].status).toBe("done");
        expect(state.values.wpMigrationCurrentStory.value.status).toBe("done");
        expect(state.values.wpMigrationStoryReviewAttempts.value).toBe(0);
        expect(state.values.wpMigrationStoryReviewStatus.value).toBe("accepted");
      },
    );
  });
});

async function withGardenState(
  values: Record<string, unknown>,
  assertion: (args: { ctx: RoutingContext; statePath: string }) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "xtivia-workflow-"));
  const gardenPath = join(dir, ".workflower", "workflows", "migration-garden");
  const statePath = join(gardenPath, "state.json");

  try {
    await mkdir(gardenPath, { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify({ version: 1, values }, null, 2)}\n`,
      "utf8",
    );

    await assertion({
      ctx: {
        workflowId: "wp-migration-plan-loop",
        workflowName: "migration-garden",
        stepId: "route-migration-plan-review",
        gardenName: "migration-garden",
        cwd: dir,
      },
      statePath,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type RoutingContext = Parameters<typeof routeXtiviaWorkflow>[1];
