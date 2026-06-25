export type LeadingSkillFrontmatter = {
  frontmatterLines?: string[];
  body: string;
};

export function splitLeadingSkillFrontmatter(source: string): LeadingSkillFrontmatter {
  const sourceWithoutBom = source.replace(/^\uFEFF/, "");
  const lines = sourceWithoutBom.split(/\r?\n/);
  if (lines[0] !== "---") return { body: sourceWithoutBom };

  const endIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (endIndex === -1) return { body: sourceWithoutBom };

  return {
    frontmatterLines: lines.slice(1, endIndex),
    body: lines.slice(endIndex + 1).join("\n"),
  };
}

export function stripLeadingSkillFrontmatter(source: string): string {
  return splitLeadingSkillFrontmatter(source).body;
}
