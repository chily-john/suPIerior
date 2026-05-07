export type FileActivitySource = "tool" | "git-status" | "unknown";

export type FileActivityMetadata = {
	source?: FileActivitySource;
	toolName?: string;
};

export type RenameActivity = {
	fromPath: string;
	toPath: string;
	metadata?: FileActivityMetadata;
};

export type TurnFileActivity = {
	changed: Map<string, FileActivityMetadata | undefined>;
	deleted: Map<string, FileActivityMetadata | undefined>;
	renamed: Map<string, RenameActivity>;
};

export function createTurnFileActivity(): TurnFileActivity {
	return {
		changed: new Map<string, FileActivityMetadata | undefined>(),
		deleted: new Map<string, FileActivityMetadata | undefined>(),
		renamed: new Map<string, RenameActivity>(),
	};
}

export function addChangedPath(activity: TurnFileActivity, filePath: string, metadata?: FileActivityMetadata) {
	activity.changed.set(filePath, metadata);
}

export function addDeletedPath(activity: TurnFileActivity, filePath: string, metadata?: FileActivityMetadata) {
	activity.deleted.set(filePath, metadata);
}

export function addRenamedPath(activity: TurnFileActivity, fromPath: string, toPath: string, metadata?: FileActivityMetadata) {
	const rename: RenameActivity = metadata ? { fromPath, toPath, metadata } : { fromPath, toPath };
	activity.renamed.set(`${fromPath}\u0000${toPath}`, rename);
}

export function mergeTurnFileActivity(target: TurnFileActivity, source: TurnFileActivity) {
	for (const [filePath, metadata] of source.changed) addChangedPath(target, filePath, metadata);
	for (const [filePath, metadata] of source.deleted) addDeletedPath(target, filePath, metadata);
	for (const rename of source.renamed.values()) addRenamedPath(target, rename.fromPath, rename.toPath, rename.metadata);
}

export function changedActivity(activity: TurnFileActivity): Array<{ path: string; metadata?: FileActivityMetadata }> {
	return [...activity.changed.entries()].map(([filePath, metadata]) => (metadata ? { path: filePath, metadata } : { path: filePath }));
}

export function deletedActivity(activity: TurnFileActivity): Array<{ path: string; metadata?: FileActivityMetadata }> {
	return [...activity.deleted.entries()].map(([filePath, metadata]) => (metadata ? { path: filePath, metadata } : { path: filePath }));
}

export function renamedActivity(activity: TurnFileActivity): RenameActivity[] {
	return [...activity.renamed.values()];
}

export function allActivityPaths(activity: TurnFileActivity): string[] {
	const paths = new Set<string>();
	for (const { path: filePath } of changedActivity(activity)) paths.add(filePath);
	for (const { path: filePath } of deletedActivity(activity)) paths.add(filePath);
	for (const rename of renamedActivity(activity)) {
		paths.add(rename.fromPath);
		paths.add(rename.toPath);
	}
	return [...paths];
}
