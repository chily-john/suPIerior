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
  ".workflower/workflows/<garden-name>/0001-<workflow-id>/",
  "skill must show garden/flower artifact paths",
);
includes(
  skill,
  ".workflower/workflows/<garden-name>/0001-<workflow-id>/index.json",
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
includes(skill, "garden state", "skill must teach garden state guidance");
includes(
  skill,
  "workflower_state_set",
  "skill must tell authors to document state-setting tool calls",
);
includes(
  skill,
  "deterministic routing",
  "skill must teach deterministic routing for state-driven branches",
);
includes(
  skill,
  "Do not rely on assistant text to invoke",
  "skill must warn against printed slash-command routing",
);
includes(
  skill,
  "Do not rely on visible transcript content to verify full private skill injection",
  "skill must warn against using visible transcript content to verify private skill injection",
);
includes(
  skill,
  "The model still receives the full kickoff prompt",
  "skill must explain compact display still sends the full kickoff prompt",
);
includes(
  skill,
  "This is not a token-saving feature",
  "skill must explain compact display is not token saving",
);
includes(
  skill,
  "Autonomous workflow movement should call `workflower_handoff`",
  "skill must point autonomous movement at the handoff tool",
);
includes(
  skill,
  "output files for large artifacts",
  "skill must direct large artifacts to files instead of garden state",
);

includes(
  readme,
  "/wf:<workflow-id> <garden-name>",
  "README must document initial garden start command",
);
includes(readme, "/wf:<next-workflow-id>", "README must document active handoff command");
includes(
  readme,
  ".workflower/workflows/<garden-name>/0001-<workflow-id>/",
  "README must document garden/flower artifact paths",
);
includes(readme, "pollen` and `acceptPollen`", "README must mention pollen guidance");
includes(readme, "workflower_state_set", "README must mention state-setting guidance");
includes(readme, "deterministic router", "README must mention deterministic routing guidance");

excludes(
  combined,
  "/wf:<workflow-id> <workflow-name>",
  "docs must not use old workflow-name command form",
);
excludes(
  combined,
  ".workflower/workflows/<workflow-id>/<workflow-name>/",
  "docs must not use old workflow-id/workflow-name artifact path",
);
excludes(combined, "github:issue", "docs must not use colon-separated workflow id examples");

console.log("workflower-authoring documentation guidance checks passed");
