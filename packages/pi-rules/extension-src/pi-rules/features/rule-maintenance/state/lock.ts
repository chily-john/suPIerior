import * as fs from "node:fs";
import type { HierRulesConfig } from "@app/config";
import { readJsonFile } from "@shared/json";
import { projectStateDir } from "@shared/paths";
import type { MaintainerLock } from "@features/rule-maintenance/model";
import { maintainerLockPath } from "@features/rule-maintenance/paths";
import { isProcessAlive } from "@features/rule-maintenance/runtime/process";
import { appendMaintainerLog } from "@features/rule-maintenance/state/log";

export function lockAgeMs(cwd: string): number | undefined {
	const lockPath = maintainerLockPath(cwd);
	if (!fs.existsSync(lockPath)) return undefined;
	return Date.now() - fs.statSync(lockPath).mtimeMs;
}

export function isLockStale(cwd: string, config: HierRulesConfig): boolean {
	const age = lockAgeMs(cwd);
	return age !== undefined && age > config.maintainer.lockMaxAgeMs;
}

export function readMaintainerLock(cwd: string): MaintainerLock | undefined {
	const lockPath = maintainerLockPath(cwd);
	if (!fs.existsSync(lockPath)) return undefined;
	return readJsonFile<MaintainerLock | undefined>(lockPath, undefined);
}

export function isMaintainerLocked(cwd: string, _config: HierRulesConfig): boolean {
	const lockPath = maintainerLockPath(cwd);
	if (!fs.existsSync(lockPath)) return false;
	const lock = readMaintainerLock(cwd);
	if (isProcessAlive(lock?.pid)) return true;
	appendMaintainerLog(cwd, `Cleared stale maintainer lock for dead PID ${lock?.pid ?? "unknown"} at ${new Date().toISOString()}.`);
	fs.rmSync(lockPath, { force: true });
	return false;
}

export function acquireMaintainerLock(cwd: string, reason: string, changedFiles: string[], config: HierRulesConfig): string | undefined {
	fs.mkdirSync(projectStateDir(cwd), { recursive: true });
	const lockPath = maintainerLockPath(cwd);
	if (isMaintainerLocked(cwd, config)) return undefined;
	fs.writeFileSync(lockPath, JSON.stringify({ startedAt: new Date().toISOString(), reason, changedFiles }, null, 2));
	return lockPath;
}

export function updateMaintainerLock(cwd: string, updates: Partial<MaintainerLock>) {
	const lockPath = maintainerLockPath(cwd);
	const lock = readJsonFile<MaintainerLock>(lockPath, { startedAt: new Date().toISOString() });
	fs.writeFileSync(lockPath, JSON.stringify({ ...lock, ...updates }, null, 2));
}

export function releaseMaintainerLock(lockPath: string | undefined) {
	if (lockPath) fs.rmSync(lockPath, { force: true });
}
