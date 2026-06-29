#!/usr/bin/env node

/**
 * Component Directory Structure Validation Script
 * 
 * Validates that component directories follow the required structure convention.
 * 
 * Usage: node validate-component-structure.js --path <component-path> [options]
 * 
 * Options:
 *   --path <path>           Required: Path to the component directory
 *   --requireTypes <bool>   Require component.types.ts (default: false)
 *   --requireParts <bool>   Require parts/ directory (default: false)
 *   --fix                  Auto-create missing files (future)
 *   --json                 Output results as JSON
 */

import { parseArgs } from 'node:util';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { cwd } from 'node:process';

function printError(message) {
  console.error(`[ERROR] ${message}`);
}

function printWarning(message) {
  console.warn(`[WARN] ${message}`);
}

function printSuccess(message) {
  console.log(`[OK] ${message}`);
}

function printInfo(message) {
  console.log(`[INFO] ${message}`);
}

/**
 * Validates a component directory structure
 */
function validateComponentStructure(componentPath, options = {}) {
  const { requireTypes = false, requireParts = false, quiet = false } = options;
  const resolvedPath = resolve(componentPath);
  const errors = [];
  const warnings = [];
  const missingFiles = [];

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
    return {
      isValid: false,
      errors: [`Cannot read directory: ${resolvedPath} - ${error.message}`],
      warnings: [],
      missingFiles: [],
    };
  }

  const fileNames = files.map((f) => f.name);
  const dirNames = files.filter((f) => f.isDirectory()).map((f) => f.name);

  // Check for Component.tsx or Component.jsx
  const hasComponentFile = fileNames.includes('Component.tsx') || fileNames.includes('Component.jsx');
  if (!hasComponentFile) {
    errors.push('Missing Component.tsx or Component.jsx');
    missingFiles.push('Component.tsx');
  } else if (!quiet) {
    printSuccess('Component.tsx or Component.jsx found');
  }

  // Check for index.ts (required)
  const hasIndexFile = fileNames.includes('index.ts');
  if (!hasIndexFile) {
    errors.push('Missing index.ts');
    missingFiles.push('index.ts');
  } else if (!quiet) {
    printSuccess('index.ts found');
  }

  // Check for component.types.ts
  const hasTypesFile = fileNames.includes('component.types.ts');
  if (requireTypes && !hasTypesFile) {
    errors.push('Missing component.types.ts');
    missingFiles.push('component.types.ts');
  } else if (!requireTypes && !hasTypesFile) {
    warnings.push('Missing component.types.ts (recommended)');
    if (!quiet) printWarning('component.types.ts is recommended but not required');
  } else if (hasTypesFile && !quiet) {
    printSuccess('component.types.ts found');
  }

  // Check for parts directory
  const hasPartsDir = dirNames.includes('parts');
  if (requireParts && !hasPartsDir) {
    errors.push('Missing parts/ directory');
    missingFiles.push('parts/');
  } else if (!requireParts && hasPartsDir) {
    // Validate parts directory structure
    const partsPath = resolve(resolvedPath, 'parts');
    try {
      const partsFiles = readdirSync(partsPath, { withFileTypes: true });
      const partsFileNames = partsFiles.map((f) => f.name);
      
      if (partsFileNames.length === 0) {
        warnings.push('parts/ directory is empty');
        if (!quiet) printWarning('parts/ directory is empty');
      } else {
        const hasPartsIndex = partsFileNames.includes('index.ts');
        if (!hasPartsIndex) {
          warnings.push('parts/ directory missing index.ts (recommended)');
          if (!quiet) printWarning('parts/ directory missing index.ts (recommended)');
        } else if (!quiet) {
          printSuccess('parts/index.ts found');
        }
        
        if (!quiet) printSuccess(`parts/ directory contains ${partsFileNames.length} file(s)`);
      }
    } catch (error) {
      warnings.push(`Cannot read parts/ directory: ${error.message}`);
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
 * Format validation results for console output
 */
function formatResults(componentPath, result, verbose = true) {
  const { isValid, errors, warnings, missingFiles } = result;

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log(`Component Structure Validation: ${componentPath}`);
    console.log('='.repeat(60));
    console.log('');
  }

  if (isValid) {
    if (verbose) {
      printSuccess('✓ Component structure is valid');
    }
  } else {
    if (verbose) {
      printError('✗ Component structure has errors');
      errors.forEach((error) => printError(`  - ${error}`));
    }
  }

  if (warnings.length > 0 && verbose) {
    console.log('');
    printWarning('Warnings:');
    warnings.forEach((warning) => printWarning(`  - ${warning}`));
  }

  if (missingFiles.length > 0 && verbose) {
    console.log('');
    printInfo('Missing files:');
    missingFiles.forEach((file) => printInfo(`  - ${file}`));
  }

  if (verbose) {
    console.log('');
    console.log(`Status: ${isValid ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(60));
  }

  return isValid;
}

/**
 * Output results as JSON
 */
function outputJson(componentPath, result) {
  const output = {
    path: componentPath,
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    missingFiles: result.missingFiles,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(output, null, 2));
  return result.isValid;
}

async function main() {
  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      path: { type: 'string' },
      requireTypes: { type: 'boolean' },
      requireParts: { type: 'boolean' },
      fix: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  const { path: componentPath, requireTypes, requireParts, fix, json, help } = args.values;
  const positionals = args.positionals || [];

  // Get path from positional argument or --path option
  let resolvedComponentPath = componentPath;
  if (!resolvedComponentPath && positionals.length > 0) {
    resolvedComponentPath = positionals[0];
  }

  // Show help
  if (help || !resolvedComponentPath) {
    console.log(`
Component Directory Structure Validation Script

Usage: node validate-component-structure.js <component-path> [options]
       node validate-component-structure.js --path <component-path> [options]

Options:
  <component-path>       Path to the component directory (positional or --path)
  --path <path>           Path to the component directory
  --requireTypes <bool>   Require component.types.ts (default: false)
  --requireParts <bool>   Require parts/ directory (default: false)
  --fix                  Auto-create missing files (future - not yet implemented)
  --json                 Output results as JSON
  -h, --help             Show this help message

Examples:
  node validate-component-structure.js components/Button
  node validate-component-structure.js --path components/Card --requireTypes true
  node validate-component-structure.js components/MyComponent --json
  node validate-component-structure.js components/**
`);
    process.exit(help ? 0 : 1);
  }

  // Resolve the component path first
  const resolvedPath = resolve(cwd(), resolvedComponentPath);
  
  // Check if the original path contains glob patterns
  const hasGlobPattern = resolvedComponentPath.includes('*') || resolvedComponentPath.includes('?');
  
  // If glob pattern is present, expand it
  let pathsToValidate = [];
  if (hasGlobPattern) {
    // Simple glob expansion for ** pattern
    if (resolvedComponentPath.includes('**')) {
      // Remove the ** part to get the base directory
      const basePath = resolvedComponentPath.replace(/\/\*\*/g, '').replace(/\\\*\*/g, '');
      const baseDir = resolve(cwd(), basePath);
      if (existsSync(baseDir)) {
        try {
          const items = readdirSync(baseDir, { withFileTypes: true });
          pathsToValidate = items
            .filter(item => item.isDirectory())
            .map(item => resolve(baseDir, item.name));
        } catch (error) {
          // If we can't read the directory, treat it as a single path
          pathsToValidate = [resolvedPath];
        }
      }
    } else {
      // For simple * patterns, try to use the path as-is first
      pathsToValidate = [resolvedPath];
    }
  } else {
    pathsToValidate = [resolvedPath];
  }

  // Parse boolean options
  const options = {
    requireTypes: requireTypes || false,
    requireParts: requireParts || false,
    fix: fix || false,
    json: json || false,
  };

  // Check for fix flag (not yet implemented)
  if (options.fix) {
    printWarning('--fix flag is not yet implemented. Use --json for programmatic output.');
  }

  // Validate all paths
  let allValid = true;
  if (pathsToValidate.length === 0) {
    printError('No paths to validate');
    process.exit(1);
  }

  for (const pathToValidate of pathsToValidate) {
    if (!options.json) {
      printInfo(`Validating component structure at: ${pathToValidate}`);
    }
    const result = validateComponentStructure(pathToValidate, { 
      ...options, 
      quiet: options.json 
    });

    // Output results
    if (options.json) {
      outputJson(pathToValidate, result);
    } else {
      formatResults(pathToValidate, result, true);
    }

    if (!result.isValid) {
      allValid = false;
    }
  }

  process.exit(allValid ? 0 : 1);
}

main().catch((error) => {
  printError(`Validation failed: ${error.message}`);
  process.exit(1);
});
