export type RuleKind = "rules" | "inventory" | "other";

export type RuleFile = {
  path: string;
  relativePath: string;
  kind: RuleKind;
  paths: string[];
  summary: string;
  triggers: string[];
  title: string;
  content: string;
  mtimeMs: number;
  size: number;
};

export type RuleIndex = {
  cwd: string;
  rulesDir: string;
  rules: RuleFile[];
  signature: string;
};
