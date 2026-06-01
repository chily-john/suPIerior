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
  screen(width: number): string;
  clearEvents(): void;
}

export function createQuestionUiHarness(options: QuestionUiHarnessOptions = {}): QuestionUiHarness {
  const recordedEvents: string[] = [];
  let editorText = options.editorText ?? "";
  let terminalHandler:
    | ((data: string) => { consume?: boolean; data?: string } | undefined)
    | undefined;
  const statuses = new Map<string, string>();
  const aboveEditorWidgets = new Map<string, string[] | PiWidgetFactory>();
  let workingMessage: string | undefined;
  let workingVisible = false;

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
      if (value === undefined) statuses.delete(key);
      else statuses.set(key, value);
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
        aboveEditorWidgets.delete(key);
        record(`setWidget ${key} cleared`);
        return;
      }
      const placement = widgetOptions?.placement ?? "default";
      if (placement === "aboveEditor") aboveEditorWidgets.set(key, content);
      const rendered = renderWidgetContent(content, 80);
      record(`setWidget ${key} ${placement} ${describeRenderedContent(content, rendered)}`);
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
      record("working:indicator");
    },
    setWorkingMessage: (message) => {
      workingMessage = message;
      record(`working:message ${message ?? "default"}`);
    },
    setWorkingVisible: (visible) => {
      workingVisible = visible;
      record(`working:visible ${visible}`);
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
    screen: (width) =>
      renderScreen({
        aboveEditorWidgets,
        editorText,
        statuses,
        width,
        workingMessage,
        workingVisible,
      }),
    clearEvents: () => {
      recordedEvents.length = 0;
    },
  };
}

function renderScreen({
  aboveEditorWidgets,
  editorText,
  statuses,
  width,
  workingMessage,
  workingVisible,
}: {
  aboveEditorWidgets: Map<string, string[] | PiWidgetFactory>;
  editorText: string;
  statuses: Map<string, string>;
  width: number;
  workingMessage: string | undefined;
  workingVisible: boolean;
}): string {
  const sections: string[] = [];

  const aboveEditor = Array.from(aboveEditorWidgets.values()).flatMap((content) =>
    renderWidgetContent(content, width),
  );
  if (aboveEditor.length > 0) sections.push(["Above editor:", ...aboveEditor].join("\n"));
  if (editorText) sections.push(["Editor:", editorText].join("\n"));

  const statusLines = Array.from(statuses.entries()).map(([key, value]) => `${key}: ${value}`);
  if (statusLines.length > 0) sections.push(["Status:", ...statusLines].join("\n"));
  if (workingVisible) sections.push(["Working:", workingMessage ?? "default"].join("\n"));

  return sections.join("\n\n");
}

function describeRenderedContent(content: string[] | PiWidgetFactory, rendered: string[]): string {
  if (Array.isArray(content)) return `lines:${rendered.join(" | ")}`;
  return `widget:${rendered.join(" | ")}`;
}

function renderWidgetContent(content: string[] | PiWidgetFactory, width: number): string[] {
  if (Array.isArray(content)) return content;

  const widget = content({}, {});
  const rendered = widget.render(width);
  widget.dispose?.();
  return rendered;
}
