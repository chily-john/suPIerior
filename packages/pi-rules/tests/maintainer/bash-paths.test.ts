import { describe, expect, it } from "vitest";
import { extractBashFileActivity } from "@features/rule-maintenance/bash-paths";
import { allActivityPaths, renamedActivity } from "@features/rule-maintenance/turn-activity";

const cwd = process.cwd();

describe("extractBashFileActivity", () => {
  it("detects literal rm operands as deleted paths", () => {
    const activity = extractBashFileActivity(cwd, "rm -f src/foo.ts");

    expect([...activity.deleted.keys()]).toEqual(["src/foo.ts"]);
    expect(allActivityPaths(activity)).toEqual(["src/foo.ts"]);
  });

  it("detects one deleted path per multiline rm command", () => {
    const activity = extractBashFileActivity(
      cwd,
      "rm -f src/foo.ts\nrm -f \\\n\t\"src/bar.ts\" 'src/baz.ts'",
    );

    expect([...activity.deleted.keys()]).toEqual(["src/foo.ts", "src/bar.ts", "src/baz.ts"]);
  });

  it("detects recursive directory removal", () => {
    const activity = extractBashFileActivity(cwd, "rm -rf src/old-dir");

    expect([...activity.deleted.keys()]).toEqual(["src/old-dir"]);
  });

  it("detects simple moves as rename activity with both paths", () => {
    const activity = extractBashFileActivity(cwd, "mv src/old.ts src/new.ts");

    expect(renamedActivity(activity)).toEqual([
      {
        fromPath: "src/old.ts",
        toPath: "src/new.ts",
        metadata: { source: "tool", toolName: "bash" },
      },
    ]);
    expect(allActivityPaths(activity)).toEqual(["src/old.ts", "src/new.ts"]);
  });

  it("ignores non-literal operands conservatively", () => {
    const activity = extractBashFileActivity(cwd, "rm -f $TARGET src/*.ts `pwd`/file.ts");

    expect(allActivityPaths(activity)).toEqual([]);
  });
});
