import * as fs from "node:fs";
import type { HierRulesConfig } from "@app/config";
import { readJsonFile } from "@shared/json";
import { projectStateDir } from "@shared/paths";
import type { MaintainerActiveRun } from "@features/rule-maintenance/model";
import { maintainerActivePath, maintainerLockPath } from "@features/rule-maintenance/paths";
import { isProcessAlive } from "@features/rule-maintenance/runtime/process";
import { appendMaintainerLog } from "@features/rule-maintenance/state/log";

type ActiveRunsFile = { active?: MaintainerActiveRun[] };

function normalizeRun(run: MaintainerActiveRun): MaintainerActiveRun {
	return {
		...run,
		changedFiles: Array.isArray(run.changedFiles) ? run.changedFiles : [],
		protectedRulePaths: Array.isArray(run.protectedRulePaths) ? run.protectedRulePaths : [],
	};
}

export function readActiveMaintainerRuns(cwd: string): MaintainerActiveRun[] {
	const value = readJsonFile<ActiveRunsFile>(maintainerActivePath(cwd), { active: [] });
	return Array.isArray(value.active) ? value.active.map(normalizeRun) : [];
}

export function writeActiveMaintainerRuns(cwd: string, active: MaintainerActiveRun[]) {
	fs.mkdirSync(projectStateDir(cwd), { recursive: true });
	fs.writeFileSync(maintainerActivePath(cwd), JSON.stringify({ active }, null, 2));
	fs.rmSync(maintainerLockPath(cwd), { force: true });
}

export function activeRunAgeMs(run: MaintainerActiveRun): number {
	const started = Date.parse(run.startedAt);
	return Number.isFinite(started) ? Date.now() - started : 0;
}

export function isActiveRunSuspicious(run: MaintainerActiveRun, config: HierRulesConfig): boolean {
	return isProcessAlive(run.pid) && activeRunAgeMs(run) > config.maintainer.lockMaxAgeMs;
}

function isRunAliveOrStarting(run: MaintainerActiveRun): boolean {
	if (isProcessAlive(run.pid)) return true;
	return !run.pid && activeRunAgeMs(run) < 5_000;
}

export function pruneDeadActiveRuns(cwd: string): MaintainerActiveRun[] {
	const active = readActiveMaintainerRuns(cwd);
	const alive = active.filter(isRunAliveOrStarting);
	if (alive.length !== active.length) {
		const removed = active.filter((run) => !isRunAliveOrStarting(run));
		for (const run of removed) appendMaintainerLog(cwd, `Cleared stale maintainer active run ${run.id} for dead PID ${run.pid ?? "unknown"} at ${new Date().toISOString()}.`);
		writeActiveMaintainerRuns(cwd, alive);
	}
	return alive;
}

export function addActiveMaintainerRun(cwd: string, run: MaintainerActiveRun) {
	writeActiveMaintainerRuns(cwd, [...readActiveMaintainerRuns(cwd), run]);
}

export function updateActiveMaintainerRun(cwd: string, id: string, updates: Partial<MaintainerActiveRun>) {
	writeActiveMaintainerRuns(cwd, readActiveMaintainerRuns(cwd).map((run) => (run.id === id ? { ...run, ...updates } : run)));
}

export function removeActiveMaintainerRun(cwd: string, id: string) {
	writeActiveMaintainerRuns(cwd, readActiveMaintainerRuns(cwd).filter((run) => run.id !== id));
}
