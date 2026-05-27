import { readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { KanbanConverter, KanbanConverterContext, KanbanConverterResult } from "@domain/types";
import { parseIssuesMarkdown, serializeIssuesMarkdown, type IssueItem } from "@github/issues-file";
import { normalizeGithubIssueConfig, publishIssue } from "@github/publisher";
import { renderGithubIssuesPrompt, stripMarkdownFence } from "@github/prompt";

export const githubIssueConverter: KanbanConverter = {
  id: "github-issue",
  async convert(ctx: KanbanConverterContext): Promise<KanbanConverterResult> {
    const issuesPath = ctx.issuesPath ?? join(ctx.featureDir, "issues.md");
    const featureMarkdown = await readFile(ctx.featurePath, "utf8");
    const generated = stripMarkdownFence(
      await ctx.modelAdapter.complete(renderGithubIssuesPrompt(featureMarkdown)),
    );
    const parsedGenerated = parseIssuesMarkdown(generated);
    await writeFile(issuesPath, generated, "utf8");

    ctx.ui.notify?.(
      `Generated ${parsedGenerated.length} GitHub issue drafts at ${issuesPath}. Review or edit this file before approving publication.`,
      "info",
    );

    const approved = await ctx.ui.confirm(
      "Publish GitHub issues?",
      `Review ${issuesPath}, then approve to create ${parsedGenerated.length} GitHub issues with gh. If you decline, the feature folder will be left intact.`,
    );
    if (!approved) {
      ctx.ui.notify?.("GitHub issue publishing skipped; generated feature folder was left intact.", "info");
      return { issuesPath, published: false, createdUrls: [], cleanedUp: false };
    }

    const approvedMarkdown = await readFile(issuesPath, "utf8");
    const approvedIssues = orderByDependencies(parseIssuesMarkdown(approvedMarkdown));
    const config = normalizeGithubIssueConfig(ctx.config);
    const createdUrls: string[] = [];
    const updatedIssues = parseIssuesMarkdown(approvedMarkdown);

    try {
      const createdByTitle = new Map<string, string>();
      for (const issue of approvedIssues) {
        const issueToPublish = withDependencyUrls(issue, createdByTitle);
        const result = await publishIssue(issueToPublish, config);
        createdUrls.push(result.url);
        createdByTitle.set(issue.title, result.url);
        const matching = updatedIssues.find((candidate) => candidate.title === issue.title);
        if (matching) {
          matching.createdUrl = result.url;
          matching.body = issueToPublish.body;
        }
        await writeFile(
          issuesPath,
          serializeIssuesMarkdown(basename(ctx.featureDir), updatedIssues),
          "utf8",
        );
      }
    } catch (error) {
      ctx.ui.notify?.(
        `GitHub issue publishing failed after creating ${createdUrls.length} issue(s). The feature folder was kept for recovery.`,
        "error",
      );
      throw error;
    }

    await rm(ctx.featureDir, { recursive: true, force: true });
    ctx.ui.notify?.(`Created ${createdUrls.length} GitHub issue(s) and removed ${ctx.featureDir}.`, "info");
    return { issuesPath, published: true, createdUrls, cleanedUp: true };
  },
};

function withDependencyUrls(issue: IssueItem, createdByTitle: Map<string, string>): IssueItem {
  const dependencyRefs = issue.blockedBy.map((dependency) => createdByTitle.get(dependency) ?? dependency);
  if (dependencyRefs.length === 0) return issue;
  const blockedBySection = `## Blocked by\n${dependencyRefs.map((dependency) => `- ${dependency}`).join("\n")}`;
  const body = /## Blocked by[\s\S]*?(?=\n## |\s*$)/i.test(issue.body)
    ? issue.body.replace(/## Blocked by[\s\S]*?(?=\n## |\s*$)/i, blockedBySection)
    : `${issue.body.trim()}\n\n${blockedBySection}`;
  return { ...issue, body };
}

function orderByDependencies(issues: IssueItem[]): IssueItem[] {
  const byTitle = new Map(issues.map((issue) => [issue.title, issue]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: IssueItem[] = [];

  function visit(issue: IssueItem): void {
    if (visited.has(issue.title)) return;
    if (visiting.has(issue.title)) throw new Error(`Circular issue dependency involving '${issue.title}'.`);
    visiting.add(issue.title);
    for (const dependency of issue.blockedBy) {
      const blocker = byTitle.get(dependency);
      if (blocker) visit(blocker);
    }
    visiting.delete(issue.title);
    visited.add(issue.title);
    ordered.push(issue);
  }

  for (const issue of issues) visit(issue);
  return ordered;
}
