export interface PiWidgetComponent {
  render(width: number): string[];
  invalidate(): void;
  handleInput?(data: string): void;
}

export type PiWidgetFactory = (tui: unknown, theme: unknown) => PiWidgetComponent & {
  dispose?(): void;
};

export interface PiQuestionUi {
  input(prompt: string, placeholder?: string): Promise<string | undefined>;
  select(prompt: string, options: string[]): Promise<string | undefined>;
  confirm(title: string, message: string): Promise<boolean>;
  setStatus(key: string, value: string | undefined): void;
  editor?: (title: string, prefill?: string) => Promise<string | undefined>;
  setWidget?: {
    (
      key: string,
      content: string[] | undefined,
      options?: { placement?: "aboveEditor" | "belowEditor" },
    ): void;
    (
      key: string,
      content: PiWidgetFactory | undefined,
      options?: { placement?: "aboveEditor" | "belowEditor" },
    ): void;
  };
  setEditorText?: (text: string) => void;
  getEditorText?: () => string;
  onTerminalInput?: (
    handler: (data: string) => { consume?: boolean; data?: string } | undefined,
  ) => () => void;
  setWorkingMessage?: (message?: string) => void;
  setWorkingVisible?: (visible: boolean) => void;
  setWorkingIndicator?: (options?: { frames?: string[]; intervalMs?: number }) => void;
}
