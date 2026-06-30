import { describe, it, expect } from 'vitest';
import { resolveModel, resolveModelWithFallback, LEVEL_ORDER, type ModelConfig } from './model-resolver';

describe('resolveModel', () => {
  it('returns first model from level array', () => {
    const config = { modelLevels: { medium: ['model-a', 'model-b'] } } as ModelConfig;
    expect(resolveModel('medium', config)).toBe('model-a');
  });

  it('returns null if level is null', () => {
    const config = { modelLevels: { medium: ['model-a'] } } as ModelConfig;
    expect(resolveModel(null, config)).toBeNull();
  });

  it('returns null if level is undefined', () => {
    const config = { modelLevels: { medium: ['model-a'] } } as ModelConfig;
    expect(resolveModel(undefined as unknown as string | null, config)).toBeNull();
  });

  it('returns null if config is null', () => {
    expect(resolveModel('medium', null)).toBeNull();
  });

  it('returns null if config.modelLevels is null', () => {
    const config = { modelLevels: null } as unknown as ModelConfig;
    expect(resolveModel('medium', config)).toBeNull();
  });

  it('returns null if config.modelLevels is undefined', () => {
    const config = {} as ModelConfig;
    expect(resolveModel('medium', config)).toBeNull();
  });

  it('returns null if level does not exist in config', () => {
    const config = { modelLevels: { medium: ['model-a'] } } as ModelConfig;
    expect(resolveModel('small', config)).toBeNull();
  });

  it('returns null if level exists but array is empty', () => {
    const config = { modelLevels: { medium: [] } } as ModelConfig;
    expect(resolveModel('medium', config)).toBeNull();
  });
});

describe('LEVEL_ORDER', () => {
  it('exports LEVEL_ORDER constant', () => {
    expect(LEVEL_ORDER).toEqual(['tiny', 'small', 'medium', 'large', 'xl']);
  });
});

describe('resolveModelWithFallback', () => {
  it('resolveModelWithFallback with down strategy falls back to smaller level', () => {
    const config = {
      modelLevels: { medium: [], small: ['model-small'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBe('model-small');
  });

  it('returns first available model from requested level', () => {
    const config = {
      modelLevels: { medium: ['model-medium'], small: ['model-small'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBe('model-medium');
  });

  it('applies down strategy when level array is empty', () => {
    const config = {
      modelLevels: { large: [], medium: [], small: ['model-small'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBe('model-small');
  });

  it('applies down strategy when level does not exist', () => {
    const config = {
      modelLevels: { small: ['model-small'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBe('model-small');
  });

  it('down strategy tries next smaller level in LEVEL_ORDER', () => {
    const config = {
      modelLevels: { large: [], medium: ['model-medium'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBe('model-medium');
  });

  it('up strategy tries next larger level in LEVEL_ORDER', () => {
    const config = {
      modelLevels: { small: [], medium: ['model-medium'] },
      fallbackStrategy: 'up'
    } as ModelConfig;
    expect(resolveModelWithFallback('small', config)).toBe('model-medium');
  });

  it('up strategy falls back to larger levels', () => {
    const config = {
      modelLevels: { tiny: [], small: [], medium: ['model-medium'] },
      fallbackStrategy: 'up'
    } as ModelConfig;
    expect(resolveModelWithFallback('tiny', config)).toBe('model-medium');
  });

  it('default strategy returns defaultModel when it is a model ID', () => {
    const config = {
      modelLevels: { medium: [] },
      defaultModel: 'default-model-id',
      fallbackStrategy: 'default'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBe('default-model-id');
  });

  it('default strategy resolves defaultModel when it is a level name', () => {
    const config = {
      modelLevels: { medium: [], small: ['model-small'] },
      defaultModel: 'small',
      fallbackStrategy: 'default'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBe('model-small');
  });

  it('default strategy with level name defaultModel uses fallback if that level is empty', () => {
    const config = {
      modelLevels: { medium: [], small: [] },
      defaultModel: 'small',
      fallbackStrategy: 'default'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBeNull();
  });

  it('returns null if all fallback attempts fail', () => {
    const config = {
      modelLevels: { large: [], medium: [], small: [] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBeNull();
  });

  it('returns null if config is null', () => {
    expect(resolveModelWithFallback('medium', null)).toBeNull();
  });

  it('returns null if level is null', () => {
    const config = {
      modelLevels: { medium: ['model-medium'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback(null, config)).toBeNull();
  });

  it('defaults to down strategy when not specified', () => {
    const config = {
      modelLevels: { medium: [], small: ['model-small'] }
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBe('model-small');
  });

  it('prevents infinite loops with circular defaultModel references', () => {
    const config = {
      modelLevels: { medium: [] },
      defaultModel: 'medium',
      fallbackStrategy: 'default'
    } as ModelConfig;
    expect(resolveModelWithFallback('medium', config)).toBeNull();
  });

  it('default strategy with level name defaultModel uses fallback strategy recursively', () => {
    const config = {
      modelLevels: { large: [], medium: [] },
      defaultModel: 'medium',
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBeNull();
  });

  it('default strategy with level name defaultModel that has models returns model', () => {
    const config = {
      modelLevels: { large: [], medium: ['model-medium'] },
      defaultModel: 'medium',
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('large', config)).toBe('model-medium');
  });

  it('down strategy falls through multiple levels', () => {
    const config = {
      modelLevels: { xl: [], large: [], medium: [], small: [], tiny: ['model-tiny'] },
      fallbackStrategy: 'down'
    } as ModelConfig;
    expect(resolveModelWithFallback('xl', config)).toBe('model-tiny');
  });

  it('up strategy falls through multiple levels', () => {
    const config = {
      modelLevels: { tiny: [], small: [], medium: [], large: [], xl: ['model-xl'] },
      fallbackStrategy: 'up'
    } as ModelConfig;
    expect(resolveModelWithFallback('tiny', config)).toBe('model-xl');
  });
});
