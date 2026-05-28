import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { IssueItem } from "@github/issues-file";

const execFileAsync = promisify(execFile);

export interface GithubIssueConverterConfig {
  repo?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
}

export interface PublishResult {
  issue: IssueItem;
  url: string;
}

export async function publishIssue(
  issue: IssueItem,
  config: GithubIssueConverterConfig = {},
): Promise<PublishResult> {
  const args = buildGhIssueCreateArgs(issue, config);
  const { stdout } = await execFileAsync("gh", args, { encoding: "utf8" });
  const url = stdout
    .trim()
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim();
  if (!url) throw new Error(`gh did not return a created issue URL for '${issue.title}'.`);
  return { issue, url };
}

export function buildGhIssueCreateArgs(
  issue: IssueItem,
  config: GithubIssueConverterConfig = {},
): string[] {
  const args = ["issue", "create", "--title", issue.title, "--body", issue.body];
  if (config.repo) args.push("--repo", config.repo);
  for (const label of [...(config.labels ?? []), ...issue.labels]) args.push("--label", label);
  for (const assignee of config.assignees ?? []) args.push("--assignee", assignee);
  if (config.milestone) args.push("--milestone", config.milestone);
  return args;
}

export function normalizeGithubIssueConfig(config: unknown): GithubIssueConverterConfig {
  if (!config || typeof config !== "object") return {};
  const input = config as Record<string, unknown>;
  return {
    repo: stringOrUndefined(input.repo),
    labels: stringArray(input.labels),
    assignees: stringArray(input.assignees),
    milestone: stringOrUndefined(input.milestone),
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}
