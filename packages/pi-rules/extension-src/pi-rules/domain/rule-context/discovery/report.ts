import * as fs from "node:fs";
import * as path from "node:path";
import type { RuleIndex } from "@domain/rule-context/discovery/model";
import { getRuleIndex } from "@domain/rule-context/discovery/indexer";

export function formatStatus(cwd: string, cache: { current?: RuleIndex }): string {
	const contextPath = path.join(cwd, "AGENTS.md");
	const index = getRuleIndex(cwd, cache);
	const withPaths = index.rules.filter((rule) => rule.paths.length > 0).length;
	const withoutPaths = index.rules.length - withPaths;
	const rulesCount = index.rules.filter((rule) => rule.kind === "rules").length;
	const inventoryCount = index.rules.filter((rule) => rule.kind === "inventory").length;

	const lines = [
		"Pi Hier Rules status",
		`- Root AGENTS.md: ${fs.existsSync(contextPath) ? "AGENTS.md" : "missing"}`,
		`- Rules directory: ${fs.existsSync(index.rulesDir) ? ".pi/rules" : "missing"}`,
		`- Rule files: ${index.rules.length}`,
		`- kind=rules: ${rulesCount}`,
		`- kind=inventory: ${inventoryCount}`,
		`- Rule files with paths frontmatter: ${withPaths}`,
	];
	if (withoutPaths > 0) lines.push(`- Rule files missing paths frontmatter: ${withoutPaths}`);
	if (index.rules.length > 0) {
		lines.push("", "Rules:");
		for (const rule of index.rules) {
			const paths = rule.paths.length > 0 ? ` (${rule.paths.join(", ")})` : "";
			lines.push(`- [${rule.kind}] ${rule.relativePath}${paths}`);
		}
	}
	return lines.join("\n");
}
