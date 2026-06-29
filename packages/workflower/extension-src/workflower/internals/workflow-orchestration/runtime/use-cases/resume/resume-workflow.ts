import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { findActiveWorkflowInGarden } from "@orchestration/runtime/active-state/find-active-workflow-in-garden";
import { writeActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { readFlowerIndex } from "@orchestration/runtime/artifacts/flower-index-store";
import { isSafeWorkflowName as isSafeGardenName } from "@orchestration/runtime/artifacts/workflow-name-validation";
import { resolveGardenResumePath } from "@orchestration/runtime/resume/resume-state-paths";
import { persistResumeMetadataForActiveState } from "@orchestration/runtime/resume/resume-state-store";
import { validateGardenResumeState } from "@orchestration/runtime/resume/resume-state-validation";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { resolveWorkflowsRoot } from "@orchestration/runtime/workflower-home";
import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import type { CurrentSessionPromptSender, WorkflowCommandContext } from "../start/start.types";
import { parseResumeArgs } from "./parse-resume-args";

export async function resumeWorkflow(
  args: string,
  ctx: WorkflowCommandContext,
  currentSession: CurrentSessionPromptSender,
): Promise<void> {
  const parsedArgs = parseResumeArgs(args);
  if (!parsedArgs.ok) {
    ctx.ui.notify(parsedArgs.message, "error");
    return;
  }

  const { gardenName } = parsedArgs;
  if (!isSafeGardenName(gardenName)) {
    ctx.ui.notify("Invalid garden-name: garden-name must be a safe path segment.", "error");
    return;
  }

  const sessionId = ctx.sessionManager.getSessionId();
  const activeStatePath = resolveActiveStatePath(ctx.cwd, sessionId);
  if (await pathExists(activeStatePath)) {
    ctx.ui.notify(
      `Refusing to resume garden ${gardenName}; this session already has an active workflow.`,
      "error",
    );
    return;
  }

  const activeOwner = await findActiveWorkflowInGarden(ctx.cwd, gardenName, {
    excludeSessionId: sessionId,
  });
  if (activeOwner) {
    ctx.ui.notify(
      `Refusing to resume garden ${gardenName}; it is already active in session ${activeOwner.sessionId}.`,
      "error",
    );
    return;
  }

  const gardenPath = join(resolveWorkflowsRoot(ctx.cwd), gardenName);
  const resumePath = resolveGardenResumePath(gardenPath);
  const resumeSource = await readFile(resumePath, "utf8").catch((error) => {
    if (isMissingFileError(error)) {
      ctx.ui.notify(
        `Cannot resume garden ${gardenName}; resume metadata is missing. Older gardens without durable metadata cannot be resumed.`,
        "error",
      );
      return undefined;
    }

    ctx.ui.notify(
      `Failed to read resume metadata for ${gardenName}: ${formatError(error)}`,
      "error",
    );
    return undefined;
  });
  if (!resumeSource) return;

  let parsedResume: unknown;
  try {
    parsedResume = JSON.parse(resumeSource);
  } catch {
    ctx.ui.notify(`Cannot resume garden ${gardenName}; resume metadata is malformed.`, "error");
    return;
  }

  const validation = validateGardenResumeState(parsedResume, {
    gardenName,
    expectedGardenPath: gardenPath,
  });
  if (!validation.ok) {
    ctx.ui.notify(validation.message, "error");
    return;
  }
  const resume = validation.state;

  const workflow = findWorkflow(resume.workflowId);
  if (!workflow) {
    ctx.ui.notify(
      `Cannot resume garden ${gardenName}; workflow id ${resume.workflowId} is not registered.`,
      "error",
    );
    return;
  }

  const stepIndexResult = parsedArgs.stepOverride
    ? resolveStepOverride(parsedArgs.stepOverride, workflow, gardenName)
    : validateCurrentStepIndex(resume.currentStepIndex, workflow, gardenName);
  if (!stepIndexResult.ok) {
    ctx.ui.notify(stepIndexResult.message, "error");
    return;
  }
  const currentStepIndex = stepIndexResult.stepIndex;

  const flowerIndex = await readFlowerIndex(resume.activeFlowerPath).catch((error) => {
    ctx.ui.notify(
      `Failed to read active flower index for ${gardenName}: ${formatError(error)}`,
      "error",
    );
    return undefined;
  });
  if (!flowerIndex) {
    ctx.ui.notify(`Cannot resume garden ${gardenName}; active flower index is missing.`, "error");
    return;
  }
  if (flowerIndex.workflowId !== resume.workflowId) {
    ctx.ui.notify(
      `Cannot resume garden ${gardenName}; active flower belongs to workflow ${flowerIndex.workflowId}, not ${resume.workflowId}.`,
      "error",
    );
    return;
  }

  const state: ActiveWorkflowState = {
    sessionId,
    sessionFile: ctx.sessionManager.getSessionFile(),
    id: resume.workflowId,
    name: resume.gardenName,
    gardenName: resume.gardenName,
    gardenPath: resume.gardenPath,
    activeFlowerName: resume.activeFlowerName,
    activeFlowerPath: resume.activeFlowerPath,
    workdir: resume.activeFlowerPath,
    currentStepIndex,
    ...(resume.queuedWorkflowIds?.length ? { queuedWorkflowIds: resume.queuedWorkflowIds } : {}),
    contextBoundaryEntryId: resume.contextBoundaryEntryId,
    runtimeDefaults: resume.runtimeDefaults,
    startedAt: resume.startedAt,
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeActiveWorkflowState(activeStatePath, state);
  } catch (error) {
    ctx.ui.notify(`Failed to restore active workflow state: ${formatError(error)}`, "error");
    return;
  }

  try {
    await persistResumeMetadataForActiveState(state);
  } catch (error) {
    ctx.ui.notify(`Failed to update resume metadata: ${formatError(error)}`, "error");
    return;
  }

  const sent = await startWorkflowStep(workflow, state, state.currentStepIndex, currentSession, {
    cwd: ctx.cwd,
    promptDisplayKind: "workflow",
    ui: ctx.ui,
  }).catch(() => false);
  if (sent) {
    const step = workflow.steps[state.currentStepIndex];
    ctx.ui.notify(
      `Resumed workflow ${workflow.id} in garden ${state.gardenName ?? state.name} at step ${
        state.currentStepIndex
      } (${step.id}).`,
      "info",
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

type StepIndexResult = { ok: true; stepIndex: number } | { ok: false; message: string };

function validateCurrentStepIndex(
  stepIndex: number,
  workflow: WorkflowDefinition,
  gardenName: string,
): StepIndexResult {
  if (stepIndex < 0 || stepIndex >= workflow.steps.length) {
    return {
      ok: false,
      message: `Cannot resume garden ${gardenName}; current step index ${stepIndex} is not valid for workflow ${workflow.id}.`,
    };
  }
  return { ok: true, stepIndex };
}

function resolveStepOverride(
  stepOverride: string,
  workflow: WorkflowDefinition,
  gardenName: string,
): StepIndexResult {
  if (/^-?\d+$/.test(stepOverride)) {
    const stepIndex = Number.parseInt(stepOverride, 10);
    if (stepIndex < 0 || stepIndex >= workflow.steps.length) {
      return {
        ok: false,
        message: `Cannot resume garden ${gardenName}; step index ${stepIndex} is not valid for workflow ${workflow.id}.`,
      };
    }
    return { ok: true, stepIndex };
  }

  const matchingIndexes = workflow.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.id === stepOverride)
    .map(({ index }) => index);

  if (matchingIndexes.length === 1) return { ok: true, stepIndex: matchingIndexes[0] };

  if (matchingIndexes.length > 1) {
    return {
      ok: false,
      message: `Cannot resume garden ${gardenName}; step id ${stepOverride} is ambiguous for workflow ${workflow.id}.`,
    };
  }

  return {
    ok: false,
    message: `Cannot resume garden ${gardenName}; step id ${stepOverride} is not valid for workflow ${workflow.id}.`,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
