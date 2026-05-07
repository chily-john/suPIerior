export type RenamedMaintainerPath = {
	fromPath: string;
	toPath: string;
};

export type MaintainerPathChangeMetadata = {
	deletedFiles?: string[];
	renamedFiles?: RenamedMaintainerPath[];
};

export type MaintainerQueueBatch = MaintainerPathChangeMetadata & {
	reason: string;
	changedFiles: string[];
	queuedAt: string;
	protectedRulePaths?: string[];
};

export type MaintainerActiveRun = {
	id: string;
	pid?: number;
	startedAt: string;
	reason: string;
	changedFiles: string[];
	protectedRulePaths: string[];
};

export type MaintainerLock = {
	pid?: number;
	startedAt: string;
	reason?: string;
	changedFiles?: string[];
};

export type MaintainerCallbacks = {
	onStarted?: () => void;
	onQueued?: (queueSize: number) => void;
	onFinished?: (result: { ok: boolean; code?: number | null; error?: string; logPath: string; startedNext?: boolean }) => void;
};
