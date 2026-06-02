import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { runFeatureWorkflow } from "@app/workflow";
import { PiDiscoveryModelAdapter } from "@pi/pi-discovery-adapter";

export function registerFeatureCommand(pi: ExtensionAPI): void {
  pi.registerCommand("feature", {
    description: "Discover and write a .pi/features/<slug>/feature.md artifact",
    handler: async (args, ctx) => {
      if (!ctx.isIdle()) {
        ctx.ui.notify("Feature workflow can only start while the agent is idle.", "warning");
        return;
      }
      if (!ctx.model) {
        throw new Error(
          "Feature-flow requires an active Pi model. Select/configure a model with /model or /login, then retry /feature.",
        );
      }

      await runFeatureWorkflow(args, {
        cwd: ctx.cwd,
        hasUI: ctx.hasUI,
        ui: ctx.ui,
        createDiscoveryModelAdapter: () =>
          new PiDiscoveryModelAdapter(
            ctx.model!,
            ctx.modelRegistry,
            pi.getThinkingLevel(),
            ctx.getSystemPrompt(),
          ),
      });
    },
  });
}
