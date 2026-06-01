import type {
  PiQuestionUi,
  PiWidgetFactory,
} from "../../extension-src/tui-tools/domains/questions/features/asking";

export interface QuestionUiHarnessOptions {
  editorText?: string;
}

export interface QuestionUiHarness {
  ui: PiQuestionUi;
  enter(): { consume?: boolean; data?: string } | undefined;
  input(data: string): { consume?: boolean; data?: string } | undefined;
  events(): string[];
  timelineText(): string;
  clearEvents(): void;
}

export function createQuestionUiHarness(options: QuestionUiHarnessOptions = {}): QuestionUiHarness {
  const recordedEvents: string[] = [];
  let editorText = options.editorText ?? "";
  let terminalHandler:
    | ((data: string) => { consume?: boolean; data?: string } | undefined)
    | undefined;

  const record = (event: string): void => {
    recordedEvents.push(event);
  };

  const ui: PiQuestionUi = {
    input: async (prompt, placeholder) => {
      record(`input prompt=${prompt} placeholder=${placeholder ?? ""}`);
      return editorText || undefined;
    },
    select: async (prompt, choices) => {
      record(`select prompt=${prompt} options=${choices.join(",")}`);
      return undefined;
    },
    confirm: async (title, message) => {
      record(`confirm title=${title} message=${message}`);
      return true;
    },
    setStatus: (key, value) => {
      record(`setStatus ${key}=${value ?? "cleared"}`);
    },
    setEditorText: (text) => {
      editorText = text;
      record(`setEditorText ${text}`);
    },
    getEditorText: () => {
      record(`getEditorText ${editorText}`);
      return editorText;
    },
    setWidget: (key, content, widgetOptions) => {
      if (content === undefined) {
        record(`setWidget ${key} cleared`);
        return;
      }
      const placement = widgetOptions?.placement ?? "default";
      record(`setWidget ${key} ${placement} ${describeWidgetContent(content)}`);
    },
    onTerminalInput: (handler) => {
      terminalHandler = handler;
      record("onTerminalInput subscribe");
      return () => {
        terminalHandler = undefined;
        record("onTerminalInput unsubscribe");
      };
    },
    setWorkingIndicator: () => {
      record("setWorkingIndicator");
    },
    setWorkingMessage: (message) => {
      record(`setWorkingMessage ${message ?? "default"}`);
    },
    setWorkingVisible: (visible) => {
      record(`setWorkingVisible ${visible}`);
    },
  };

  const sendInput = (data: string): { consume?: boolean; data?: string } | undefined => {
    const result = terminalHandler?.(data);
    const displayData = data === "\r" ? "\\r" : data === "\n" ? "\\n" : data;
    record(
      `terminalInput ${displayData}${result?.consume === undefined ? "" : ` consume=${result.consume}`}`,
    );
    return result;
  };

  return {
    ui,
    enter: () => sendInput("\r"),
    input: sendInput,
    events: () => [...recordedEvents],
    timelineText: () => recordedEvents.map((event, index) => `${index + 1}. ${event}`).join("\n"),
    clearEvents: () => {
      recordedEvents.length = 0;
    },
  };
}

function describeWidgetContent(content: string[] | PiWidgetFactory): string {
  if (Array.isArray(content)) return `lines:${content.join(" | ")}`;

  const widget = content({}, {});
  const rendered = widget.render(80);
  widget.dispose?.();
  return `widget:${rendered.join(" | ")}`;
}
