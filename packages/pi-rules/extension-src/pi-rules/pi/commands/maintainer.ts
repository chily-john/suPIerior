import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HierRulesState } from "@app/state";
import { normalizeProjectPath } from "@shared/paths";
import { createPresenter } from "@pi/ui/presenter";
import {
  formatMaintainerStatus,
  startMaintenance,
  startNextQueuedMaintenance,
  tailMaintenanceLog,
  terminateMaintainer,
} from "@features/rule-maintenance";

export function registerMaintainerCommands(pi: ExtensionAPI, state: HierRulesState) {
  pi.registerCommand("pi-rules:maintain", {
    description:
      "Manually run hidden rules maintenance instructions for .pi/rules in the background",
    handler: async (args, ctx) => {
      const ui = createPresenter(ctx, state.config);
      if (!ctx.isIdle()) {
        ui.warning("Agent is busy. Try again after the current turn finishes.");
        return;
      }
      const explicitFiles = args
        .split(/\s+/)
        .map((value) => normalizeProjectPath(ctx.cwd, value))
        .filter((value): value is string => Boolean(value));
      if (explicitFiles.length === 0) {
        ui.warning("Usage: /pi-rules:maintain <changed-file> [more-files...]");
        return;
      }
      startMaintenance(ctx.cwd, explicitFiles, "manual", state.config, {
        onStarted: () => ui.maintainerStarted(),
        onQueued: (size) => ui.maintainerQueued(size),
        onFinished: (result) => ui.maintainerFinished(result),
      });
    },
  });

  pi.registerCommand("pi-rules:maintainer-status", {
    description: "Show background rules maintainer process and queue status",
    handler: async (_args, ctx) =>
      createPresenter(ctx, state.config).info(formatMaintainerStatus(ctx.cwd, state.config)),
  });

  pi.registerCommand("pi-rules:maintainer-log", {
    description: "Show the tail of the background rules maintainer log",
    handler: async (_args, ctx) =>
      createPresenter(ctx, state.config).info(tailMaintenanceLog(ctx.cwd)),
  });

  pi.registerCommand("pi-rules:maintainer-kill", {
    description:
      "Terminate active background rules maintainers, clear active run state, and start queued batches if possible",
    handler: async (_args, ctx) => {
      const ui = createPresenter(ctx, state.config);
      ui.maintainerKilled(terminateMaintainer(ctx.cwd));
      startNextQueuedMaintenance(ctx.cwd, "queued-after-kill", state.config, {
        onStarted: () => ui.maintainerStarted(),
        onQueued: (size) => ui.maintainerQueued(size),
        onFinished: (result) => ui.maintainerFinished(result),
      });
    },
  });
}
