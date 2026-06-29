import { isAbsolute, relative, resolve } from "node:path";
import type { WorkflowRuntimeDefaults } from "@package-api/workflow-definition.types";
import type { GardenResumeState } from "./resume-state.types";

export type ResumableGardenResumeState = GardenResumeState & {
  status: "active" | "paused";
};

export type GardenResumeStateValidationResult =
  | { ok: true; state: ResumableGardenResumeState }
  | { ok: false; message: string };

export function validateGardenResumeState(input: unknown, options: {
  gardenName: string;
  expectedGardenPath: string;
}): GardenResumeStateValidationResult {
  if (!isRecord(input)) {
    return unsupportedShape(options.gardenName);
  }

  if (input.version !== 1) {
    return {
      ok: false,
      message: `Cannot resume garden ${options.gardenName}; resume metadata version is unsupported.`,
    };
  }

  if (input.status === "completed") {
    return {
      ok: false,
      message: `Cannot resume garden ${options.gardenName}; resume metadata is completed and cannot be resumed.`,
    };
  }
  if (input.status !== "active" && input.status !== "paused") {
    return unsupportedShape(options.gardenName);
  }

  const requiredStringKeys = [
    "sessionId",
    "workflowId",
    "gardenName",
    "gardenPath",
    "activeFlowerName",
    "activeFlowerPath",
    "startedAt",
    "updatedAt",
  ];
  if (requiredStringKeys.some((key) => typeof input[key] !== "string")) {
    return unsupportedShape(options.gardenName);
  }
  if (input.sessionFile !== undefined && typeof input.sessionFile !== "string") {
    return unsupportedShape(options.gardenName);
  }
  if (!Number.isInteger(input.currentStepIndex)) {
    return unsupportedShape(options.gardenName);
  }
  if (
    input.queuedWorkflowIds !== undefined &&
    (!Array.isArray(input.queuedWorkflowIds) ||
      input.queuedWorkflowIds.some((workflowId) => typeof workflowId !== "string"))
  ) {
    return unsupportedShape(options.gardenName);
  }
  if (
    input.contextBoundaryEntryId !== undefined &&
    input.contextBoundaryEntryId !== null &&
    typeof input.contextBoundaryEntryId !== "string"
  ) {
    return unsupportedShape(options.gardenName);
  }
  if (
    input.runtimeDefaults !== undefined &&
    (!isRecord(input.runtimeDefaults) || Array.isArray(input.runtimeDefaults))
  ) {
    return unsupportedShape(options.gardenName);
  }

  const gardenPath = input.gardenPath as string;
  if (!samePath(gardenPath, options.expectedGardenPath)) {
    return {
      ok: false,
      message: `Cannot resume garden ${options.gardenName}; resume metadata points at a different garden path.`,
    };
  }

  const activeFlowerPath = input.activeFlowerPath as string;
  if (!isPathInside(gardenPath, activeFlowerPath)) {
    return {
      ok: false,
      message: `Cannot resume garden ${options.gardenName}; active flower path escapes the garden.`,
    };
  }

  return {
    ok: true,
    state: {
      version: 1,
      status: input.status as "active" | "paused",
      sessionId: input.sessionId as string,
      ...(input.sessionFile !== undefined ? { sessionFile: input.sessionFile as string } : {}),
      workflowId: input.workflowId as string,
      gardenName: input.gardenName as string,
      gardenPath,
      activeFlowerName: input.activeFlowerName as string,
      activeFlowerPath,
      currentStepIndex: input.currentStepIndex as number,
      ...(input.queuedWorkflowIds !== undefined
        ? { queuedWorkflowIds: input.queuedWorkflowIds as string[] }
        : {}),
      ...(input.contextBoundaryEntryId !== undefined
        ? { contextBoundaryEntryId: input.contextBoundaryEntryId as string | null }
        : {}),
      ...(input.runtimeDefaults !== undefined
        ? { runtimeDefaults: input.runtimeDefaults as WorkflowRuntimeDefaults }
        : {}),
      startedAt: input.startedAt as string,
      updatedAt: input.updatedAt as string,
    },
  };
}

function unsupportedShape(gardenName: string): GardenResumeStateValidationResult {
  return {
    ok: false,
    message: `Cannot resume garden ${gardenName}; resume metadata shape is unsupported.`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function samePath(left: string, right: string): boolean {
  return normalizeForCompare(left) === normalizeForCompare(right);
}

function isPathInside(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function normalizeForCompare(path: string): string {
  const resolvedPath = resolve(path);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}
