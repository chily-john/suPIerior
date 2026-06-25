import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { splitLeadingSkillFrontmatter } from "@orchestration/runtime/private-skills/skill-markdown";
import type {
  WorkflowerPrivateSkill,
  WorkflowerPrivateSkillDiagnostic,
} from "@orchestration/runtime/use-cases/private-skills/private-skill-registry";

export type WorkflowerPrivateSkillLoadResult = {
  skills: WorkflowerPrivateSkill[];
  diagnostics: WorkflowerPrivateSkillDiagnostic[];
};

type PackageManifest = {
  pi?: {
    workflowerSkills?: unknown;
  };
};

type SkillFrontmatter = {
  name?: string;
  description?: string;
};

export function loadPackageWorkflowerSkills(packageUrl: string): WorkflowerPrivateSkillLoadResult {
  const diagnostics: WorkflowerPrivateSkillDiagnostic[] = [];
  const packagePath = safePackageUrlToPath(packageUrl, diagnostics);
  if (packagePath === undefined) return { skills: [], diagnostics };

  const packageJsonPath = findNearestPackageJson(packagePath);

  if (packageJsonPath === undefined) {
    return {
      skills: [],
      diagnostics: [
        {
          level: "error",
          message: "Could not find package.json for Workflower private skills",
          path: packageUrl,
        },
      ],
    };
  }

  const packageRoot = dirname(packageJsonPath);
  const manifest = readPackageManifest(packageJsonPath, diagnostics);
  const declaredSkillDirs = manifest?.pi?.workflowerSkills;

  if (declaredSkillDirs === undefined) return { skills: [], diagnostics };
  if (!Array.isArray(declaredSkillDirs)) {
    diagnostics.push({
      level: "error",
      message: "package.json pi.workflowerSkills must be an array of paths",
      path: packageJsonPath,
    });
    return { skills: [], diagnostics };
  }

  const skills = declaredSkillDirs.flatMap((entry) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      diagnostics.push({
        level: "error",
        message: "package.json pi.workflowerSkills entries must be non-empty strings",
        path: packageJsonPath,
      });
      return [];
    }

    const declaredPath = resolve(packageRoot, entry);
    const skillFiles = findSkillFiles(declaredPath, diagnostics);
    return skillFiles.flatMap((skillFile) => parsePrivateSkill(skillFile, diagnostics));
  });

  return { skills, diagnostics };
}

function safePackageUrlToPath(
  packageUrl: string,
  diagnostics: WorkflowerPrivateSkillDiagnostic[],
): string | undefined {
  try {
    return packageUrl.startsWith("file:") ? fileURLToPath(packageUrl) : resolve(packageUrl);
  } catch (error) {
    diagnostics.push({
      level: "error",
      message: `Invalid Workflower packageUrl: ${errorMessage(error)}`,
      path: packageUrl,
    });
    return undefined;
  }
}

function findNearestPackageJson(startPath: string): string | undefined {
  let current = pathLooksLikeDirectory(startPath) ? startPath : dirname(startPath);

  while (true) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function pathLooksLikeDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readPackageManifest(
  packageJsonPath: string,
  diagnostics: WorkflowerPrivateSkillDiagnostic[],
): PackageManifest | undefined {
  try {
    return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageManifest;
  } catch (error) {
    diagnostics.push({
      level: "error",
      message: `Could not read package.json for Workflower private skills: ${errorMessage(error)}`,
      path: packageJsonPath,
    });
    return undefined;
  }
}

function findSkillFiles(
  declaredPath: string,
  diagnostics: WorkflowerPrivateSkillDiagnostic[],
): string[] {
  if (!existsSync(declaredPath)) {
    diagnostics.push({
      level: "error",
      message: "Declared Workflower private skill path does not exist",
      path: declaredPath,
    });
    return [];
  }

  if (statSync(declaredPath).isFile()) {
    return declaredPath.endsWith("SKILL.md") ? [declaredPath] : [];
  }

  const skillFiles: string[] = [];
  walkSkillDirectory(declaredPath, skillFiles);
  return skillFiles;
}

function walkSkillDirectory(directoryPath: string, skillFiles: string[]): void {
  const entries = readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      walkSkillDirectory(entryPath, skillFiles);
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") skillFiles.push(entryPath);
  }
}

function parsePrivateSkill(
  skillFile: string,
  diagnostics: WorkflowerPrivateSkillDiagnostic[],
): WorkflowerPrivateSkill[] {
  let source: string;
  try {
    source = readFileSync(skillFile, "utf8");
  } catch (error) {
    diagnostics.push({
      level: "error",
      message: `Could not read private skill: ${errorMessage(error)}`,
      path: skillFile,
    });
    return [];
  }

  const frontmatter = parseSkillFrontmatter(source);
  const name = frontmatter.name ?? dirname(skillFile).split(/[\\/]/).at(-1) ?? "";

  if (frontmatter.description === undefined || frontmatter.description.trim() === "") {
    diagnostics.push({
      level: "error",
      message: `Private skill ${name} is missing a description`,
      path: skillFile,
    });
    return [];
  }

  return [
    {
      name,
      description: frontmatter.description,
      filePath: skillFile,
      baseDir: dirname(skillFile),
    },
  ];
}

function parseSkillFrontmatter(source: string): SkillFrontmatter {
  const frontmatterLines = splitLeadingSkillFrontmatter(source).frontmatterLines;
  if (frontmatterLines === undefined) return {};

  const frontmatter: SkillFrontmatter = {};
  for (const line of frontmatterLines) {
    const match = /^(name|description):\s*(.*)$/.exec(line);
    if (match === null) continue;

    const key = match[1] as keyof SkillFrontmatter;
    const value = unquoteFrontmatterValue(match[2].trim());
    if (value !== "") frontmatter[key] = value;
  }

  return frontmatter;
}

function unquoteFrontmatterValue(value: string): string {
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted === null ? value : quoted[2];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
