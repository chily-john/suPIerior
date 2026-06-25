import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { registerWorkflowerCommand } from "@supierior/workflower";
import type { JsonValue, WorkflowerCommandContext } from "@supierior/workflower";

const PASSING_REVIEW_SCORE = 4;
const MAX_IMPLEMENTATION_DOC_REVIEW_ATTEMPTS = 5;
const MAX_STORY_REVIEW_ATTEMPTS = 3;

type GardenStateFile = {
  version: 1;
  values: Record<
    string,
    { value: JsonValue; updatedAt: string; producer?: Record<string, JsonValue> }
  >;
};

type ReviewValue = {
  score?: unknown;
  passes?: unknown;
  summary?: unknown;
  requiredImprovements?: unknown;
};

type ReviewState = {
  review?: ReviewValue;
  score?: number;
  diagnostics: string[];
};

type StoryManifestValue = {
  stories?: unknown;
  currentIndex?: unknown;
};

type StoryValue = {
  id?: unknown;
  title?: unknown;
  path?: unknown;
  dependencies?: unknown;
  status?: unknown;
};

let commandsRegistered = false;

export function registerFeatureWorkflowCommands(): void {
  if (commandsRegistered) return;
  commandsRegistered = true;

  registerWorkflowerCommand({
    name: "feature-workflow-route",
    description: "Routes feature-workflow loop steps from Workflower garden state.",
    handler: async (args, ctx) => ({
      kind: "prompt",
      content: await routeFeatureWorkflow(args.trim(), ctx),
    }),
  });
}

export async function routeFeatureWorkflow(
  route: string,
  ctx: WorkflowerCommandContext,
): Promise<string> {
  switch (route) {
    case "start-implementation-doc-loop":
      return routeToImplementationDocLoop(ctx);
    case "implementation-doc-review":
      return routeImplementationDocReview(ctx);
    case "stories":
      return routeStories(ctx);
    case "story-review":
      return routeStoryReview(ctx);
    default:
      return stopPrompt(`Unknown feature-workflow route: ${route || "<empty>"}.`);
  }
}

async function routeToImplementationDocLoop(ctx: WorkflowerCommandContext): Promise<string> {
  const state = await readGardenState(ctx);
  const featureDocPath = readString(state, "featureDocPath");
  if (!featureDocPath) {
    return stopPrompt(
      "featureDocPath is missing from garden state. The feature doc creation step must save it before implementation planning can start.",
    );
  }

  await writeGardenStateValue(ctx, "implementationDocReviewAttempts", 0);
  return handoffPrompt("implementation-doc-loop", [
    "A feature document is ready.",
    `Feature doc path: ${featureDocPath}`,
    "Hand off to the implementation document review loop now.",
  ]);
}

async function routeImplementationDocReview(ctx: WorkflowerCommandContext): Promise<string> {
  const state = await readGardenState(ctx);
  const reviewState = readReviewState(state, "implementationDocReview");
  const { review, score } = reviewState;
  if (score === undefined) {
    return stopPrompt(invalidReviewPrompt("implementationDocReview", reviewState));
  }

  if (score >= PASSING_REVIEW_SCORE) {
    await writeGardenStateValues(ctx, {
      implementationDocReviewAttempts: 0,
      implementationDocStatus: "accepted",
    });
    return handoffPrompt("implementation-stories-split", [
      `Implementation doc review passed with score ${score}.`,
      "Hand off to split the accepted implementation doc into implementation-ready story files.",
    ]);
  }

  const attempts = readNumber(state, "implementationDocReviewAttempts") + 1;
  await writeGardenStateValues(ctx, {
    implementationDocReviewAttempts: attempts,
    implementationDocStatus: "needs-improvement",
  });

  if (attempts >= MAX_IMPLEMENTATION_DOC_REVIEW_ATTEMPTS) {
    return stopPrompt(
      [
        `Implementation doc review failed with score ${score} after ${attempts} improvement attempts.`,
        reviewSummary(review),
        "Stop here and ask the user to intervene before continuing the workflow.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return handoffPrompt(
    "implementation-doc-loop",
    [
      `Implementation doc review score ${score} is below ${PASSING_REVIEW_SCORE}.`,
      `Improvement attempt ${attempts} of ${MAX_IMPLEMENTATION_DOC_REVIEW_ATTEMPTS} is required.`,
      reviewSummary(review),
      "Hand off to another implementation-doc-loop iteration so the creation skill can improve the same implementation-doc.md in place.",
    ].filter(Boolean),
  );
}

async function routeStories(ctx: WorkflowerCommandContext): Promise<string> {
  const state = await readGardenState(ctx);
  const manifest = readObject<StoryManifestValue>(state, "storyManifest");
  const stories = Array.isArray(manifest?.stories) ? manifest.stories : [];
  const firstStory = stories[0] as StoryValue | undefined;
  if (!firstStory || typeof firstStory.path !== "string") {
    return stopPrompt(
      "storyManifest.stories[0].path is missing from garden state. The story split step must save implementation-ready story files before implementation can start.",
    );
  }

  await writeGardenStateValues(ctx, {
    currentStoryIndex: 0,
    currentStory: normalizeStory(firstStory),
    storyReviewAttempts: 0,
  });

  return handoffPrompt("story-implementation-loop", [
    "Story files are ready.",
    `Starting story 1 of ${stories.length}: ${String(firstStory.title ?? firstStory.id ?? firstStory.path)}`,
    `Story path: ${firstStory.path}`,
    "Hand off to the story implementation loop now.",
  ]);
}

async function routeStoryReview(ctx: WorkflowerCommandContext): Promise<string> {
  const state = await readGardenState(ctx);
  const reviewState = readReviewState(state, "storyReview");
  const { review, score } = reviewState;
  if (score === undefined) {
    return stopPrompt(invalidReviewPrompt("storyReview", reviewState));
  }

  const manifest = readObject<StoryManifestValue>(state, "storyManifest");
  const stories = Array.isArray(manifest?.stories) ? (manifest.stories as StoryValue[]) : [];
  const currentIndex = readNumber(state, "currentStoryIndex");

  if (score < PASSING_REVIEW_SCORE) {
    const attempts = readNumber(state, "storyReviewAttempts") + 1;
    await writeGardenStateValue(ctx, "storyReviewAttempts", attempts);

    if (attempts >= MAX_STORY_REVIEW_ATTEMPTS) {
      return stopPrompt(
        [
          `Story implementation review failed with score ${score} after ${attempts} improvement attempts.`,
          reviewSummary(review),
          "Stop here and ask the user to intervene before continuing the workflow.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    return handoffPrompt(
      "story-implementation-loop",
      [
        `Story implementation review score ${score} is below ${PASSING_REVIEW_SCORE}.`,
        `Improvement attempt ${attempts} of ${MAX_STORY_REVIEW_ATTEMPTS} is required for the current story.`,
        reviewSummary(review),
        "Hand off to another story-implementation-loop iteration for the same story.",
      ].filter(Boolean),
    );
  }

  const updatedStories = stories.map((story, index) =>
    index === currentIndex ? { ...story, status: "done" } : story,
  );
  const nextIndex = currentIndex + 1;
  const nextStory = updatedStories[nextIndex];
  if (nextStory && typeof nextStory.path === "string") {
    await writeGardenStateValues(ctx, {
      storyManifest: { stories: updatedStories.map(normalizeStory), currentIndex: nextIndex },
      currentStoryIndex: nextIndex,
      currentStory: normalizeStory(nextStory),
      storyReviewAttempts: 0,
      storyReviewStatus: "accepted",
    });

    return handoffPrompt("story-implementation-loop", [
      `Story ${currentIndex + 1} passed review with score ${score}.`,
      `Starting story ${nextIndex + 1} of ${stories.length}: ${String(nextStory.title ?? nextStory.id ?? nextStory.path)}`,
      `Story path: ${nextStory.path}`,
      "Hand off to the story implementation loop for the next story.",
    ]);
  }

  await writeGardenStateValues(ctx, {
    storyManifest: { stories: updatedStories.map(normalizeStory), currentIndex },
    storyReviewAttempts: 0,
    storyReviewStatus: "accepted",
    featureWorkflowStatus: "implemented",
  });

  return [
    `Story ${currentIndex + 1} passed review with score ${score}.`,
    "All story files in storyManifest have been implemented and reviewed.",
    "Do not call workflower_handoff. Report the feature workflow complete and summarize the implemented stories.",
  ].join("\n");
}

function handoffPrompt(workflowId: string, details: string[]): string {
  return [
    ...details,
    "",
    `Call the workflower_handoff tool with workflowId \"${workflowId}\".`,
    "Do not print a /wf command; assistant text does not execute workflow commands.",
  ].join("\n");
}

function stopPrompt(message: string): string {
  return [
    message,
    "Do not call workflower_handoff.",
    "Explain the problem to the user and wait for their correction.",
  ].join("\n");
}

async function readGardenState(ctx: WorkflowerCommandContext): Promise<GardenStateFile> {
  const path = gardenStatePath(ctx);
  try {
    return JSON.parse(await readFile(path, "utf8")) as GardenStateFile;
  } catch {
    return { version: 1, values: {} };
  }
}

async function writeGardenStateValue(
  ctx: WorkflowerCommandContext,
  key: string,
  value: JsonValue,
): Promise<void> {
  await writeGardenStateValues(ctx, { [key]: value });
}

async function writeGardenStateValues(
  ctx: WorkflowerCommandContext,
  values: Record<string, JsonValue>,
): Promise<void> {
  const state = await readGardenState(ctx);
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(values)) {
    state.values[key] = {
      value,
      updatedAt: now,
      producer: {
        workflowId: ctx.workflowId,
        stepId: ctx.stepId,
        stepIndex: -1,
        gardenName: ctx.gardenName,
        gardenPath: gardenPath(ctx),
        flowerPath: "",
      },
    };
  }

  await mkdir(gardenPath(ctx), { recursive: true });
  await writeFile(gardenStatePath(ctx), `${JSON.stringify(sortState(state), null, 2)}\n`, "utf8");
}

function readString(state: GardenStateFile, key: string): string | undefined {
  const value = state.values[key]?.value;
  return typeof value === "string" ? value : undefined;
}

function readNumber(state: GardenStateFile, key: string): number {
  const value = state.values[key]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readObject<T extends object>(state: GardenStateFile, key: string): T | undefined {
  const value = state.values[key]?.value;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : undefined;
}

function readReviewState(state: GardenStateFile, key: string): ReviewState {
  const review = readObject<ReviewValue>(state, key);
  const flatScoreEntry = state.values[`${key}.score`];
  const flatSummaryEntry = state.values[`${key}.summary`];
  const flatRequiredImprovementsEntry = state.values[`${key}.requiredImprovements`];
  const diagnostics: string[] = [];

  if (review) {
    const score = readReviewScore(review.score);
    if (score !== undefined) return { review, score, diagnostics };
    diagnostics.push(`${key} exists, but ${key}.score is ${describeValue(review.score)}.`);
  } else if (state.values[key]) {
    const baseValue = state.values[key]?.value;
    const score = readReviewScore(baseValue);
    if (score !== undefined) {
      return {
        review: { score, summary: typeof baseValue === "string" ? baseValue : undefined },
        score,
        diagnostics: [
          `${key} contains a parseable score, but it is ${describeValue(baseValue)} instead of an object. The reviewer should save a structured ${key} object next time.`,
        ],
      };
    }
    diagnostics.push(`${key} exists, but it is ${describeValue(baseValue)} instead of an object.`);
  } else {
    diagnostics.push(`${key} is not set.`);
  }

  const flatScore = readReviewScore(flatScoreEntry?.value);
  if (flatScore !== undefined) {
    return {
      review: {
        score: flatScore,
        summary: flatSummaryEntry?.value,
        requiredImprovements: flatRequiredImprovementsEntry?.value,
      },
      score: flatScore,
      diagnostics: [
        ...diagnostics,
        `Recovered score from flat garden state key ${key}.score. The reviewer should save a single ${key} object next time.`,
      ],
    };
  }

  if (flatScoreEntry)
    diagnostics.push(`${key}.score exists, but it is ${describeValue(flatScoreEntry.value)}.`);
  return { review, diagnostics };
}

function readReviewScore(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5)
    return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  const match = /^(?:score\s*[:=]\s*)?([1-5])(?:\s*\/\s*5)?(?:$|\b|\s|—|-)/i.exec(trimmed);
  if (!match) return undefined;

  const score = Number(match[1]);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : undefined;
}

function invalidReviewPrompt(key: string, reviewState: ReviewState): string {
  return [
    `${key}.score is missing or invalid. The reviewer must save a ${key} object with a numeric integer score from 1-5 in garden state.`,
    ...reviewState.diagnostics,
  ].join("\n");
}

function describeValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return "an object";
  return `${typeof value} ${JSON.stringify(value)}`;
}

function reviewSummary(review: ReviewValue | undefined): string {
  if (!review) return "";
  const lines: string[] = [];
  if (typeof review.summary === "string" && review.summary.trim()) {
    lines.push(`Reviewer summary: ${review.summary.trim()}`);
  }
  if (Array.isArray(review.requiredImprovements) && review.requiredImprovements.length) {
    lines.push("Required improvements:");
    for (const item of review.requiredImprovements) lines.push(`- ${String(item)}`);
  }
  return lines.join("\n");
}

function normalizeStory(story: StoryValue): JsonValue {
  return {
    id: typeof story.id === "string" ? story.id : "",
    title: typeof story.title === "string" ? story.title : "",
    path: typeof story.path === "string" ? story.path : "",
    dependencies: Array.isArray(story.dependencies)
      ? story.dependencies.map((dependency) => String(dependency))
      : [],
    status: typeof story.status === "string" ? story.status : "ready",
  };
}

function sortState(state: GardenStateFile): GardenStateFile {
  const sorted: GardenStateFile = { version: 1, values: {} };
  for (const key of Object.keys(state.values).sort()) sorted.values[key] = state.values[key];
  return sorted;
}

function gardenPath(ctx: WorkflowerCommandContext): string {
  return join(ctx.cwd, ".workflower", "workflows", ctx.gardenName);
}

function gardenStatePath(ctx: WorkflowerCommandContext): string {
  return join(gardenPath(ctx), "state.json");
}
