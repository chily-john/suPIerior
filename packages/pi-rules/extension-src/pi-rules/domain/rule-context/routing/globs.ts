export function globToRegex(pattern: string): RegExp {
	const normalized = pattern.replace(/\\/g, "/");
	let regex = "";
	for (let index = 0; index < normalized.length; index += 1) {
		const char = normalized[index];
		const next = normalized[index + 1];
		const afterNext = normalized[index + 2];
		if (char === "*" && next === "*" && afterNext === "/") {
			regex += "(?:.*?/)?";
			index += 2;
		} else if (char === "*" && next === "*") {
			regex += ".*";
			index += 1;
		} else if (char === "*") regex += "[^/]*";
		else if (char === "?") regex += "[^/]";
		else regex += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	}
	return new RegExp(`^${regex}$`);
}

function normalizeGlobPath(value: string): string {
	return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "").replace(/\/$/, "");
}

export function pathMatchesPattern(filePath: string, pattern: string): boolean {
	const normalized = normalizeGlobPath(filePath);
	const normalizedPattern = normalizeGlobPath(pattern);
	if (!/[?*]/.test(normalizedPattern)) return normalized === normalizedPattern || normalized.startsWith(`${normalizedPattern}/`);
	return globToRegex(normalizedPattern).test(normalized);
}

function patternStaticDirectory(pattern: string): string {
	const segments = normalizeGlobPath(pattern).split("/");
	const staticSegments: string[] = [];
	for (const segment of segments) {
		if (!segment || /[?*]/.test(segment)) break;
		staticSegments.push(segment);
	}
	return staticSegments.join("/");
}

export function pathMatchesPatternScope(filePath: string, pattern: string): boolean {
	if (pathMatchesPattern(filePath, pattern)) return true;
	const normalized = normalizeGlobPath(filePath);
	const staticDirectory = patternStaticDirectory(pattern);
	return Boolean(staticDirectory) && (normalized === staticDirectory || staticDirectory.startsWith(`${normalized}/`));
}

export function extractPathMentions(text: string): string[] {
	const matches = text.match(/(?:^|\s)([\w.-]+\/[\w./-]+)(?=$|\s|[),.;:])/g) ?? [];
	return matches.map((match) => match.trim()).filter(Boolean);
}
