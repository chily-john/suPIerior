export type WorkflowerStepCommandResolution =
  | { kind: "private-skill-prompt"; content: string }
  | { kind: "private-command-prompt"; content: string }
  | { kind: "private-command-none" };
