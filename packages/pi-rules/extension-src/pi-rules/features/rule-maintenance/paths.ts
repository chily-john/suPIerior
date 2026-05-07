import * as path from "node:path";
import { projectStateDir } from "@shared/paths";

export function maintainerQueuePath(cwd: string): string {
	return path.join(projectStateDir(cwd), "queue.json");
}
export function maintainerActivePath(cwd: string): string {
	return path.join(projectStateDir(cwd), "active.json");
}
export function maintainerLockPath(cwd: string): string {
	return path.join(projectStateDir(cwd), "maintainer.lock");
}
export function maintainerLogPath(cwd: string): string {
	return path.join(projectStateDir(cwd), "maintainer.log");
}
export function maintainerSkillPath(): string {
	return path.join(__dirname, "..", "..", "..", "skills", "rules-maintainer");
}
