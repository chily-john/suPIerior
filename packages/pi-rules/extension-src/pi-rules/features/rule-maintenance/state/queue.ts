import * as fs from "node:fs";
import { readJsonFile } from "@shared/json";
import { projectStateDir } from "@shared/paths";
import type { MaintainerPathChangeMetadata, MaintainerQueueBatch } from "@features/rule-maintenance/model";
import { maintainerQueuePath } from "@features/rule-maintenance/paths";

export function readMaintainerQueue(cwd: string): MaintainerQueueBatch[] {
	const value = readJsonFile<{ pending?: MaintainerQueueBatch[] }>(maintainerQueuePath(cwd), { pending: [] });
	return Array.isArray(value.pending) ? value.pending : [];
}

export function writeMaintainerQueue(cwd: string, pending: MaintainerQueueBatch[]) {
	fs.mkdirSync(projectStateDir(cwd), { recursive: true });
	fs.writeFileSync(maintainerQueuePath(cwd), JSON.stringify({ pending }, null, 2));
}

export function enqueueMaintainerBatch(cwd: string, changedFiles: string[], reason: string, protectedRulePaths?: string[], metadata: MaintainerPathChangeMetadata = {}): number {
	const pending = readMaintainerQueue(cwd);
	pending.push({
		reason,
		changedFiles: [...new Set(changedFiles)],
		protectedRulePaths,
		...(metadata.deletedFiles?.length ? { deletedFiles: metadata.deletedFiles } : {}),
		...(metadata.renamedFiles?.length ? { renamedFiles: metadata.renamedFiles } : {}),
		queuedAt: new Date().toISOString(),
	});
	writeMaintainerQueue(cwd, pending);
	return pending.length;
}

export function dequeueMaintainerBatch(cwd: string): MaintainerQueueBatch | undefined {
	const pending = readMaintainerQueue(cwd);
	const next = pending.shift();
	writeMaintainerQueue(cwd, pending);
	return next;
}
