import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// Import the functions to test
import {
  collectModelCandidates,
  normalizeModelReferences,
} from "./package-api/workflow-runtime-settings";
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowRuntimeDefaults,
} from "./package-api/workflow-definition.types";
import type { WorkflowStepRuntimeSettings } from "./internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types";
import type { ModelConfig } from "./model-resolver";

// Mock the model-config module
vi.mock("./model-config", () => ({
  readConfig: vi.fn(),
  getConfigPath: vi.fn(),
}));

// Mock the model-resolver module - we need the actual functions for some tests
import * as modelResolver from "./model-resolver";

// Import the mocked readConfig
import { readConfig } from "./model-config";

describe("step-executor - model resolution integration", () => {
  const originalWorkflowerDir = process.env.WORKFLOWER_DIR;

  beforeEach(() => {
    process.env.WORKFLOWER_DIR = originalWorkflowerDir;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.WORKFLOWER_DIR = originalWorkflowerDir;
    vi.restoreAllMocks();
  });

  describe("Red/Green Phase - Model resolution with level names", () => {
    it("workflow with model: medium uses resolved model from config", () => {
      // Given config with medium: ['model-medium-1']
      const mockConfig: ModelConfig = {
        modelLevels: {
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "medium",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      // When workflow has model: medium
      const candidates = collectModelCandidates(settings);

      // Then step uses model-medium-1
      expect(candidates).toContain("model-medium-1");
    });

    it("step model: small overrides workflow model: medium", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          small: ["model-small-1"],
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "medium",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
        model: "small",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Step model should be tried first, so model-small-1 should appear before model-medium-1
      expect(candidates).toContain("model-small-1");
      expect(candidates).toContain("model-medium-1");
      expect(candidates.indexOf("model-small-1")).toBeLessThan(
        candidates.indexOf("model-medium-1"),
      );
    });

    it("non-level name model field is ignored and falls back to defaults", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "anthropic/claude-3",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Non-level name should be ignored, falling back to runtime defaults
      expect(candidates).not.toContain("anthropic/claude-3");
      expect(candidates).toContain("openai/gpt-4");
    });

    it("non-level model string is ignored and falls back to user model", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "provider/model-old",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Non-level model string should be ignored, falling back to user model
      expect(candidates).not.toContain("provider/model-old");
      expect(candidates).toContain("openai/gpt-4");
    });

    it("if resolution returns null, uses original reference", () => {
      // Config with empty array for large level, no fallback levels with models
      const mockConfig: ModelConfig = {
        modelLevels: {
          large: [],
          medium: [],
          small: [],
          tiny: [],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "large",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Should use original reference 'large' since resolution returns null
      // and runtime defaults
      expect(candidates).toContain("large");
      expect(candidates).toContain("openai/gpt-4");
    });

    it("if no config file exists, uses original references", () => {
      // No config
      vi.mocked(readConfig).mockReturnValue(null);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "medium",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Should use original references since config is null
      expect(candidates).toContain("medium");
      expect(candidates).toContain("openai/gpt-4");
    });

    it("existing workflows without model field continue to work", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // Should use runtime defaults
      expect(candidates).toContain("openai/gpt-4");
    });

    it("handles fallback strategies - down strategy", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          large: [],
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "down",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "large",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // With down strategy, large should fall back to medium
      expect(candidates).toContain("model-medium-1");
    });

    it("handles fallback strategies - up strategy", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          small: [],
          medium: ["model-medium-1"],
        },
        fallbackStrategy: "up",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "small",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // With up strategy, small should fall back to medium
      expect(candidates).toContain("model-medium-1");
    });

    it("handles fallback strategies - default strategy with level name", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          large: [],
          small: ["model-small-1"],
        },
        defaultModel: "small",
        fallbackStrategy: "default",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "large",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // With default strategy and level name defaultModel, should resolve to model-small-1
      expect(candidates).toContain("model-small-1");
    });

    it("handles fallback strategies - default strategy with model ID", () => {
      const mockConfig: ModelConfig = {
        modelLevels: {
          large: [],
        },
        defaultModel: "direct-model-id",
        fallbackStrategy: "default",
      };
      vi.mocked(readConfig).mockReturnValue(mockConfig);

      const workflow: WorkflowDefinition = {
        id: "test-workflow",
        model: "large",
        steps: [],
      };

      const step: WorkflowStep = {
        id: "step-1",
        command: "test",
      };

      const runtimeDefaults: WorkflowRuntimeDefaults = {
        model: "openai/gpt-4",
      };

      const settings: WorkflowStepRuntimeSettings = {
        workflow,
        step,
        runtimeDefaults,
      };

      const candidates = collectModelCandidates(settings);

      // With default strategy and model ID defaultModel, should use direct-model-id
      expect(candidates).toContain("direct-model-id");
    });
  });

  describe("normalizeModelReferences", () => {
    it("returns empty array for undefined model setting", () => {
      expect(normalizeModelReferences(undefined)).toEqual([]);
    });

    it("returns array with single string for string model setting", () => {
      expect(normalizeModelReferences("openai/gpt-4")).toEqual(["openai/gpt-4"]);
    });

    it("returns array for array model setting", () => {
      expect(normalizeModelReferences(["openai/gpt-4", "anthropic/claude-3"])).toEqual([
        "openai/gpt-4",
        "anthropic/claude-3",
      ]);
    });
  });
});
