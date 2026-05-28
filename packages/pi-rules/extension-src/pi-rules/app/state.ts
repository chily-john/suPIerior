import type { HierRulesConfig } from "@app/config";
import { defaultConfig } from "@app/config";
import type { GitStatusSnapshot } from "@features/rule-maintenance/git";
import type { TurnFileActivity } from "@features/rule-maintenance/turn-activity";
import { createTurnFileActivity } from "@features/rule-maintenance/turn-activity";
import type { RuleIndex, Selection } from "@domain/rule-context";

export type HierRulesState = {
  config: HierRulesConfig;
  ruleCache: { current?: RuleIndex };
  lastSelection: Selection;
  fileActivityThisTurn: TurnFileActivity;
  gitStatusAtTurnStart: GitStatusSnapshot;
};

export function createHierRulesState(): HierRulesState {
  return {
    config: defaultConfig,
    ruleCache: {},
    lastSelection: { fullRules: [], parentSummaries: [], inventories: [], reason: "No turn yet" },
    fileActivityThisTurn: createTurnFileActivity(),
    gitStatusAtTurnStart: { files: new Set<string>(), activity: createTurnFileActivity() },
  };
}
