import type {
  QuestionAnswer,
  QuestionDefinition,
} from "@/domains/questions/shared/models/question-definition";
import type { PiQuestionUi, PiWidgetComponent } from "./models/pi-question-ui";

export async function askQuestion(
  ui: PiQuestionUi,
  question: QuestionDefinition,
): Promise<QuestionAnswer> {
  const promptWidgetKey = "feature-flow-question";
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

export function beginQuestionLoading(ui: PiQuestionUi, message = "Thinking…"): () => void {
  ui.setEditorText?.("");
  ui.setWorkingIndicator?.();
  ui.setWorkingMessage?.(message);
  ui.setWorkingVisible?.(true);
  const unsubscribe = ui.onTerminalInput?.(() => ({ consume: true }));
  return () => {
    unsubscribe?.();
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
