import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const skill = readFileSync(
  new URL("../skills/workflower-authoring/SKILL.md", import.meta.url),
  "utf8",
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const combined = `${skill}\n${readme}`;

function includes(text, expected, message = `Expected documentation to include ${expected}`) {
  assert.ok(text.includes(expected), message);
}

function excludes(text, forbidden, message = `Expected documentation not to include ${forbidden}`) {
  assert.ok(!text.includes(forbidden), message);
}

includes(
  skill,
  "Workflow ids must be folder-safe and match `^[a-z0-9_-]+$`",
  "skill must require folder-safe workflow ids",
);
includes(
  skill,
  "/wf:<workflow-id> <garden-name>",
  "skill must show the initial garden start command form",
);
includes(skill, "/wf:<next-workflow-id>", "skill must show active handoff without a garden name");
includes(
  skill,
  ".pi/workflows/<garden-name>/0001-<workflow-id>/",
  "skill must show garden/flower artifact paths",
);
includes(
  skill,
  ".pi/workflows/<garden-name>/0001-<workflow-id>/index.json",
  "skill must explain flower index path",
);
includes(
  skill,
  "pollen?: string | string[]",
  "skill must show workflow-level pollen configuration",
);
includes(
  skill,
  "acceptPollen?: boolean",
  "skill must show workflow-level acceptPollen configuration",
);
includes(
  skill,
  "Cleanup waits until the whole garden completes",
  "skill must explain final garden cleanup timing",
);

includes(
  readme,
  "/wf:<workflow-id> <garden-name>",
  "README must document initial garden start command",
);
includes(readme, "/wf:<next-workflow-id>", "README must document active handoff command");
includes(
  readme,
  ".pi/workflows/<garden-name>/0001-<workflow-id>/",
  "README must document garden/flower artifact paths",
);
includes(readme, "pollen` and `acceptPollen`", "README must mention pollen guidance");

excludes(
  combined,
  "/wf:<workflow-id> <workflow-name>",
  "docs must not use old workflow-name command form",
);
excludes(
  combined,
  ".pi/workflows/<workflow-id>/<workflow-name>/",
  "docs must not use old workflow-id/workflow-name artifact path",
);
excludes(combined, "github:issue", "docs must not use colon-separated workflow id examples");

console.log("workflower-authoring documentation guidance checks passed");
