import { normalizeProjectPath } from "@shared/paths";
import { addDeletedPath, addRenamedPath, createTurnFileActivity, type TurnFileActivity } from "@features/rule-maintenance/turn-activity";

function hasUnescapedTrailingBackslash(line: string): boolean {
	let count = 0;
	for (let index = line.length - 1; index >= 0 && line[index] === "\\"; index--) count++;
	return count % 2 === 1;
}

function logicalCommandLines(command: string): string[] {
	const lines = command.replace(/\r\n?/g, "\n").split("\n");
	const logicalLines: string[] = [];
	let current = "";
	for (const line of lines) {
		const trimmedEnd = line.replace(/[\t ]+$/g, "");
		if (hasUnescapedTrailingBackslash(trimmedEnd)) {
			current += `${trimmedEnd.slice(0, -1)} `;
			continue;
		}
		logicalLines.push(`${current}${trimmedEnd}`);
		current = "";
	}
	if (current.trim()) logicalLines.push(current);
	return logicalLines;
}

function tokenizeLiteralCommand(line: string): string[] {
	const tokens: string[] = [];
	let token = "";
	let quote: "'" | '"' | undefined;
	for (let index = 0; index < line.length; index++) {
		const char = line[index];
		if (quote) {
			if (char === quote) {
				quote = undefined;
				continue;
			}
			if (char === "\\" && quote === '"' && index + 1 < line.length) {
				token += line[++index];
				continue;
			}
			token += char;
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}
		if (/\s/.test(char)) {
			if (token) {
				tokens.push(token);
				token = "";
			}
			continue;
		}
		if (char === "\\" && index + 1 < line.length) {
			token += line[++index];
			continue;
		}
		token += char;
	}
	if (quote) return [];
	if (token) tokens.push(token);
	return tokens;
}

function isLiteralPathOperand(token: string): boolean {
	return Boolean(token) && !/[`$*?()[\]{};|&<>]/.test(token);
}

function pathOperands(tokens: string[]): string[] {
	const operands: string[] = [];
	let endOfFlags = false;
	for (const token of tokens) {
		if (token.startsWith("#") || /[;|&<>]/.test(token)) break;
		if (!endOfFlags && token === "--") {
			endOfFlags = true;
			continue;
		}
		if (!endOfFlags && (/^-[A-Za-z]+$/.test(token) || /^--[A-Za-z][A-Za-z-]*(=.*)?$/.test(token))) continue;
		if (isLiteralPathOperand(token)) operands.push(token);
	}
	return operands;
}

export function extractBashFileActivity(cwd: string, command: string): TurnFileActivity {
	const activity = createTurnFileActivity();
	for (const line of logicalCommandLines(command)) {
		const tokens = tokenizeLiteralCommand(line.trim());
		if (tokens.length === 0) continue;
		const [executable, ...args] = tokens;
		if (executable === "rm") {
			for (const operand of pathOperands(args)) {
				const normalized = normalizeProjectPath(cwd, operand);
				if (normalized) addDeletedPath(activity, normalized, { source: "tool", toolName: "bash" });
			}
			continue;
		}
		if (executable === "mv") {
			const operands = pathOperands(args);
			if (operands.length !== 2) continue;
			const fromPath = normalizeProjectPath(cwd, operands[0]);
			const toPath = normalizeProjectPath(cwd, operands[1]);
			if (fromPath && toPath) addRenamedPath(activity, fromPath, toPath, { source: "tool", toolName: "bash" });
		}
	}
	return activity;
}
