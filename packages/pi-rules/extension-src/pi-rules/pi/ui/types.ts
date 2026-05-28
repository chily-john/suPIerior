import type { ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import type { Selection } from "@domain/rule-context";

export type AnyContext = ExtensionContext | ExtensionCommandContext;
export type Level = "info" | "warning" | "error";

export type HierRulesPresenter = {
  rulesSelected(selection: Selection): void;
  info(message: string): void;
  warning(message: string): void;
  maintainerStarted(): void;
  maintainerQueued(queueSize: number): void;
  maintainerFinished(result: {
    ok: boolean;
    code?: number | null;
    error?: string;
    logPath: string;
    startedNext?: boolean;
  }): void;
  maintainerKilled(message: string): void;
};
