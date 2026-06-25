import { mkdir, writeFile } from "node:fs/promises";
import { join, parse, relative, resolve } from "node:path";

export const WORKFLOWER_HOME_DIR = ".workflower";
export const WORKFLOWER_WORKFLOWS_DIR = "workflows";

const WORKFLOWER_GITIGNORE = "*\n";

export function resolveWorkflowerHome(cwd: string): string {
  return join(cwd, WORKFLOWER_HOME_DIR);
}

export function resolveWorkflowsRoot(cwd: string): string {
  return join(resolveWorkflowerHome(cwd), WORKFLOWER_WORKFLOWS_DIR);
}

export function resolveActiveWorkflowStatesRoot(cwd: string): string {
  return join(resolveWorkflowerHome(cwd), "tmp", "workflows", "active");
}

export async function ensureWorkflowerHome(cwd: string): Promise<void> {
  await writeWorkflowerGitignore(resolveWorkflowerHome(cwd));
}

export async function ensureWorkflowerHomeForPath(path: string): Promise<void> {
  const home = findWorkflowerHomeInPath(path);
  if (!home) return;

  await writeWorkflowerGitignore(home);
}

function findWorkflowerHomeInPath(path: string): string | undefined {
  const absolutePath = resolve(path);
  const relativePath = relative(parse(absolutePath).root, absolutePath);
  const segments = relativePath.split(/[\\/]+/);
  const homeIndex = segments.indexOf(WORKFLOWER_HOME_DIR);
  if (homeIndex === -1) return undefined;

  return resolve(parse(absolutePath).root, ...segments.slice(0, homeIndex + 1));
}

async function writeWorkflowerGitignore(home: string): Promise<void> {
  await mkdir(home, { recursive: true });

  try {
    await writeFile(join(home, ".gitignore"), WORKFLOWER_GITIGNORE, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (isExistingFileError(error)) return;
    throw error;
  }
}

function isExistingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
