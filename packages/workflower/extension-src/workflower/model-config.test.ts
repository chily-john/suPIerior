import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readConfig, validateConfig, getConfigPath } from './model-config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

describe('model-config', () => {
  const originalWorkflowerDir = process.env.WORKFLOWER_DIR;
  const testDir = path.join(__dirname, 'test-workflower');

  beforeEach(async () => {
    process.env.WORKFLOWER_DIR = testDir;
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    process.env.WORKFLOWER_DIR = originalWorkflowerDir;
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readConfig', () => {
    it('returns null when config file does not exist', async () => {
      expect(readConfig()).toBeNull();
    });

    it('reads and parses config file when it exists', async () => {
      const config = { modelLevels: {}, defaultModel: 'small', fallbackStrategy: 'up' };
      const configPath = getConfigPath();
      await fs.writeFile(configPath, JSON.stringify(config));
      
      expect(readConfig()).toEqual(config);
    });
  });

  describe('getConfigPath', () => {
    it('returns the correct path to config.json', () => {
      const expectedPath = path.join(testDir, 'config.json');
      expect(getConfigPath()).toBe(expectedPath);
    });
  });

  describe('validateConfig', () => {
    it('returns valid: true for a valid config', () => {
      const config = {
        modelLevels: {
          tiny: ['model1'],
          small: ['model2', 'model3'],
          medium: ['model4'],
          large: ['model5'],
          xl: ['model6'],
        },
        defaultModel: 'small',
        fallbackStrategy: 'up',
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates modelLevels structure', () => {
      const config = {
        modelLevels: {
          tiny: ['model1'],
          invalidLevel: ['model2'],
        },
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid level key: invalidLevel');
    });

    it('validates modelLevels values are arrays of strings', () => {
      const config = {
        modelLevels: {
          tiny: ['model1'],
          small: [123],
        },
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('modelLevels.small must be an array of strings');
    });

    it('validates defaultModel is a string', () => {
      const config = {
        defaultModel: 123,
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('defaultModel must be a string');
    });

    it('validates fallbackStrategy is valid', () => {
      const config = {
        fallbackStrategy: 'invalid',
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fallbackStrategy must be one of: up, down, default');
    });

    it('returns valid: true for empty config', () => {
      const result = validateConfig({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid: false for non-object config', () => {
      const result = validateConfig('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config must be an object');
    });
  });
});
