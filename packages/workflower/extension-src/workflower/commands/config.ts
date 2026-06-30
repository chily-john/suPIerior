import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateConfig, type ModelConfig, type ValidationResult } from '../model-config';

const CONFIG_FILE_NAME = 'config.json';
const DEFAULT_WORKFLOWER_DIR = '.workflower';
const LEVEL_ORDER = ['tiny', 'small', 'medium', 'large', 'xl'] as const;
const VALID_FALLBACK_STRATEGIES = ['up', 'down', 'default'] as const;

function getConfigPath(cwd: string): string {
  const workflowerDir = process.env.WORKFLOWER_DIR || DEFAULT_WORKFLOWER_DIR;
  return path.resolve(cwd, workflowerDir, CONFIG_FILE_NAME);
}

function readConfig(cwd: string): ModelConfig | null {
  const configPath = getConfigPath(cwd);
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  const fileContent = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(fileContent) as unknown;
  
  return config as ModelConfig;
}

function writeConfig(cwd: string, config: ModelConfig): void {
  const configPath = getConfigPath(cwd);
  const configDir = path.dirname(configPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Context type for the config command handler
 * Includes interactive UI methods from Pi's ExtensionUIContext
 */
export type ConfigCommandContext = {
  cwd: string;
  ui: {
    notify: (message: string, level?: "info" | "warning" | "error") => void;
    select: (prompt: string, options: string[]) => Promise<string | undefined>;
    input: (prompt: string, placeholder?: string) => Promise<string | undefined>;
    confirm: (title: string, message: string) => Promise<boolean>;
    setStatus?: (key: string, text: string | undefined) => void;
  };
};

/**
 * Display the current configuration in a readable format
 */
function displayConfig(config: ModelConfig | null): string {
  if (!config) {
    return 'No configuration found. Config file does not exist.';
  }

  const lines: string[] = ['Current Workflower Configuration:', ''];
  
  if (config.modelLevels && Object.keys(config.modelLevels).length > 0) {
    lines.push('Model Levels:');
    for (const [level, models] of Object.entries(config.modelLevels)) {
      if (Array.isArray(models)) {
        lines.push(`  ${level}: [${models.join(', ')}]`);
      }
    }
    lines.push('');
  }

  if (config.defaultModel !== undefined) {
    lines.push(`Default Model: ${config.defaultModel}`);
  }

  if (config.fallbackStrategy !== undefined) {
    lines.push(`Fallback Strategy: ${config.fallbackStrategy}`);
  }

  return lines.join('\n');
}

/**
 * Create a new empty config
 */
function createEmptyConfig(): ModelConfig {
  return {
    modelLevels: {},
    defaultModel: '',
    fallbackStrategy: 'default',
  };
}

/**
 * Validate and save config
 */
function saveConfigWithValidation(cwd: string, config: ModelConfig, ctx: ConfigCommandContext): boolean {
  const validation = validateConfig(config);
  
  if (!validation.valid) {
    ctx.ui.notify(`Validation errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`, 'error');
    return false;
  }
  
  try {
    writeConfig(cwd, config);
    ctx.ui.notify('Configuration saved successfully!', 'info');
    return true;
  } catch (error) {
    ctx.ui.notify(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`, 'error');
    return false;
  }
}

/**
 * Main handler for the /wf config command
 * Implements interactive TUI for editing Workflower configuration
 */
export async function handleConfigCommand(args: string, ctx: ConfigCommandContext): Promise<void> {
  const configPath = getConfigPath(ctx.cwd);
  
  // Read current config
  let currentConfig = readConfig(ctx.cwd);
  
  // If no config exists, create an empty one
  if (!currentConfig) {
    currentConfig = createEmptyConfig();
    ctx.ui.notify('No configuration found. Starting with empty configuration.', 'info');
  }

  // Display current configuration
  ctx.ui.notify(displayConfig(currentConfig), 'info');

  // Main interactive menu loop
  let shouldExit = false;
  
  while (!shouldExit) {
    // Show menu options
    const mainMenuOptions = [
      'Edit model levels',
      'Edit default model',
      'Edit fallback strategy',
      'Save configuration',
      'Cancel',
    ];

    const selection = await ctx.ui.select('Configuration options:', mainMenuOptions);
    
    if (!selection) {
      // User cancelled the menu
      ctx.ui.notify('Configuration editing cancelled.', 'info');
      shouldExit = true;
      continue;
    }

    switch (selection) {
      case 'Edit model levels':
        currentConfig = await editModelLevels(currentConfig, ctx);
        ctx.ui.notify(displayConfig(currentConfig), 'info');
        break;

      case 'Edit default model':
        currentConfig = await editDefaultModel(currentConfig, ctx);
        ctx.ui.notify(displayConfig(currentConfig), 'info');
        break;

      case 'Edit fallback strategy':
        currentConfig = await editFallbackStrategy(currentConfig, ctx);
        ctx.ui.notify(displayConfig(currentConfig), 'info');
        break;

      case 'Save configuration':
        const saved = saveConfigWithValidation(ctx.cwd, currentConfig, ctx);
        if (saved) {
          ctx.ui.notify('Configuration saved successfully!', 'info');
        }
        // Don't exit after save - allow further edits
        break;

      case 'Cancel':
        ctx.ui.notify('Configuration editing cancelled. Changes not saved.', 'info');
        shouldExit = true;
        break;
    }
  }
}

/**
 * Edit model levels interactively
 */
async function editModelLevels(config: ModelConfig, ctx: ConfigCommandContext): Promise<ModelConfig> {
  const newConfig = { ...config };
  
  // Ensure modelLevels exists
  if (!newConfig.modelLevels) {
    newConfig.modelLevels = {};
  }

  const levelOptions = [
    ...Object.keys(newConfig.modelLevels),
    'Add new level',
    'Remove a level',
    'Back to main menu',
  ];

  const selection = await ctx.ui.select('Edit model levels:', levelOptions);
  
  if (!selection) {
    return config;
  }

  if (selection === 'Add new level') {
    const levelName = await ctx.ui.input('Enter new level name:', 'tiny');
    if (!levelName) {
      ctx.ui.notify('Level name is required.', 'warning');
      return config;
    }

    // Validate level name
    if (!LEVEL_ORDER.includes(levelName as typeof LEVEL_ORDER[number])) {
      ctx.ui.notify(`Invalid level name. Must be one of: ${LEVEL_ORDER.join(', ')}`, 'error');
      return config;
    }

    // Check if level already exists
    if (newConfig.modelLevels[levelName]) {
      ctx.ui.notify(`Level '${levelName}' already exists.`, 'warning');
      return config;
    }

    // Create new level with empty array
    newConfig.modelLevels[levelName] = [];
    ctx.ui.notify(`Added level '${levelName}'.`, 'info');
    
    // Offer to add models to the new level
    const addModel = await ctx.ui.confirm(
      'Add models to this level?',
      `Add models to level '${levelName}'`
    );
    
    if (addModel) {
      newConfig.modelLevels[levelName] = await editLevelModels(levelName, [], ctx);
    }
    
    return newConfig;
  }

  if (selection === 'Remove a level') {
    const levelsToRemove = Object.keys(newConfig.modelLevels);
    if (levelsToRemove.length === 0) {
      ctx.ui.notify('No levels to remove.', 'warning');
      return config;
    }

    const levelToRemove = await ctx.ui.select('Select level to remove:', levelsToRemove);
    if (levelToRemove) {
      delete newConfig.modelLevels[levelToRemove];
      ctx.ui.notify(`Removed level '${levelToRemove}'.`, 'info');
    }
    return newConfig;
  }

  // User selected an existing level
  if (levelOptions.includes(selection)) {
    const level = selection;
    const currentModels = newConfig.modelLevels[level] || [];
    newConfig.modelLevels[level] = await editLevelModels(level, currentModels, ctx);
  }

  return newConfig;
}

/**
 * Edit models for a specific level
 */
async function editLevelModels(
  level: string,
  currentModels: string[],
  ctx: ConfigCommandContext
): Promise<string[]> {
  let models = [...currentModels];
  let shouldExit = false;

  while (!shouldExit) {
    const modelOptions = [
      ...models,
      'Add model',
      'Remove a model',
      'Back to level menu',
    ];

    const selection = await ctx.ui.select(`Models for level '${level}':`, modelOptions);
    
    if (!selection) {
      shouldExit = true;
      continue;
    }

    if (selection === 'Add model') {
      const modelName = await ctx.ui.input('Enter model name:');
      if (modelName) {
        models.push(modelName);
        ctx.ui.notify(`Added model '${modelName}' to level '${level}'.`, 'info');
      }
    } else if (selection === 'Remove a model') {
      if (models.length === 0) {
        ctx.ui.notify('No models to remove.', 'warning');
        continue;
      }
      const modelToRemove = await ctx.ui.select('Select model to remove:', models);
      if (modelToRemove) {
        models = models.filter(m => m !== modelToRemove);
        ctx.ui.notify(`Removed model '${modelToRemove}' from level '${level}'.`, 'info');
      }
    } else if (selection === 'Back to level menu') {
      shouldExit = true;
    }
  }

  return models;
}

/**
 * Edit default model interactively
 */
async function editDefaultModel(config: ModelConfig, ctx: ConfigCommandContext): Promise<ModelConfig> {
  const newConfig = { ...config };
  
  const currentDefault = newConfig.defaultModel || '';
  const newDefault = await ctx.ui.input('Enter default model:', currentDefault);
  
  if (newDefault !== undefined) {
    newConfig.defaultModel = newDefault;
    ctx.ui.notify(`Default model set to '${newDefault}'.`, 'info');
  }
  
  return newConfig;
}

/**
 * Edit fallback strategy interactively
 */
async function editFallbackStrategy(config: ModelConfig, ctx: ConfigCommandContext): Promise<ModelConfig> {
  const newConfig = { ...config };
  
  const strategyOptions = ['up', 'down', 'default'];
  const currentStrategy = newConfig.fallbackStrategy || 'default';
  
  const newStrategy = await ctx.ui.select(
    'Select fallback strategy:',
    strategyOptions
  );
  
  if (newStrategy) {
    newConfig.fallbackStrategy = newStrategy;
    ctx.ui.notify(`Fallback strategy set to '${newStrategy}'.`, 'info');
  }
  
  return newConfig;
}
