import { normalizeProjectPath } from "@shared/paths";
import { extractBashFileActivity } from "@features/rule-maintenance/bash-paths";
import { addChangedPath, createTurnFileActivity, mergeTurnFileActivity, type TurnFileActivity } from "@features/rule-maintenance/turn-activity";

export function fileActivityFromTool(cwd: string, toolName: string, input: unknown): TurnFileActivity {
	const activity = createTurnFileActivity();
	const data = input as Record<string, unknown> | undefined;
	if (!data) return activity;
	const add = (value: unknown) => {
		if (typeof value !== "string") return;
		const normalized = normalizeProjectPath(cwd, value);
		if (normalized) addChangedPath(activity, normalized, { source: "tool", toolName });
	};
	const normalizedToolName = toolName.split(/[.:/\\]/).pop() ?? toolName;
	if (normalizedToolName === "write" || normalizedToolName === "edit") add(data.path);
	if (normalizedToolName === "bash") {
		const command = typeof data.command === "string" ? data.command : typeof data.cmd === "string" ? data.cmd : undefined;
		if (command) mergeTurnFileActivity(activity, extractBashFileActivity(cwd, command));
	}
	return activity;
}

export function changedPathsFromTool(cwd: string, toolName: string, input: unknown): string[] {
	return [...fileActivityFromTool(cwd, toolName, input).changed.keys()];
}
