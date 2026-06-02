export interface FeatureFlowUi {
  input(prompt: string, placeholder?: string): Promise<string | undefined>;
  select(prompt: string, options: string[]): Promise<string | undefined>;
  confirm(title: string, message: string): Promise<boolean>;
  setStatus(key: string, value: string | undefined): void;
  notify?: (message: string, level?: "info" | "warning" | "error") => void;
  setEditorText?: (text: string) => void;
  onTerminalInput?: (
    handler: (data: string) => { consume?: boolean; data?: string } | undefined,
  ) => () => void;
  setWorkingMessage?: (message?: string) => void;
  setWorkingVisible?: (visible: boolean) => void;
  setWorkingIndicator?: (options?: { frames?: string[]; intervalMs?: number }) => void;
}
