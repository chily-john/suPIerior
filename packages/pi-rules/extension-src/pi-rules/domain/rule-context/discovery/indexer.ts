import * as fs from "node:fs";
import * as path from "node:path";
import type { RuleFile, RuleIndex } from "@domain/rule-context/discovery/model";
import {
  asList,
  getSummary,
  getTitle,
  normalizeKind,
  parseFrontmatter,
} from "@domain/rule-context/discovery/frontmatter";

export function findMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMarkdownFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(fullPath);
  }
  return results;
}

function buildSignature(files: string[]): string {
  return files
    .map((file) => {
      const stat = fs.statSync(file);
      return `${file}:${stat.mtimeMs}:${stat.size}`;
    })
    .join("|");
}

export function buildRuleIndex(cwd: string): RuleIndex {
  const rulesDir = path.join(cwd, ".pi", "rules");
  const files = findMarkdownFiles(rulesDir).sort();
  const signature = buildSignature(files);
  const rules: RuleFile[] = files.map((filePath) => {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(content);
    const relativePath = path.relative(cwd, filePath).replace(/\\/g, "/");
    return {
      path: filePath,
      relativePath,
      kind: normalizeKind(frontmatter.kind),
      paths: asList(frontmatter.paths),
      summary: getSummary(content, frontmatter),
      triggers: asList(frontmatter.triggers),
      title: getTitle(content, path.basename(filePath, ".md")),
      content,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    };
  });
  return { cwd, rulesDir, rules, signature };
}

export function getRuleIndex(cwd: string, cache: { current?: RuleIndex }): RuleIndex {
  const rulesDir = path.join(cwd, ".pi", "rules");
  const files = findMarkdownFiles(rulesDir).sort();
  const signature = buildSignature(files);
  if (cache.current && cache.current.cwd === cwd && cache.current.signature === signature)
    return cache.current;
  cache.current = buildRuleIndex(cwd);
  return cache.current;
}
