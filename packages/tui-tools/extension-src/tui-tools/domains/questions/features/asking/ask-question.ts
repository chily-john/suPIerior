import { formatAnswer } from "@/domains/questions/shared/helpers/format-answer";
import type {
  QuestionAnswer,
  QuestionDefinition,
} from "@/domains/questions/shared/models/question-definition";
import type { PiQuestionUi, PiWidgetComponent } from "./models/pi-question-ui";

const promptWidgetKey = "feature-flow-question";
const defaultLoadingMessage = "Thinking…";
const defaultLoaderFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const defaultLoaderIntervalMs = 80;

export interface QuestionLoadingOptions {
  message?: string;
  question?: QuestionDefinition | string;
  answer?: QuestionAnswer;
  widgetKey?: string;
}

export async function askQuestion(
  ui: PiQuestionUi,
  question: QuestionDefinition,
): Promise<QuestionAnswer> {
  if (question.helpText) ui.setStatus("feature-flow-help", question.helpText);
  try {
    if (question.kind === "confirm")
      return ui.confirm(question.prompt, question.helpText ?? question.prompt);
    if (question.kind === "choice") {
      const choice = await ui.select(
        question.prompt,
        (question.options ?? []).map((option) => option.value),
      );
      return choice ?? String(question.defaultValue ?? "");
    }
    if (question.kind === "multi-choice") {
      renderQuestionWidget(ui, promptWidgetKey, question.prompt);
      const value = await askText(
        ui,
        "Feature discovery answer (comma-separated)",
        `${question.prompt} (comma-separated)`,
        Array.isArray(question.defaultValue) ? question.defaultValue.join(", ") : undefined,
      );
      return (value ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    renderQuestionWidget(ui, promptWidgetKey, question.prompt);
    return (
      (await askText(
        ui,
        "Feature discovery answer",
        question.prompt,
        typeof question.defaultValue === "string" ? question.defaultValue : undefined,
      )) ?? ""
    );
  } finally {
    ui.setWidget?.(promptWidgetKey, undefined);
    ui.setStatus("feature-flow-help", undefined);
  }
}

export function beginQuestionLoading(
  ui: PiQuestionUi,
  options: QuestionLoadingOptions | string = defaultLoadingMessage,
): () => void {
  const loading = normalizeLoadingOptions(options);
  ui.setEditorText?.("");

  const widgetKey = loading.widgetKey ?? promptWidgetKey;
  if (ui.setWidget) {
    ui.setWidget(
      widgetKey,
      (tui, theme) => new QuestionLoadingWidget(loading, tui, theme),
      { placement: "aboveEditor" },
    );
  } else {
    ui.setWorkingIndicator?.();
    ui.setWorkingMessage?.(loading.message);
    ui.setWorkingVisible?.(true);
  }

  const unsubscribe = ui.onTerminalInput?.(() => ({ consume: true }));
  return () => {
    unsubscribe?.();
    if (ui.setWidget) {
      ui.setWidget(widgetKey, undefined);
    } else {
      ui.setWorkingVisible?.(false);
      ui.setWorkingMessage?.();
      ui.setWorkingIndicator?.();
    }
  };
}

async function askText(
  ui: PiQuestionUi,
  _editorTitle: string,
  inputTitle: string,
  prefill: string | undefined,
): Promise<string | undefined> {
  const { getEditorText, setEditorText, onTerminalInput } = ui;
  if (getEditorText && setEditorText && onTerminalInput) {
    return askInlineEditor({ getEditorText, setEditorText, onTerminalInput }, prefill);
  }
  if (ui.editor) return ui.editor("", prefill);
  return ui.input("", prefill ?? inputTitle);
}

async function askInlineEditor(
  ui: {
    getEditorText: () => string;
    setEditorText: (text: string) => void;
    onTerminalInput: NonNullable<PiQuestionUi["onTerminalInput"]>;
  },
  prefill: string | undefined,
): Promise<string | undefined> {
  ui.setEditorText(prefill ?? "");

  return new Promise((resolve) => {
    let unsubscribe: (() => void) | undefined;
    const finish = (value: string | undefined): void => {
      unsubscribe?.();
      ui.setEditorText("");
      resolve(value);
    };

    unsubscribe = ui.onTerminalInput((data) => {
      if (data === "\r" || data === "\n") {
        const answer = ui.getEditorText();
        finish(answer);
        return { consume: true };
      }
      if (data === "\x03" || data === "\x1b") {
        finish(undefined);
        return { consume: true };
      }
      return undefined;
    });
  });
}

function renderQuestionWidget(ui: PiQuestionUi, key: string, prompt: string): void {
  ui.setWidget?.(key, () => new QuestionPromptWidget(prompt), {
    placement: "aboveEditor",
  });
}

class QuestionPromptWidget implements PiWidgetComponent {
  constructor(private readonly prompt: string) {}

  render(width: number): string[] {
    return wrapPrompt(this.prompt, width);
  }

  invalidate(): void {
    // Stateless; nothing to invalidate.
  }
}

class QuestionLoadingWidget implements PiWidgetComponent {
  private frameIndex = 0;
  private readonly intervalId: ReturnType<typeof setInterval> | undefined;
  private readonly requestRender: (() => void) | undefined;
  private readonly colorAccent: (value: string) => string;
  private readonly colorMuted: (value: string) => string;

  constructor(
    private readonly options: Required<Pick<QuestionLoadingOptions, "message">> &
      Omit<QuestionLoadingOptions, "message">,
    tui: unknown,
    theme: unknown,
  ) {
    this.requestRender = getRequestRender(tui);
    this.colorAccent = getThemeColor(theme, "accent");
    this.colorMuted = getThemeColor(theme, "muted");
    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % defaultLoaderFrames.length;
      this.requestRender?.();
    }, defaultLoaderIntervalMs);
  }

  render(width: number): string[] {
    const lines = renderLoadingContext(this.options, width);
    const frame = defaultLoaderFrames[this.frameIndex] ?? "";
    return [
      ...lines,
      ...(lines.length > 0 ? [""] : []),
      "",
      `${this.colorAccent(frame)} ${this.colorMuted(this.options.message)}`,
    ];
  }

  invalidate(): void {
    // The interval asks the TUI to re-render as the loader advances.
  }

  dispose(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

function normalizeLoadingOptions(
  options: QuestionLoadingOptions | string,
): Required<Pick<QuestionLoadingOptions, "message">> & Omit<QuestionLoadingOptions, "message"> {
  if (typeof options === "string") return { message: options };
  return { ...options, message: options.message ?? defaultLoadingMessage };
}

function renderLoadingContext(
  options: QuestionLoadingOptions,
  width: number,
): string[] {
  const prompt = typeof options.question === "string" ? options.question : options.question?.prompt;
  const lines = prompt ? wrapPrompt(prompt, width) : [];
  if (options.answer !== undefined) lines.push("", `Answer: ${formatAnswer(options.answer)}`);
  return lines;
}

function getRequestRender(tui: unknown): (() => void) | undefined {
  return typeof tui === "object" && tui !== null && "requestRender" in tui
    ? (tui as { requestRender?: () => void }).requestRender
    : undefined;
}

function getThemeColor(theme: unknown, key: "accent" | "muted"): (value: string) => string {
  if (typeof theme === "object" && theme !== null && "fg" in theme) {
    const fg = (theme as { fg?: (color: string, value: string) => string }).fg;
    if (typeof fg === "function") return (value) => fg(key, value);
  }
  return (value) => value;
}

function wrapPrompt(prompt: string, width: number): string[] {
  const availableWidth = Math.max(1, width - 2);
  return prompt.split("\n").flatMap((line) => wrapLine(line, availableWidth));
}

function wrapLine(line: string, width: number): string[] {
  if (!line) return [""];

  const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
  const words = line.trimStart().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [leadingWhitespace.slice(0, width)];

  const lines: string[] = [];
  let current = leadingWhitespace;

  for (const word of words) {
    const separator = current.trim().length > 0 ? " " : "";
    if (visibleLength(current) + separator.length + visibleLength(word) <= width) {
      current += `${separator}${word}`;
      continue;
    }

    if (current.trim().length > 0) lines.push(current);
    current = leadingWhitespace;

    if (visibleLength(current) + visibleLength(word) <= width) {
      current += word;
      continue;
    }

    const chunks = chunkLongWord(word, Math.max(1, width - visibleLength(leadingWhitespace)));
    lines.push(...chunks.slice(0, -1).map((chunk) => `${leadingWhitespace}${chunk}`));
    current = `${leadingWhitespace}${chunks.at(-1) ?? ""}`;
  }

  if (current.length > 0) lines.push(current);
  return lines;
}

function chunkLongWord(word: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < word.length; index += size) {
    chunks.push(word.slice(index, index + size));
  }
  return chunks;
}

function visibleLength(value: string): number {
  return value.length;
}
