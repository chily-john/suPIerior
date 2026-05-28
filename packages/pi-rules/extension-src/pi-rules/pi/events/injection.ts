import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { formatInjectedContext, getRuleIndex, selectRules } from "@domain/rule-context";
import { createPresenter } from "@pi/ui/presenter";

export function registerInjectionEvents(pi: ExtensionAPI, state: HierRulesState) {
  pi.on("session_start", async (_event, ctx) => {
    getRuleIndex(ctx.cwd, state.ruleCache);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const index = getRuleIndex(ctx.cwd, state.ruleCache);
    state.lastSelection = selectRules(index, event.prompt, state.config);
    createPresenter(ctx, state.config).rulesSelected(state.lastSelection);
    const context = formatInjectedContext(state.lastSelection, state.config);
    if (!context) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${context}` };
  });
}
