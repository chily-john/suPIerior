import { rmdir, rm, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { resolveWorkflowsRoot } from "@orchestration/runtime/workflower-home";

export async function removeWorkflowWorkdir(cwd: string, workdir: string): Promise<void> {
  assertWorkflowArtifactPath(cwd, workdir, "workflow workdir");
  await rm(resolve(workdir), { recursive: true, force: true });
}

export async function removeEmptyWorkflowGarden(cwd: string, gardenPath: string): Promise<void> {
  assertWorkflowArtifactPath(cwd, gardenPath, "workflow garden");

  try {
    await rmdir(resolve(gardenPath));
  } catch (error) {
    if (isNonEmptyDirectoryError(error) || isMissingFileError(error)) return;
    throw error;
  }
}

export async function removeGardenStateFile(cwd: string, gardenPath: string): Promise<void> {
  assertWorkflowArtifactPath(cwd, gardenPath, "workflow garden state");

  try {
    await unlink(resolve(join(gardenPath, "state.json")));
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
}

export async function removeGardenResumeFile(cwd: string, gardenPath: string): Promise<void> {
  assertWorkflowArtifactPath(cwd, gardenPath, "workflow garden resume metadata");

  try {
    await unlink(resolve(join(gardenPath, "resume.json")));
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
}

function assertWorkflowArtifactPath(cwd: string, path: string, label: string): void {
  const workflowsRoot = resolve(resolveWorkflowsRoot(cwd));
  const target = resolve(path);
  const relativeTarget = relative(workflowsRoot, target);

  if (relativeTarget === "" || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw new Error(`Refusing to delete ${label} outside ${workflowsRoot}: ${path}`);
  }
}

function isNonEmptyDirectoryError(error: unknown): boolean {
  return isErrorWithCode(error, "ENOTEMPTY") || isErrorWithCode(error, "EEXIST");
}

function isMissingFileError(error: unknown): boolean {
  return isErrorWithCode(error, "ENOENT");
}

function isErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}
