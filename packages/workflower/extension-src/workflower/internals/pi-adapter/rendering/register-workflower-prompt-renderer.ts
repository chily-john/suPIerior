import type {
  ExtensionAPI,
  MessageRenderer,
  MessageRenderOptions,
} from "@mariozechner/pi-coding-agent";

const WORKFLOWER_PROMPT_TYPE = "workflower-prompt";
const DEFAULT_LABEL = "Workflower prompt";

type PromptDetailsRecord = Record<string, unknown>;

type StaticTextComponent = {
  render(width: number): string[];
  invalidate(): void;
};

export function registerWorkflowerPromptRenderer(pi: ExtensionAPI): void {
  pi.registerMessageRenderer(WORKFLOWER_PROMPT_TYPE, workflowerPromptRenderer);
}

export const workflowerPromptRenderer: MessageRenderer = (message, options) => {
  return createStaticTextComponent(renderWorkflowerPromptMessageText(message, options));
};

export function renderWorkflowerPromptMessageText(
  message: { details?: unknown },
  options: Partial<MessageRenderOptions> = {},
): string {
  const details = asPromptDetailsRecord(message.details);
  const label = stringField(details, "label") ?? DEFAULT_LABEL;

  if (!options.expanded || details === undefined) {
    return label;
  }

  const lines = [label];
  appendMetadataLine(lines, "Workflow id", stringField(details, "workflowId"));
  appendMetadataLine(lines, "Workflow name", stringField(details, "workflowName"));
  appendMetadataLine(lines, "Step id", stringField(details, "stepId"));
  appendMetadataLine(lines, "Step index", numberField(details, "stepIndex"));

  return lines.join("\n");
}

function createStaticTextComponent(text: string): StaticTextComponent {
  return {
    render: () => text.split("\n"),
    invalidate: () => undefined,
  };
}

function appendMetadataLine(lines: string[], name: string, value: string | undefined): void {
  if (value === undefined) return;
  lines.push(`${name}: ${value}`);
}

function asPromptDetailsRecord(details: unknown): PromptDetailsRecord | undefined {
  return typeof details === "object" && details !== null
    ? (details as PromptDetailsRecord)
    : undefined;
}

function stringField(details: PromptDetailsRecord | undefined, key: string): string | undefined {
  const value = details?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberField(details: PromptDetailsRecord | undefined, key: string): string | undefined {
  const value = details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}
