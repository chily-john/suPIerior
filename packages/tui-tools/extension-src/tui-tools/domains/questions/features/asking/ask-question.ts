import { formatAnswer } from "@/domains/questions/shared/helpers/format-answer";
import type {
  QuestionAnswer,
  QuestionDefinition,
} from "@/domains/questions/shared/models/question-definition";
import type { PiQuestionUi, PiWidgetComponent } from "./models/pi-question-ui";

const promptWidgetKey = "feature-flow-question";
const defaultLoadingMessage = "Thinking…";

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
      renderQuestionWidget(ui, promptWidgetKey, question.prompt, question.helpText);
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
    renderQuestionWidget(ui, promptWidgetKey, question.prompt, question.helpText);
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
  if (ui.setWidget && renderLoadingContext(loading, 80).length > 0) {
    ui.setWidget(widgetKey, () => new QuestionContextWidget(loading), {
      placement: "aboveEditor",
    });
  }

  ui.setWorkingIndicator?.();
  ui.setWorkingMessage?.(loading.message);
  ui.setWorkingVisible?.(true);

  const unsubscribe = ui.onTerminalInput?.(() => ({ consume: true }));
  return () => {
    unsubscribe?.();
    ui.setWidget?.(widgetKey, undefined);
    ui.setWorkingVisible?.(false);
    ui.setWorkingMessage?.();
    ui.setWorkingIndicator?.();
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

function renderQuestionWidget(
  ui: PiQuestionUi,
  key: string,
  prompt: string,
  helpText?: string,
): void {
  ui.setWidget?.(key, () => new QuestionPromptWidget(prompt, helpText), {
    placement: "aboveEditor",
  });
}

class QuestionPromptWidget implements PiWidgetComponent {
  constructor(
    private readonly prompt: string,
    private readonly helpText?: string,
  ) {}

  render(width: number): string[] {
    const lines = wrapPrompt(this.prompt, width);
    if (this.helpText) lines.push("", ...wrapPrompt(`Help: ${this.helpText}`, width));
    return lines;
  }

  invalidate(): void {
    // Stateless; nothing to invalidate.
  }
}

class QuestionContextWidget implements PiWidgetComponent {
  constructor(
    private readonly options: Required<Pick<QuestionLoadingOptions, "message">> &
      Omit<QuestionLoadingOptions, "message">,
  ) {}

  render(width: number): string[] {
    return renderLoadingContext(this.options, width);
  }

  invalidate(): void {
    // Stateless; nothing to invalidate.
  }
}

function normalizeLoadingOptions(
  options: QuestionLoadingOptions | string,
): Required<Pick<QuestionLoadingOptions, "message">> & Omit<QuestionLoadingOptions, "message"> {
  if (typeof options === "string") return { message: options };
  return { ...options, message: options.message ?? defaultLoadingMessage };
}

function renderLoadingContext(options: QuestionLoadingOptions, width: number): string[] {
  const prompt = typeof options.question === "string" ? options.question : options.question?.prompt;
  const lines = prompt ? wrapPrompt(prompt, width) : [];
  if (options.answer !== undefined) {
    if (lines.length > 0) lines.push("");
    lines.push(...wrapPrompt(`Answer: ${formatAnswer(options.answer)}`, width));
  }
  return lines;
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
  let current = "";

  for (const character of Array.from(word)) {
    if (current && visibleLength(current) + visibleLength(character) > size) {
      chunks.push(current);
      current = "";
    }
    current += character;
  }

  if (current) chunks.push(current);
  return chunks;
}

function visibleLength(value: string): number {
  return Array.from(stripAnsi(value)).reduce(
    (width, character) => width + characterWidth(character),
    0,
  );
}

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function characterWidth(character: string): number {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint === 0) return 0;
  if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0;
  if (isCombiningMark(codePoint)) return 0;
  return isWideCodePoint(codePoint) ? 2 : 1;
}

function isCombiningMark(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd))
  );
}
