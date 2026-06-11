import { rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export async function removeWorkflowWorkdir(cwd: string, workdir: string): Promise<void> {
  const workflowsRoot = resolve(cwd, ".pi", "workflows");
  const target = resolve(workdir);
  const relativeTarget = relative(workflowsRoot, target);

  if (relativeTarget === "" || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw new Error(`Refusing to delete workflow workdir outside ${workflowsRoot}: ${workdir}`);
  }

  await rm(target, { recursive: true, force: true });
}
