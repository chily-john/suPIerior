import type { HierRulesConfig } from "@app/config";
import type { RuleFile, RuleIndex } from "@domain/rule-context/discovery/model";
import { compactHyphenatedText, normalizeText, tokenSet } from "@shared/text";
import { extractPathMentions, pathMatchesPattern } from "@domain/rule-context/routing/globs";
import { hasCodeEditIntent } from "@domain/rule-context/routing/intent";

export type Selection = {
	fullRules: RuleFile[];
	parentSummaries: RuleFile[];
	inventories: RuleFile[];
	reason: string;
};

function scoreRule(rule: RuleFile, prompt: string, pathMentions: string[]): number {
	const text = normalizeText(prompt);
	const compactText = compactHyphenatedText(prompt);
	const promptTokens = tokenSet(prompt);
	let score = 0;
	for (const mentionedPath of pathMentions) {
		if (rule.paths.some((pattern) => pathMatchesPattern(mentionedPath, pattern))) score += 100;
	}
	for (const trigger of rule.triggers) {
		const normalizedTrigger = normalizeText(trigger);
		const compactTrigger = compactHyphenatedText(trigger);
		if (normalizedTrigger && (text.includes(normalizedTrigger) || compactText.includes(compactTrigger))) score += 40 + normalizedTrigger.length / 10;
	}
	const summaryWords = tokenSet(`${rule.relativePath} ${rule.title} ${rule.summary}`);
	for (const word of summaryWords) if (promptTokens.has(word)) score += 3;
	return score;
}

function logicalRuleDir(rule: RuleFile): string {
	const withoutPrefix = rule.relativePath.replace(/^\.pi\/rules\//, "");
	const parts = withoutPrefix.split("/");
	const fileName = parts.pop() ?? "";
	const baseName = fileName.replace(/\.md$/, "");
	if (parts[parts.length - 1] === baseName) return parts.join("/");
	return [...parts, baseName].filter(Boolean).join("/");
}

function parentCandidates(rule: RuleFile, rules: RuleFile[]): RuleFile[] {
	const ruleDir = logicalRuleDir(rule);
	const parents: RuleFile[] = [];
	for (const candidate of rules) {
		if (candidate.kind !== "rules" || candidate.relativePath === rule.relativePath) continue;
		const candidateDir = logicalRuleDir(candidate);
		if (!candidateDir || candidateDir === ruleDir) continue;
		if (ruleDir.startsWith(`${candidateDir}/`)) parents.push(candidate);
	}
	return parents.sort((a, b) => logicalRuleDir(b).split("/").length - logicalRuleDir(a).split("/").length);
}

export function selectRules(index: RuleIndex, prompt: string, config: HierRulesConfig): Selection {
	const pathMentions = extractPathMentions(prompt);
	const explicitPathMatch = index.rules.some((rule) => pathMentions.some((mentioned) => rule.paths.some((pattern) => pathMatchesPattern(mentioned, pattern))));
	if (!hasCodeEditIntent(prompt, explicitPathMatch)) return { fullRules: [], parentSummaries: [], inventories: [], reason: "No code-edit intent detected" };

	const scored = index.rules
		.filter((rule) => rule.kind === "rules")
		.map((rule) => ({ rule, score: scoreRule(rule, prompt, pathMentions) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || b.rule.relativePath.split("/").length - a.rule.relativePath.split("/").length);

	const fullRules = scored.slice(0, config.injection.maxFullRules).map(({ rule }) => rule);
	if (fullRules.length === 0) return { fullRules: [], parentSummaries: [], inventories: [], reason: "No matching rule metadata" };

	const parentSummaries = parentCandidates(fullRules[0], index.rules).slice(0, config.injection.maxParentSummaries);
	const inventories = index.rules.filter(
		(rule) => rule.kind === "inventory" && fullRules.some((fullRule) => fullRule.paths.some((fullPattern) => rule.paths.some((inventoryPattern) => fullPattern === inventoryPattern))),
	);
	return { fullRules, parentSummaries, inventories, reason: "Matched rule metadata" };
}

export function formatSelection(selection: Selection): string {
	const lines = [`Reason: ${selection.reason}`];
	lines.push("", "Injected full rules:");
	lines.push(...(selection.fullRules.length ? selection.fullRules.map((rule) => `- ${rule.relativePath}`) : ["- none"]));
	lines.push("", "Parent summaries:");
	lines.push(...(selection.parentSummaries.length ? selection.parentSummaries.map((rule) => `- ${rule.relativePath}: ${rule.summary || rule.title}`) : ["- none"]));
	lines.push("", "Available inventories:");
	lines.push(...(selection.inventories.length ? selection.inventories.map((rule) => `- ${rule.relativePath}`) : ["- none"]));
	return lines.join("\n");
}
