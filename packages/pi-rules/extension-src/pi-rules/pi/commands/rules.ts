import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { createPresenter } from "@pi/ui/presenter";
import { formatStatus, formatSelection } from "@domain/rule-context";

export function registerRuleCommands(pi: ExtensionAPI, state: HierRulesState) {
  pi.registerCommand("pi-rules:init", {
    description: "Bootstrap AGENTS.md and .pi/rules using the init-advanced skill",
    handler: async (args, ctx) => {
      const ui = createPresenter(ctx, state.config);
      if (!ctx.isIdle()) {
        ui.warning("Agent is busy. Try again after the current turn finishes.");
        return;
      }
      pi.sendUserMessage(`/skill:init-advanced${args.trim() ? ` ${args.trim()}` : ""}`);
    },
  });

  pi.registerCommand("pi-rules:status", {
    description: "Show AGENTS.md and .pi/rules discovery status",
    handler: async (_args, ctx) =>
      createPresenter(ctx, state.config).info(formatStatus(ctx.cwd, state.ruleCache)),
  });

  pi.registerCommand("pi-rules:context", {
    description: "Show which .pi/rules context was injected for the last turn",
    handler: async (_args, ctx) =>
      createPresenter(ctx, state.config).info(formatSelection(state.lastSelection)),
  });
}
