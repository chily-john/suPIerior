import * as path from "node:path";

import type { HierRulesConfig } from "@app/config";
import { AnyContext, HierRulesPresenter, Level } from "@pi/ui/types";

export function createPresenter(ctx: AnyContext, config: HierRulesConfig): HierRulesPresenter {
  const notify = (message: string, level: Level) => ctx.ui.notify(message, level);
  const setMaintainerStatus = (status: string | undefined) => {
    if (config.ui.showMaintainerStatus) ctx.ui.setStatus("pi-rules-maintainer", status);
  };
  const clearMaintainerStatusSoon = (delayMs: number) => {
    const timer = setTimeout(() => setMaintainerStatus(undefined), delayMs);
    timer.unref?.();
  };

  return {
    rulesSelected(selection) {
      if (!config.ui.showRuleStatus) return;
      const ruleNames = selection.fullRules.map((rule) => path.basename(rule.relativePath, ".md"));
      ctx.ui.setStatus(
        "pi-rules",
        ruleNames.length > 0 ? `Rules: ${ruleNames.join(",")}` : "Rules: none",
      );
    },
    info(message) {
      notify(message, "info");
    },
    warning(message) {
      notify(message, "warning");
    },
    maintainerStarted() {
      setMaintainerStatus("Maintainer: running");
    },
    maintainerQueued(queueSize) {
      notify(
        `Hier-rules maintainer is already running; queued this batch (${queueSize} pending).`,
        "info",
      );
    },
    maintainerFinished(result) {
      if (result.startedNext) return;
      if (result.ok) {
        setMaintainerStatus("Maintainer: done");
        clearMaintainerStatusSoon(5_000);
        notify("Hier-rules background maintenance finished.", "info");
      } else {
        setMaintainerStatus("Maintainer: error");
        clearMaintainerStatusSoon(15_000);
        notify(`Hier-rules maintainer failed. See ${result.logPath}`, "warning");
      }
    },
    maintainerKilled(message) {
      setMaintainerStatus(undefined);
      notify(message, "warning");
    },
  };
}
