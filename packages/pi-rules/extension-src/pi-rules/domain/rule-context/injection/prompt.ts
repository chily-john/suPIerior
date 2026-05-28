import type { HierRulesConfig } from "@app/config";
import type { Selection } from "@domain/rule-context/routing/selector";

export function formatInjectedContext(selection: Selection, config: HierRulesConfig): string {
  if (selection.fullRules.length === 0) return "";
  const parts = [
    "## Injected Project Rules",
    "",
    "The following `.pi/rules` context is relevant to this turn and has already been selected for you.",
    "Trust these injected rules as current project guidance. Do not spend time verifying that rule files exist, checking rule status, or keeping rules up to date during the user's task.",
    "Do not call `hier_rules_status`, scan `.pi/rules`, or read rules-maintainer instructions unless the user explicitly asks about the rules system or the injected rule is missing/ambiguous.",
    "Use the injected full rule as authoritative. Read source files only when needed to verify implementation style, existing APIs, or concrete code details.",
  ];
  if (selection.parentSummaries.length > 0) {
    parts.push(
      "",
      "### Parent Rule Summaries",
      "Parent summaries are routing context only. Do not read the full parent rule unless the injected child rule is insufficient.",
    );
    for (const rule of selection.parentSummaries)
      parts.push(`- ${rule.relativePath}: ${rule.summary || rule.title}`);
  }
  for (const rule of selection.fullRules) {
    let content = rule.content.trim();
    if (content.length > config.injection.maxFullRuleChars)
      content = `${content.slice(0, config.injection.maxFullRuleChars)}\n\n[Rule truncated by pi-rules extension due to size limit.]`;
    parts.push("", `### Full Rule: ${rule.relativePath}`, "", content);
  }
  if (selection.inventories.length > 0) {
    parts.push(
      "",
      "### Available Inventories",
      "",
      "Inventories are not injected by default. Read them only when you need a table of contents, reuse check, or bookkeeping update.",
    );
    for (const rule of selection.inventories)
      parts.push(`- ${rule.relativePath}: ${rule.summary || rule.title}`);
  }
  return parts.join("\n");
}
