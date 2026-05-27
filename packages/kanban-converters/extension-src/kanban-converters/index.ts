import { KanbanConverterRegistry } from "@domain/registry";
import { githubIssueConverter } from "@github/converter";

export type {
  KanbanConverter,
  KanbanConverterContext,
  KanbanConverterResult,
  KanbanConverterUi,
  KanbanModelAdapter,
} from "@domain/types";
export { KanbanConverterRegistry } from "@domain/registry";
export { githubIssueConverter } from "@github/converter";
export type { GithubIssueConverterConfig } from "@github/publisher";
export { buildGhIssueCreateArgs, normalizeGithubIssueConfig } from "@github/publisher";
export { parseIssuesMarkdown, serializeIssuesMarkdown, type IssueItem, type IssueType } from "@github/issues-file";

export function createDefaultKanbanConverterRegistry(): KanbanConverterRegistry {
  const registry = new KanbanConverterRegistry();
  registry.register(githubIssueConverter);
  return registry;
}
