import { basename, join } from "node:path";

export function resolveGardenResumePath(gardenPath: string): string {
  return join(gardenPath, "resume.json");
}

export function resolveResumePathInput(pathOrGardenPath: string): string {
  return basename(pathOrGardenPath) === "resume.json"
    ? pathOrGardenPath
    : resolveGardenResumePath(pathOrGardenPath);
}
