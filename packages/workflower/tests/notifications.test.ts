import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WorkflowNotificationUi } from '../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types';
import type { WorkflowDefinition, WorkflowStep } from '../extension-src/workflower/package-api/workflow-definition.types';
import type { ModelConfig, ModelResolution } from '../extension-src/workflower/model-resolver';

// Mock the model-config module
vi.mock('../extension-src/workflower/model-config', () => ({
  readConfig: vi.fn(),
  getConfigPath: vi.fn(),
}));

// Mock the model-resolver module - we need to mock the functions
import * as modelResolverModule from '../extension-src/workflower/model-resolver';

// Import the functions we're testing
import {
  applyWorkflowStepRuntimeSettings,
} from '../extension-src/workflower/package-api/workflow-runtime-settings';

import { readConfig } from '../extension-src/workflower/model-config';

describe('model resolution notification', () => {
  let mockUi: WorkflowNotificationUi;
  let mockConfig: ModelConfig;
  let mockResolveModelWithFallback: vi.Mock;
  let mockResolveModelWithFallbackAndMetadata: vi.Mock;
  let mockIsLevelName: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUi = {
      notify: vi.fn(),
    };

    mockConfig = {
      modelLevels: {
        medium: ['openai/gpt-4'],
        small: ['anthropic/claude-3'],
      },
      fallbackStrategy: 'down',
    };

    vi.mocked(readConfig).mockReturnValue(mockConfig);

    // Mock the model resolver functions
    mockIsLevelName = vi.fn((name: string) => 
      ['tiny', 'small', 'medium', 'large', 'xl'].includes(name)
    );
    
    mockResolveModelWithFallback = vi.fn((level: string | null, config: ModelConfig | null) => {
      if (level === 'medium') return 'openai/gpt-4';
      if (level === 'large') return null; // Will trigger fallback
      return null;
    });

    mockResolveModelWithFallbackAndMetadata = vi.fn((level: string | null, config: ModelConfig | null) => {
      if (level === 'medium') {
        return {
          result: 'openai/gpt-4',
          resolution: {
            requestedLevel: 'medium',
            resolvedModel: 'openai/gpt-4',
            usedFallback: false,
            finalLevel: 'medium',
          } as ModelResolution
        };
      }
      if (level === 'large') {
        return {
          result: 'openai/gpt-4',
          resolution: {
            requestedLevel: 'large',
            resolvedModel: 'openai/gpt-4',
            usedFallback: true,
            finalLevel: 'medium',
          } as ModelResolution
        };
      }
      if (level === null) {
        return {
          result: null,
          resolution: {
            requestedLevel: null,
            resolvedModel: null,
            usedFallback: false,
            finalLevel: null,
          } as ModelResolution
        };
      }
      return {
        result: null,
        resolution: {
          requestedLevel: level,
          resolvedModel: null,
          usedFallback: false,
          finalLevel: null,
        } as ModelResolution
      };
    });

    // Apply the mocks
    vi.spyOn(modelResolverModule, 'isLevelName').mockImplementation(mockIsLevelName);
    vi.spyOn(modelResolverModule, 'resolveModelWithFallback').mockImplementation(mockResolveModelWithFallback);
    vi.spyOn(modelResolverModule, 'resolveModelWithFallbackAndMetadata').mockImplementation(mockResolveModelWithFallbackAndMetadata);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Red/Green Phase - Model resolution notification', () => {
    it('model resolution notification shows resolved model', async () => {
      // Given a workflow with model: medium
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        model: 'medium',
        steps: [{ id: 'step-1', command: 'test' }],
      };

      const step: WorkflowStep = {
        id: 'step-1',
        command: 'test',
      };

      // Mock the pi and ctx
      const mockPi = {
        setModel: vi.fn().mockResolvedValue(true),
        getThinkingLevel: vi.fn().mockReturnValue('none'),
        setThinkingLevel: vi.fn(),
      };

      const mockCtx = {
        modelRegistry: {
          find: vi.fn().mockReturnValue({ provider: 'openai', id: 'gpt-4' }),
        },
        ui: mockUi,
        model: { provider: 'test', id: 'current-model' },
      };

      const settings = {
        workflow,
        step,
        runtimeDefaults: {},
      };

      // Call the actual function
      await applyWorkflowStepRuntimeSettings(mockPi as any, mockCtx as any, settings);

      // Then notification should be displayed
      expect(mockUi.notify).toHaveBeenCalledWith(
        expect.stringMatching(/Using model: openai\/gpt-4 \(requested: medium\)/),
        'info'
      );
    });

    it('notification shows default when no level requested', async () => {
      // Given a workflow without model field
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-2',
        steps: [{ id: 'step-1', command: 'test' }],
      };

      const step: WorkflowStep = {
        id: 'step-1',
        command: 'test',
      };

      // Mock the pi and ctx
      const mockPi = {
        setModel: vi.fn().mockResolvedValue(true),
        getThinkingLevel: vi.fn().mockReturnValue('none'),
        setThinkingLevel: vi.fn(),
      };

      const mockCtx = {
        modelRegistry: {
          find: vi.fn().mockReturnValue({ provider: 'openai', id: 'gpt-4' }),
        },
        ui: mockUi,
        model: { provider: 'test', id: 'current-model' },
      };

      const settings = {
        workflow,
        step,
        runtimeDefaults: { model: 'openai/gpt-4' },
      };

      await applyWorkflowStepRuntimeSettings(mockPi as any, mockCtx as any, settings);

      // Should show default notification
      expect(mockUi.notify).toHaveBeenCalledWith(
        expect.stringMatching(/Using model: openai\/gpt-4 \(default\)/),
        'info'
      );
    });

    it('notification shows fallback when used', async () => {
      // Given a workflow with model: large (which will fall back to medium)
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-3',
        model: 'large',
        steps: [{ id: 'step-1', command: 'test' }],
      };

      const step: WorkflowStep = {
        id: 'step-1',
        command: 'test',
      };

      // large doesn't exist, so it falls back to medium
      const mockPi = {
        setModel: vi.fn().mockResolvedValue(true),
        getThinkingLevel: vi.fn().mockReturnValue('none'),
        setThinkingLevel: vi.fn(),
      };

      const mockCtx = {
        modelRegistry: {
          find: vi.fn().mockReturnValue({ provider: 'openai', id: 'gpt-4' }),
        },
        ui: mockUi,
        model: { provider: 'test', id: 'current-model' },
      };

      const settings = {
        workflow,
        step,
        runtimeDefaults: {},
      };

      await applyWorkflowStepRuntimeSettings(mockPi as any, mockCtx as any, settings);

      // Should show fallback notification
      expect(mockUi.notify).toHaveBeenCalledWith(
        expect.stringMatching(/Using model: openai\/gpt-4.*fallback.*true/),
        'info'
      );
    });

    it('notification is only shown once per workflow', async () => {
      // Given a workflow with model: medium
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-4',
        model: 'medium',
        steps: [
          { id: 'step-1', command: 'test' },
          { id: 'step-2', command: 'test' },
        ],
      };

      const step1: WorkflowStep = {
        id: 'step-1',
        command: 'test',
      };

      const step2: WorkflowStep = {
        id: 'step-2',
        command: 'test',
      };

      const mockPi = {
        setModel: vi.fn().mockResolvedValue(true),
        getThinkingLevel: vi.fn().mockReturnValue('none'),
        setThinkingLevel: vi.fn(),
      };

      const mockCtx = {
        modelRegistry: {
          find: vi.fn().mockReturnValue({ provider: 'openai', id: 'gpt-4' }),
        },
        ui: mockUi,
        model: { provider: 'test', id: 'current-model' },
      };

      const settings1 = {
        workflow,
        step: step1,
        runtimeDefaults: {},
      };

      const settings2 = {
        workflow,
        step: step2,
        runtimeDefaults: {},
      };

      // First step should show notification
      await applyWorkflowStepRuntimeSettings(mockPi as any, mockCtx as any, settings1);
      
      // Second step should NOT show notification (same workflow)
      await applyWorkflowStepRuntimeSettings(mockPi as any, mockCtx as any, settings2);

      // Should only be called once
      expect(mockUi.notify).toHaveBeenCalledTimes(1);
      expect(mockUi.notify).toHaveBeenCalledWith(
        expect.stringMatching(/Using model: openai\/gpt-4 \(requested: medium\)/),
        'info'
      );
    });
  });
});
