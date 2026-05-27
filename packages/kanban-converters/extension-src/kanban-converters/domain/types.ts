export interface KanbanModelAdapter {
  complete(prompt: string): Promise<string>;
}

export interface KanbanConverterUi {
  confirm(title: string, message?: string): Promise<boolean>;
  notify?: (message: string, level?: "info" | "warning" | "error") => void;
}

export interface KanbanConverterContext {
  cwd: string;
  featureDir: string;
  featurePath: string;
  issuesPath?: string;
  modelAdapter: KanbanModelAdapter;
  ui: KanbanConverterUi;
  config?: unknown;
}

export interface KanbanConverterResult {
  issuesPath: string;
  published: boolean;
  createdUrls: string[];
  cleanedUp: boolean;
}

export interface KanbanConverter {
  id: string;
  convert(ctx: KanbanConverterContext): Promise<KanbanConverterResult>;
}
