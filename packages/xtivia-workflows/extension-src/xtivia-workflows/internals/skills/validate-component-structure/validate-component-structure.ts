/**
 * Validate Component Structure Skill
 *
 * Validates that component directories follow the required structure convention.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFiles: string[];
}

export interface ValidateComponentStructureOptions {
  path: string;
  requireTypes?: boolean;
  requireParts?: boolean;
  quiet?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ValidateComponentStructureOptions, "path">> = {
  requireTypes: false,
  requireParts: false,
  quiet: false,
};

/**
 * Validates a component directory structure
 *
 * @param options - Validation options including component path
 * @returns Validation result with errors, warnings, and missing files
 */
export function validateComponentStructure(
  options: ValidateComponentStructureOptions,
): ValidationResult {
  const {
    path: componentPath,
    requireTypes,
    requireParts,
    quiet,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const resolvedPath = resolve(componentPath);
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFiles: string[] = [];

  // Check if directory exists
  if (!existsSync(resolvedPath)) {
    return {
      isValid: false,
      errors: [`Component directory does not exist: ${resolvedPath}`],
      warnings: [],
      missingFiles: [],
    };
  }

  // Check if it's a directory
  if (!statSync(resolvedPath).isDirectory()) {
    return {
      isValid: false,
      errors: [`Path is not a directory: ${resolvedPath}`],
      warnings: [],
      missingFiles: [],
    };
  }

  // Read directory contents
  let files;
  try {
    files = readdirSync(resolvedPath, { withFileTypes: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      errors: [`Cannot read directory: ${resolvedPath} - ${errorMessage}`],
      warnings: [],
      missingFiles: [],
    };
  }

  const fileNames = files.map((f) => f.name);
  const dirNames = files.filter((f) => f.isDirectory()).map((f) => f.name);

  // Check for Component.tsx or Component.jsx
  const hasComponentFile =
    fileNames.includes("Component.tsx") || fileNames.includes("Component.jsx");
  if (!hasComponentFile) {
    errors.push("Missing Component.tsx or Component.jsx");
    missingFiles.push("Component.tsx");
  }

  // Check for index.ts (required)
  const hasIndexFile = fileNames.includes("index.ts");
  if (!hasIndexFile) {
    errors.push("Missing index.ts");
    missingFiles.push("index.ts");
  }

  // Check for component.types.ts
  const hasTypesFile = fileNames.includes("component.types.ts");
  if (requireTypes && !hasTypesFile) {
    errors.push("Missing component.types.ts");
    missingFiles.push("component.types.ts");
  } else if (!requireTypes && !hasTypesFile) {
    warnings.push("Missing component.types.ts (recommended)");
  }

  // Check for parts directory
  const hasPartsDir = dirNames.includes("parts");
  if (requireParts && !hasPartsDir) {
    errors.push("Missing parts/ directory");
    missingFiles.push("parts/");
  } else if (!requireParts && hasPartsDir) {
    // Validate parts directory structure
    const partsPath = resolve(resolvedPath, "parts");
    try {
      const partsFiles = readdirSync(partsPath, { withFileTypes: true });
      const partsFileNames = partsFiles.map((f) => f.name);

      if (partsFileNames.length === 0) {
        warnings.push("parts/ directory is empty");
      } else {
        const hasPartsIndex = partsFileNames.includes("index.ts");
        if (!hasPartsIndex) {
          warnings.push("parts/ directory missing index.ts (recommended)");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`Cannot read parts/ directory: ${errorMessage}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingFiles,
  };
}

/**
 * Validates multiple component directories
 *
 * @param paths - Array of component directory paths
 * @param options - Validation options (applied to all paths)
 * @returns Map of component paths to their validation results
 */
export function validateMultipleComponents(
  paths: string[],
  options: Omit<ValidateComponentStructureOptions, "path"> = {},
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const path of paths) {
    const result = validateComponentStructure({ path, ...options });
    results.set(path, result);
  }

  return results;
}

/**
 * Checks if all components in a directory follow the structure convention
 *
 * @param componentsDir - Directory containing component subdirectories
 * @param options - Validation options
 * @returns Combined validation result for all components
 */
export function validateComponentsDirectory(
  componentsDir: string,
  options: Omit<ValidateComponentStructureOptions, "path"> = {},
): ValidationResult & { componentResults: Map<string, ValidationResult> } {
  const resolvedDir = resolve(componentsDir);
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allMissingFiles: string[] = [];
  const componentResults = new Map<string, ValidationResult>();

  if (!existsSync(resolvedDir)) {
    return {
      isValid: false,
      errors: [`Components directory does not exist: ${resolvedDir}`],
      warnings: [],
      missingFiles: [],
      componentResults,
    };
  }

  try {
    const componentDirs = readdirSync(resolvedDir, { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .map((f) => resolve(resolvedDir, f.name));

    for (const componentDir of componentDirs) {
      const result = validateComponentStructure({ path: componentDir, ...options });
      componentResults.set(componentDir, result);

      if (!result.isValid) {
        allErrors.push(...result.errors.map((e) => `${componentDir}: ${e}`));
        allMissingFiles.push(...result.missingFiles.map((f) => `${componentDir}/${f}`));
      }
      allWarnings.push(...result.warnings.map((w) => `${componentDir}: ${w}`));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      errors: [`Cannot read components directory: ${resolvedDir} - ${errorMessage}`],
      warnings: [],
      missingFiles: [],
      componentResults,
    };
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    missingFiles: allMissingFiles,
    componentResults,
  };
}
