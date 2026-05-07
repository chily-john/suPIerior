import * as fs from "node:fs";
import { projectStateDir } from "@shared/paths";
import { maintainerLogPath } from "@features/rule-maintenance/paths";

export function appendMaintainerLog(cwd: string, message: string) {
	fs.mkdirSync(projectStateDir(cwd), { recursive: true });
	fs.appendFileSync(maintainerLogPath(cwd), `${message}\n`);
}

export function appendMaintainerRunHeader(cwd: string, reason: string, changedFiles: string[]): string {
	const logPath = maintainerLogPath(cwd);
	fs.appendFileSync(logPath, `\n\n=== ${new Date().toISOString()} ${reason} ===\nFiles:\n${changedFiles.map((file) => `- ${file}`).join("\n")}\n\n`);
	return logPath;
}

export function tailMaintenanceLog(cwd: string, maxLines = 80): string {
	const filePath = maintainerLogPath(cwd);
	if (!fs.existsSync(filePath)) return "No log file found.";
	return fs.readFileSync(filePath, "utf8").split(/\r?\n/).slice(-maxLines).join("\n");
}
