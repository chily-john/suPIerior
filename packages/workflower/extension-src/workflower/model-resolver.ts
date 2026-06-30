export interface ModelConfig {
  modelLevels?: Record<string, string[]>;
  defaultModel?: string;
  fallbackStrategy?: string;
}

export interface ModelResolution {
  requestedLevel: string | null;
  resolvedModel: string | null;
  usedFallback: boolean;
  finalLevel: string | null;
}

export const LEVEL_ORDER = ["tiny", "small", "medium", "large", "xl"] as const;

export function isLevelName(name: string): boolean {
  return LEVEL_ORDER.includes(name as (typeof LEVEL_ORDER)[number]);
}

export function getLevelIndex(level: string): number | null {
  const index = LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);
  return index >= 0 ? index : null;
}

export function resolveModel(level: string | null, config: ModelConfig | null): string | null {
  // If level is null or undefined, return null
  if (level === null || level === undefined) {
    return null;
  }

  // If config is null, return null
  if (config === null) {
    return null;
  }

  // If config.modelLevels is null or undefined, return null
  if (config.modelLevels === null || config.modelLevels === undefined) {
    return null;
  }

  // If level doesn't exist in config.modelLevels, return null
  if (!(level in config.modelLevels)) {
    return null;
  }

  // If level exists but array is empty, return null
  const models = config.modelLevels[level];
  if (models === null || models === undefined || models.length === 0) {
    return null;
  }

  // Return the first element of the level's array
  return models[0];
}

export function resolveModelWithFallback(
  level: string | null,
  config: ModelConfig | null,
  visited: Set<string> = new Set(),
): string | null {
  // Prevent infinite loops
  if (level !== null && visited.has(level)) {
    return null;
  }
  if (level !== null) {
    visited.add(level);
  }

  // Step 1: Call resolveModel first
  const result = resolveModel(level, config);

  // Step 2: If result is not null, return it
  if (result !== null) {
    return result;
  }

  // Step 3: If result is null and config is null, return null
  if (config === null) {
    return null;
  }

  // Step 4: Determine fallback strategy from config.fallbackStrategy (default to 'down' if not set)
  const fallbackStrategy = config.fallbackStrategy || "down";

  // Step 5: For "down" strategy
  if (fallbackStrategy === "down") {
    const currentIndex = getLevelIndex(level || "");
    if (currentIndex === null) {
      return null;
    }

    // Iterate downward through LEVEL_ORDER (from current index - 1 to 0)
    for (let i = currentIndex - 1; i >= 0; i--) {
      const fallbackLevel = LEVEL_ORDER[i];
      const fallbackResult = resolveModelWithFallback(fallbackLevel, config, new Set(visited));
      if (fallbackResult !== null) {
        return fallbackResult;
      }
    }
    return null;
  }

  // Step 6: For "up" strategy
  if (fallbackStrategy === "up") {
    const currentIndex = getLevelIndex(level || "");
    if (currentIndex === null) {
      return null;
    }

    // Iterate upward through LEVEL_ORDER (from current index + 1 to end)
    for (let i = currentIndex + 1; i < LEVEL_ORDER.length; i++) {
      const fallbackLevel = LEVEL_ORDER[i];
      const fallbackResult = resolveModelWithFallback(fallbackLevel, config, new Set(visited));
      if (fallbackResult !== null) {
        return fallbackResult;
      }
    }
    return null;
  }

  // Step 7: For "default" strategy
  if (fallbackStrategy === "default") {
    const defaultModel = config.defaultModel;

    if (defaultModel === undefined || defaultModel === null) {
      return null;
    }

    // If defaultModel is a level name, resolve it with its own fallback
    if (isLevelName(defaultModel)) {
      return resolveModelWithFallback(defaultModel, config, new Set(visited));
    }

    // If defaultModel is a model ID, return it directly
    return defaultModel;
  }

  // Step 8: Return null if all attempts fail
  return null;
}

export function resolveModelWithFallbackAndMetadata(
  level: string | null,
  config: ModelConfig | null,
  visited: Set<string> = new Set(),
): { result: string | null; resolution: ModelResolution } {
  // Prevent infinite loops
  if (level !== null && visited.has(level)) {
    return {
      result: null,
      resolution: {
        requestedLevel: level,
        resolvedModel: null,
        usedFallback: false,
        finalLevel: null,
      },
    };
  }
  if (level !== null) {
    visited.add(level);
  }

  const requestedLevel = level;
  let usedFallback = false;
  let finalLevel: string | null = level;

  // Step 1: Call resolveModel first
  const result = resolveModel(level, config);

  // Step 2: If result is not null, return it
  if (result !== null) {
    return {
      result,
      resolution: { requestedLevel, resolvedModel: result, usedFallback: false, finalLevel },
    };
  }

  // Step 3: If result is null and config is null, return null
  if (config === null) {
    return {
      result: null,
      resolution: { requestedLevel, resolvedModel: null, usedFallback: false, finalLevel: null },
    };
  }

  // Step 4: Determine fallback strategy from config.fallbackStrategy (default to 'down' if not set)
  const fallbackStrategy = config.fallbackStrategy || "down";
  usedFallback = true;

  // Step 5: For "down" strategy
  if (fallbackStrategy === "down") {
    const currentIndex = getLevelIndex(level || "");
    if (currentIndex === null) {
      return {
        result: null,
        resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
      };
    }

    // Iterate downward through LEVEL_ORDER (from current index - 1 to 0)
    for (let i = currentIndex - 1; i >= 0; i--) {
      const fallbackLevel = LEVEL_ORDER[i];
      const fallbackResult = resolveModelWithFallbackAndMetadata(
        fallbackLevel,
        config,
        new Set(visited),
      );
      if (fallbackResult.result !== null) {
        return {
          result: fallbackResult.result,
          resolution: {
            requestedLevel,
            resolvedModel: fallbackResult.result,
            usedFallback: true,
            finalLevel: fallbackLevel,
          },
        };
      }
    }
    return {
      result: null,
      resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
    };
  }

  // Step 6: For "up" strategy
  if (fallbackStrategy === "up") {
    const currentIndex = getLevelIndex(level || "");
    if (currentIndex === null) {
      return {
        result: null,
        resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
      };
    }

    // Iterate upward through LEVEL_ORDER (from current index + 1 to end)
    for (let i = currentIndex + 1; i < LEVEL_ORDER.length; i++) {
      const fallbackLevel = LEVEL_ORDER[i];
      const fallbackResult = resolveModelWithFallbackAndMetadata(
        fallbackLevel,
        config,
        new Set(visited),
      );
      if (fallbackResult.result !== null) {
        return {
          result: fallbackResult.result,
          resolution: {
            requestedLevel,
            resolvedModel: fallbackResult.result,
            usedFallback: true,
            finalLevel: fallbackLevel,
          },
        };
      }
    }
    return {
      result: null,
      resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
    };
  }

  // Step 7: For "default" strategy
  if (fallbackStrategy === "default") {
    const defaultModel = config.defaultModel;

    if (defaultModel === undefined || defaultModel === null) {
      return {
        result: null,
        resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
      };
    }

    // If defaultModel is a level name, resolve it with its own fallback
    if (isLevelName(defaultModel)) {
      const fallbackResult = resolveModelWithFallbackAndMetadata(
        defaultModel,
        config,
        new Set(visited),
      );
      return {
        result: fallbackResult.result,
        resolution: {
          requestedLevel,
          resolvedModel: fallbackResult.result,
          usedFallback: true,
          finalLevel: defaultModel,
        },
      };
    }

    // If defaultModel is a model ID, return it directly
    return {
      result: defaultModel,
      resolution: {
        requestedLevel,
        resolvedModel: defaultModel,
        usedFallback: true,
        finalLevel: null,
      },
    };
  }

  // Step 8: Return null if all attempts fail
  return {
    result: null,
    resolution: { requestedLevel, resolvedModel: null, usedFallback: true, finalLevel: null },
  };
}
