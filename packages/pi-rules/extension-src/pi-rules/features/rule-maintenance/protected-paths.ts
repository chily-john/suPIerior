import * as path from "node:path";
import { buildRuleIndex } from "@domain/rule-context/discovery/indexer";
import { pathMatchesPatternScope } from "@domain/rule-context/routing/globs";

function normalizeRulePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function siblingRuleFiles(cwd: string, ruleRelativePath: string): string[] {
  const index = buildRuleIndex(cwd);
  const directory = path.posix.dirname(ruleRelativePath.replace(/\\/g, "/"));
  return index.rules
    .filter((rule) => path.posix.dirname(rule.relativePath) === directory)
    .map((rule) => rule.relativePath);
}

export function protectedRulePathsForBatch(cwd: string, changedFiles: string[]): string[] {
  const index = buildRuleIndex(cwd);
  const protectedPaths = new Set<string>();
  for (const changedFile of changedFiles) {
    const normalizedChangedFile = changedFile.replace(/\\/g, "/").replace(/^\.\//, "");
    const matches = index.rules.filter(
      (rule) =>
        rule.kind === "rules" &&
        rule.paths.some((pattern) => pathMatchesPatternScope(normalizedChangedFile, pattern)),
    );
    for (const rule of matches) {
      protectedPaths.add(rule.relativePath);
      for (const sibling of siblingRuleFiles(cwd, rule.relativePath)) protectedPaths.add(sibling);
    }
  }
  return protectedPaths.size > 0
    ? [...protectedPaths].map(normalizeRulePath).sort()
    : [".pi/rules"];
}

export function protectedRulePathsOverlap(left: string[], right: string[]): boolean {
  for (const leftPath of left.map(normalizeRulePath)) {
    for (const rightPath of right.map(normalizeRulePath)) {
      if (leftPath === rightPath) return true;
      const leftIsScope = !leftPath.endsWith(".md");
      const rightIsScope = !rightPath.endsWith(".md");
      if (leftIsScope && rightPath.startsWith(`${leftPath}/`)) return true;
      if (rightIsScope && leftPath.startsWith(`${rightPath}/`)) return true;
    }
  }
  return false;
}
