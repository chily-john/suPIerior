export type HierRulesConfig = {
	injection: {
		maxFullRules: number;
		maxParentSummaries: number;
		maxFullRuleChars: number;
	};
	maintainer: {
		lockMaxAgeMs: number;
		maxConcurrentRuns: number;
	};
	ui: {
		showRuleStatus: boolean;
		showMaintainerStatus: boolean;
	};
};

export const defaultConfig: HierRulesConfig = {
	injection: {
		maxFullRules: 1,
		maxParentSummaries: 3,
		maxFullRuleChars: 18_000,
	},
	maintainer: {
		lockMaxAgeMs: 60 * 1000,
		maxConcurrentRuns: 2,
	},
	ui: {
		showRuleStatus: true,
		showMaintainerStatus: true,
	},
};
