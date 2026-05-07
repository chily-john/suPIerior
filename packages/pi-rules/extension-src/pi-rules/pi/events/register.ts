import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { registerInjectionEvents } from "@pi/events/injection";
import { registerMaintainerEvents } from "@pi/events/maintainer";

export function registerEvents(pi: ExtensionAPI, state: HierRulesState) {
	registerInjectionEvents(pi, state);
	registerMaintainerEvents(pi, state);
}
