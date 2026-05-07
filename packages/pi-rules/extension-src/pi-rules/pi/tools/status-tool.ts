import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import type { HierRulesState } from "@app/state";
import { formatStatus, getRuleIndex } from "@domain/rule-context";

export function registerStatusTool(pi: ExtensionAPI, state: HierRulesState) {
	pi.registerTool({
		name: "hier_rules_status",
		label: "Hier Rules Status",
		description: "Inspect AGENTS.md and .pi/rules discovery status. Use only when the user asks about pi-rules status or injected rules are missing/ambiguous; do not call before normal code edits.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			const index = getRuleIndex(ctx.cwd, state.ruleCache);
			return {
				content: [{ type: "text", text: formatStatus(ctx.cwd, state.ruleCache) }],
				details: { rules: index.rules.map(({ content, ...rule }) => rule) },
			};
		},
	});
}
