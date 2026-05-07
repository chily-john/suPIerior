import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { fileActivityFromTool } from "@features/rule-maintenance/changed-files";
import { getGitStatusActivitySince, getGitStatusSnapshot } from "@features/rule-maintenance/git";
import { allActivityPaths, createTurnFileActivity, deletedActivity, mergeTurnFileActivity, renamedActivity } from "@features/rule-maintenance/turn-activity";
import { appendMaintainerLog, startMaintenance, startNextQueuedMaintenance } from "@features/rule-maintenance";
import { getRuleIndex, pathMatchesPatternScope } from "@domain/rule-context";
import { createPresenter } from "@pi/ui/presenter";

function ruleCoveredChangedFiles(cwd: string, files: string[], state: HierRulesState): { covered: string[]; patterns: string[] } {
	const index = getRuleIndex(cwd, state.ruleCache);
	const patterns = index.rules.filter((rule) => rule.kind === "rules").flatMap((rule) => rule.paths);
	if (patterns.length === 0) return { covered: [], patterns };
	return {
		covered: files.filter((file) => !file.startsWith(".pi/") && patterns.some((pattern) => pathMatchesPatternScope(file, pattern))),
		patterns,
	};
}

export function registerMaintainerEvents(pi: ExtensionAPI, state: HierRulesState) {
	pi.on("session_start", async (_event, ctx) => {
		const ui = createPresenter(ctx, state.config);
		startNextQueuedMaintenance(ctx.cwd, "session-start", state.config, {
			onStarted: () => ui.maintainerStarted(),
			onQueued: (size) => ui.maintainerQueued(size),
			onFinished: (result) => ui.maintainerFinished(result),
		});
	});

	pi.on("agent_start", async (_event, ctx) => {
		state.fileActivityThisTurn = createTurnFileActivity();
		state.gitStatusAtTurnStart = getGitStatusSnapshot(ctx.cwd);
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		mergeTurnFileActivity(state.fileActivityThisTurn, fileActivityFromTool(ctx.cwd, event.toolName, event.input));
	});

	pi.on("agent_end", async (_event, ctx) => {
		mergeTurnFileActivity(state.fileActivityThisTurn, getGitStatusActivitySince(ctx.cwd, state.gitStatusAtTurnStart));
		const detectedFiles = allActivityPaths(state.fileActivityThisTurn);
		const { covered: changedFiles, patterns } = ruleCoveredChangedFiles(ctx.cwd, detectedFiles, state);
		const coveredSet = new Set(changedFiles);
		const metadata = {
			deletedFiles: deletedActivity(state.fileActivityThisTurn).map(({ path }) => path).filter((file) => coveredSet.has(file)),
			renamedFiles: renamedActivity(state.fileActivityThisTurn).filter((rename) => coveredSet.has(rename.fromPath) || coveredSet.has(rename.toPath)).map(({ fromPath, toPath }) => ({ fromPath, toPath })),
		};
		state.fileActivityThisTurn = createTurnFileActivity();
		state.gitStatusAtTurnStart = { files: new Set<string>(), activity: createTurnFileActivity() };
		if (detectedFiles.length === 0) {
			appendMaintainerLog(ctx.cwd, `[skip ${new Date().toISOString()}] agent_end: no changed files detected.`);
			return;
		}
		if (changedFiles.length === 0) {
			appendMaintainerLog(ctx.cwd, `[skip ${new Date().toISOString()}] agent_end: no rule-covered changed files. Detected: ${detectedFiles.join(", ")}. Rule patterns: ${patterns.join(", ") || "none"}.`);
			return;
		}

		const ui = createPresenter(ctx, state.config);
		startMaintenance(ctx.cwd, changedFiles, "agent_end", state.config, {
			onStarted: () => ui.maintainerStarted(),
			onQueued: (size) => ui.maintainerQueued(size),
			onFinished: (result) => ui.maintainerFinished(result),
		}, metadata);
	});
}
