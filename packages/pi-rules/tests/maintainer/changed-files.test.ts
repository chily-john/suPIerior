import { describe, expect, it } from "vitest";
import { fileActivityFromTool } from "@features/rule-maintenance/changed-files";
import { allActivityPaths } from "@features/rule-maintenance/turn-activity";

const cwd = process.cwd();

describe("fileActivityFromTool", () => {
	it("detects write and edit tool path inputs as changed paths", () => {
		expect([...fileActivityFromTool(cwd, "write", { path: "src/new.ts" }).changed.keys()]).toEqual(["src/new.ts"]);
		expect([...fileActivityFromTool(cwd, "functions.edit", { path: "src/existing.ts" }).changed.keys()]).toEqual(["src/existing.ts"]);
	});

	it("detects bash removal and rename activity", () => {
		const activity = fileActivityFromTool(cwd, "bash", { command: "rm -f src/deleted.ts\nmv src/old.ts src/new.ts" });

		expect([...activity.deleted.keys()]).toEqual(["src/deleted.ts"]);
		expect([...activity.renamed.values()]).toEqual([
			{ fromPath: "src/old.ts", toPath: "src/new.ts", metadata: { source: "tool", toolName: "bash" } },
		]);
		expect(allActivityPaths(activity)).toEqual(["src/deleted.ts", "src/old.ts", "src/new.ts"]);
	});

	it("ignores paths outside the project and .pi paths", () => {
		const activity = fileActivityFromTool(cwd, "write", { path: ".pi/rules/rules.md" });

		expect(allActivityPaths(activity)).toEqual([]);
	});
});
