import { describe, expect, it } from "vitest";
import { parseGitStatusPorcelain } from "@features/rule-maintenance/git";
import { allActivityPaths } from "@features/rule-maintenance/turn-activity";

const cwd = process.cwd();

describe("parseGitStatusPorcelain", () => {
	it("classifies deleted files from porcelain status", () => {
		const snapshot = parseGitStatusPorcelain(cwd, " D src/deleted.ts\nD  src/staged-deleted.ts\n");

		expect([...snapshot.files]).toEqual(["src/deleted.ts", "src/staged-deleted.ts"]);
		expect([...snapshot.activity.deleted.keys()]).toEqual(["src/deleted.ts", "src/staged-deleted.ts"]);
		expect(allActivityPaths(snapshot.activity)).toEqual(["src/deleted.ts", "src/staged-deleted.ts"]);
	});

	it("contributes both old and new paths for renames", () => {
		const snapshot = parseGitStatusPorcelain(cwd, "R  src/old.ts -> src/new.ts\n");

		expect([...snapshot.files]).toEqual(["src/old.ts", "src/new.ts"]);
		expect([...snapshot.activity.renamed.values()]).toEqual([
			{ fromPath: "src/old.ts", toPath: "src/new.ts", metadata: { source: "git-status" } },
		]);
		expect(allActivityPaths(snapshot.activity)).toEqual(["src/old.ts", "src/new.ts"]);
	});
});
