import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { registerRuleCommands } from "@pi/commands/rules";
import { registerMaintainerCommands } from "@pi/commands/maintainer";

export function registerCommands(pi: ExtensionAPI, state: HierRulesState) {
	registerRuleCommands(pi, state);
	registerMaintainerCommands(pi, state);
}
