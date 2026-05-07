import type { RuleKind } from "@domain/rule-context/discovery/model";

function stripQuotes(value: string): string {
	return value.trim().replace(/^['"]|['"]$/g, "");
}

export function parseFrontmatter(content: string): Record<string, string | string[]> {
	if (!content.startsWith("---")) return {};
	const end = content.indexOf("---", 3);
	if (end === -1) return {};

	const result: Record<string, string | string[]> = {};
	let currentListKey: string | undefined;
	for (const line of content.slice(3, end).split(/\r?\n/)) {
		const scalar = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
		if (scalar) {
			const [, key, rawValue] = scalar;
			if (rawValue === "") {
				result[key] = [];
				currentListKey = key;
			} else {
				result[key] = stripQuotes(rawValue);
				currentListKey = undefined;
			}
			continue;
		}

		const item = line.match(/^\s*-\s*(.+?)\s*$/);
		if (item && currentListKey) {
			const current = result[currentListKey];
			if (Array.isArray(current)) current.push(stripQuotes(item[1]));
			continue;
		}

		if (/^\S/.test(line)) currentListKey = undefined;
	}
	return result;
}

export function getBody(content: string): string {
	if (!content.startsWith("---")) return content;
	const end = content.indexOf("---", 3);
	return end === -1 ? content : content.slice(end + 3).trim();
}

export function getTitle(content: string, fallback: string): string {
	const match = getBody(content).match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : fallback;
}

export function getSummary(content: string, frontmatter: Record<string, string | string[]>): string {
	const explicit = frontmatter.summary;
	if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
	const body = getBody(content)
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#") && !line.startsWith("---"));
	return body[0] ?? "";
}

export function normalizeKind(value: string | string[] | undefined): RuleKind {
	if (value === "inventory") return "inventory";
	if (value === "rules" || value === undefined) return "rules";
	return "other";
}

export function asList(value: string | string[] | undefined): string[] {
	if (Array.isArray(value)) return value.filter(Boolean);
	if (typeof value === "string" && value.trim()) return [value.trim()];
	return [];
}
