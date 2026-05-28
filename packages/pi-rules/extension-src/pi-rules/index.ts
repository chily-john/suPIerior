import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createHierRulesState } from "@app/state";
import { registerCommands } from "@pi/commands/register";
import { registerEvents } from "@pi/events/register";
import { registerStatusTool } from "@pi/tools/status-tool";

export default function hierRules(pi: ExtensionAPI) {
  const state = createHierRulesState();
  registerEvents(pi, state);
  registerCommands(pi, state);
  registerStatusTool(pi, state);
}
