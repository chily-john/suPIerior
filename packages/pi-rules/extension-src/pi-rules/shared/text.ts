export function normalizeText(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9_./-]+/g, " ").trim();
}

export function compactHyphenatedText(text: string): string {
	return normalizeText(text).replace(/-/g, "");
}

export function tokenSet(text: string): Set<string> {
	const tokens = normalizeText(text)
		.split(/\s+/)
		.flatMap((word) => {
			const compacted = word.replace(/-/g, "");
			return compacted !== word ? [word, compacted] : [word];
		})
		.filter((word) => word.length >= 4)
		.map((word) => (word.endsWith("s") ? word.slice(0, -1) : word));
	return new Set(tokens);
}
