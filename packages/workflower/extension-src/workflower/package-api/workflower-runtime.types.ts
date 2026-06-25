import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type {
  GardenStateGetResult,
  GardenStateListResult,
  GardenStateSetResult,
  JsonValue,
} from "./garden-state.types";
import type { RuntimeSettingsContext } from "./workflow-runtime-settings";
import type { WorkflowCommandContext } from "@orchestration/runtime/use-cases/start/start.types";
import type { WorkflowHandoffUseCaseResult } from "@orchestration/runtime/use-cases/handoff/handoff-workflow-by-id";

export type WorkflowerRuntimeContext = WorkflowCommandContext & RuntimeSettingsContext;

export type WorkflowerRuntimeOptions = {
  sendUserMessage?: (prompt: string) => Promise<void> | void;
};

export type WorkflowerRuntime = {
  state: {
    get(key: string): Promise<GardenStateGetResult>;
    getValue(key: string): Promise<JsonValue | undefined>;
    set(key: string, value: JsonValue): Promise<GardenStateSetResult>;
    list(): Promise<GardenStateListResult>;
  };

  handoff(workflowId: string): Promise<WorkflowHandoffUseCaseResult>;
};

export type CreateWorkflowerRuntime = (
  pi: ExtensionAPI,
  ctx: WorkflowerRuntimeContext,
  options?: WorkflowerRuntimeOptions,
) => WorkflowerRuntime;

export type { WorkflowHandoffUseCaseResult };
