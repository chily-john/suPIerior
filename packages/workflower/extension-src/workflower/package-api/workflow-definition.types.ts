export type WorkflowThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export type WorkflowModelProvider =
  | "amazon-bedrock"
  | "anthropic"
  | "google"
  | "google-vertex"
  | "openai"
  | "azure-openai-responses"
  | "openai-codex"
  | "github-copilot"
  | "openrouter"
  | "vercel-ai-gateway"
  | "xai"
  | "groq"
  | "cerebras"
  | "deepseek"
  | "zai"
  | "mistral"
  | "minimax"
  | "moonshotai"
  | "huggingface"
  | "fireworks"
  | "opencode"
  | "kimi-coding"
  | "cloudflare-workers-ai"
  | "cloudflare-ai-gateway"
  | (string & {});

/**
 * Workflow model reference in Pi's canonical provider/model-id format.
 *
 * Use Pi's `/models` command to discover configured model ids, then prefix the
 * selected model id with its provider, e.g. `openai-codex/gpt-5.3-codex-spark`.
 */
export type WorkflowModelReference = `${WorkflowModelProvider}/${string}`;

/** Ordered model candidates. Item 0 is preferred; later items are fallbacks. */
export type WorkflowModelFallbacks = readonly [
  WorkflowModelReference,
  ...WorkflowModelReference[],
];

export type WorkflowModelSetting = WorkflowModelReference | WorkflowModelFallbacks;
export type WorkflowStepModel = WorkflowModelSetting;

export type WorkflowRuntimeDefaults = {
  model?: WorkflowModelReference;
  thinkingLevel?: WorkflowThinkingLevel;
};

export type WorkflowStep = {
  id: string;
  command: string;
  outputs?: string[];
  clearOnNext?: boolean;
  autoNext?: boolean;
  /**
   * Preferred model for this step, or ordered fallback candidates.
   * Step candidates are tried before workflow-level candidates and captured defaults.
   *
   * If no candidate can be selected, Workflower leaves Pi on the current/default
   * model and still starts the step.
   */
  model?: WorkflowModelSetting;
  thinkingLevel?: WorkflowThinkingLevel;
};

export type WorkflowDefinition = {
  id: string;
  /** Default model candidates for steps that do not specify their own model. */
  model?: WorkflowModelSetting;
  /** Default thinking level for steps that do not specify their own thinking level. */
  thinkingLevel?: WorkflowThinkingLevel;
  clearOnStart?: boolean;
  clearOnCompletion?: boolean;
  cleanupOnCompletion?: boolean;
  pollen?: string | string[];
  acceptPollen?: boolean;
  steps: WorkflowStep[];
};
