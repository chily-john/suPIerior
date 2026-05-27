import { access, mkdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";

export interface ArtifactPaths {
  piRoot: string;
  featuresRoot: string;
  featureDir: string;
  draftPath: string;
  featurePath: string;
  planPath: string;
}

export async function findNearestPiRoot(startCwd: string): Promise<string | undefined> {
  let current = resolve(startCwd);
  const homePiRoot = await canonicalPath(join(resolve(homedir()), ".pi"));
  while (true) {
    const candidate = join(current, ".pi");
    const canonicalCandidate = await canonicalPath(candidate);
    if (canonicalCandidate && canonicalCandidate !== homePiRoot) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

async function canonicalPath(path: string): Promise<string | undefined> {
  try {
    return await realpath(path);
  } catch {
    return undefined;
  }
}

export async function resolveArtifactPaths(cwd: string, slug: string): Promise<ArtifactPaths> {
  const piRoot = (await findNearestPiRoot(cwd)) ?? join(resolve(cwd), ".pi");
  const featuresRoot = join(piRoot, "features");
  const featureDir = join(featuresRoot, slug);
  return {
    piRoot,
    featuresRoot,
    featureDir,
    draftPath: join(featureDir, "feature.draft.md"),
    featurePath: join(featureDir, "feature.md"),
    planPath: join(featureDir, "plan.md"),
  };
}

export async function ensureFeatureDir(paths: ArtifactPaths): Promise<void> {
  await mkdir(paths.featureDir, { recursive: true });
}

export async function featureDirExists(paths: ArtifactPaths): Promise<boolean> {
  return exists(paths.featureDir);
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function relativeArtifactPath(cwd: string, path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const cwdNormalized = resolve(cwd).replaceAll("\\", "/");
  return normalized.startsWith(cwdNormalized)
    ? normalized.slice(cwdNormalized.length + 1)
    : normalized;
}

export function inferProjectName(cwd: string): string {
  return parse(resolve(cwd)).base || "project";
}
