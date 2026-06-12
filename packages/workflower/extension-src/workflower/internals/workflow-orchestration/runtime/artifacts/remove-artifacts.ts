import { rmdir, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

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

function assertWorkflowArtifactPath(cwd: string, path: string, label: string): void {
  const workflowsRoot = resolve(cwd, ".pi", "workflows");
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
