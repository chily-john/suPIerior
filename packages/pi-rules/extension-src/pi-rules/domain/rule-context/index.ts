export { getRuleIndex, buildRuleIndex } from "@domain/rule-context/discovery/indexer";
export { formatStatus } from "@domain/rule-context/discovery/report";
export type { RuleFile, RuleIndex } from "@domain/rule-context/discovery/model";

export { selectRules, formatSelection } from "@domain/rule-context/routing/selector";
export type { Selection } from "@domain/rule-context/routing/selector";
export { pathMatchesPattern, pathMatchesPatternScope, extractPathMentions } from "@domain/rule-context/routing/globs";

export { formatInjectedContext } from "@domain/rule-context/injection/prompt";
