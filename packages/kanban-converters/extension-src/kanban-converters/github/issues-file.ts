export type IssueType = "HITL" | "AFK";

export interface IssueItem {
  title: string;
  type: IssueType;
  labels: string[];
  blockedBy: string[];
  createdUrl?: string;
  body: string;
}

export function parseIssuesMarkdown(markdown: string): IssueItem[] {
  const blocks = markdown.split(/^---\s*$/m).slice(1);
  const issues: IssueItem[] = [];
  for (let index = 0; index < blocks.length; index += 2) {
    const metadataBlock = blocks[index];
    const bodyBlock = blocks[index + 1];
    if (metadataBlock === undefined || bodyBlock === undefined) continue;
    const metadata = parseMetadata(metadataBlock);
    const title = stringValue(metadata.title);
    const type = stringValue(metadata.type);
    if (!title) throw new Error("Invalid issues.md: each issue needs a title.");
    if (type !== "HITL" && type !== "AFK") {
      throw new Error(`Invalid issues.md: issue '${title}' must have type HITL or AFK.`);
    }
    issues.push({
      title,
      type,
      labels: arrayValue(metadata.labels),
      blockedBy: arrayValue(metadata.blockedBy),
      createdUrl: stringValue(metadata.createdUrl) || undefined,
      body: bodyBlock.trim(),
    });
  }
  if (issues.length === 0) {
    throw new Error("Invalid issues.md: no issue blocks were found.");
  }
  return issues;
}

export function serializeIssuesMarkdown(title: string, issues: IssueItem[]): string {
  const rendered = issues.map((issue) => {
    const metadata = [
      `title: ${quoteYaml(issue.title)}`,
      `type: ${issue.type}`,
      renderArray("labels", issue.labels),
      renderArray("blockedBy", issue.blockedBy),
      issue.createdUrl ? `createdUrl: ${quoteYaml(issue.createdUrl)}` : undefined,
    ].filter(Boolean);
    return `---\n${metadata.join("\n")}\n---\n\n${issue.body.trim()}\n`;
  });
  return `# Issues for ${title}\n\n${rendered.join("\n")}`;
}

function parseMetadata(block: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);
  let currentArrayKey: string | undefined;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const arrayItem = /^\s*-\s*(.*)$/.exec(line);
    if (arrayItem && currentArrayKey) {
      (result[currentArrayKey] as string[]).push(unquoteYaml(arrayItem[1] ?? ""));
      continue;
    }
    currentArrayKey = undefined;
    const pair = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    const key = pair[1];
    const rawValue = pair[2] ?? "";
    if (rawValue === "[]") {
      result[key] = [];
    } else if (!rawValue) {
      result[key] = [];
      currentArrayKey = key;
    } else {
      result[key] = unquoteYaml(rawValue);
    }
  }
  return result;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function renderArray(key: string, values: string[]): string {
  if (values.length === 0) return `${key}: []`;
  return `${key}:\n${values.map((value) => `  - ${quoteYaml(value)}`).join("\n")}`;
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function unquoteYaml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}
