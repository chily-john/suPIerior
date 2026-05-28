import { describe, expect, it } from "vitest";
import {
  addChangedPath,
  addDeletedPath,
  addRenamedPath,
  allActivityPaths,
  createTurnFileActivity,
  mergeTurnFileActivity,
} from "@features/rule-maintenance/turn-activity";

describe("TurnFileActivity", () => {
  it("merges activity and deduplicates paths while preserving rename metadata", () => {
    const target = createTurnFileActivity();
    const source = createTurnFileActivity();
    addChangedPath(target, "src/foo.ts", { source: "tool", toolName: "edit" });
    addChangedPath(source, "src/foo.ts", { source: "git-status" });
    addDeletedPath(source, "src/deleted.ts", { source: "tool", toolName: "bash" });
    addRenamedPath(source, "src/old.ts", "src/new.ts", { source: "tool", toolName: "bash" });

    mergeTurnFileActivity(target, source);

    expect(allActivityPaths(target)).toEqual([
      "src/foo.ts",
      "src/deleted.ts",
      "src/old.ts",
      "src/new.ts",
    ]);
    expect([...target.renamed.values()]).toEqual([
      {
        fromPath: "src/old.ts",
        toPath: "src/new.ts",
        metadata: { source: "tool", toolName: "bash" },
      },
    ]);
  });
});
