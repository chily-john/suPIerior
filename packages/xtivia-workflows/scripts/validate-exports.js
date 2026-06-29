#!/usr/bin/env node

/**
 * Export Validator Script
 * 
 * Validates that component index.ts files export the expected components.
 * Checks that named exports match component file names and directory names.
 * 
 * Usage: node validate-exports.js --path <path> [options]
 */

import { parseArgs } from 'node:util';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, relative, extname, join, dirname, basename } from 'node:path';
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
 * Simple glob pattern matching for ** patterns
 */
function expandGlobPattern(pattern, baseDir) {
  const results = [];
  
  // Normalize the pattern to use forward slashes
  const normalizedPattern = pattern.replace(/\\/g, '/');
  
  if (normalizedPattern.includes('**')) {
    const parts = normalizedPattern.split('**');
    const before = parts[0].replace(/\/$/, ''); // Remove trailing slash
    const after = (parts[1] || '').replace(/^\//, ''); // Remove leading slash
    const searchDir = resolve(baseDir, before);
    
    if (!existsSync(searchDir)) {
      return results;
    }
    
    function walk(dir) {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = resolve(dir, item.name);
        if (item.isDirectory()) {
          if (after) {
            // Check if directory matches the after pattern
            if (item.name === after || item.name.endsWith(after)) {
              // If after ends with /index.ts or similar, we need to look for files
              if (after.includes('/')) {
                const subPattern = after.substring(after.indexOf('/') + 1);
                const subResults = walk(fullPath);
                results.push(...subResults);
              } else {
                results.push(fullPath);
              }
            }
          } else {
            results.push(fullPath);
          }
          walk(fullPath);
        } else if (item.isFile() && after) {
          // Check if file matches the after pattern
          if (after.includes('/')) {
            // Pattern like "parts/index.ts"
            const afterParts = after.split('/');
            let currentDir = dir;
            let matched = true;
            for (let i = 0; i < afterParts.length - 1; i++) {
              currentDir = resolve(currentDir, afterParts[i]);
              if (!existsSync(currentDir) || !statSync(currentDir).isDirectory()) {
                matched = false;
                break;
              }
            }
            if (matched && item.name === afterParts[afterParts.length - 1]) {
              results.push(fullPath);
            }
          } else if (item.name === after) {
            results.push(fullPath);
          }
        }
      }
    }
    walk(searchDir);
  } else if (normalizedPattern.includes('*')) {
    const searchDir = dirname(resolve(baseDir, normalizedPattern.replace(/[^\/]*$/, '')));
    const filePattern = basename(normalizedPattern);
    if (existsSync(searchDir)) {
      const items = readdirSync(searchDir, { withFileTypes: true });
      const patternRegex = new RegExp('^' + filePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      for (const item of items) {
        if (patternRegex.test(item.name)) {
          results.push(resolve(searchDir, item.name));
        }
      }
    }
  } else {
    results.push(resolve(baseDir, normalizedPattern));
  }
  return results;
}

/**
 * Extract exported names from an index.ts file content
 */
function extractExportsFromContent(content) {
  const exports = [];
  const lines = content.split('\n');
  
  const exportRegex = /^\s*export\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;
  const exportStarRegex = /^\s*export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;
  const exportDefaultRegex = /^\s*export\s+\{\s*default\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine === '') {
      continue;
    }
    
    let match = exportRegex.exec(trimmedLine);
    if (match) {
      const exportList = match[1].trim();
      const fromPath = match[2];
      const items = exportList.split(',').map(item => item.trim());
      
      for (const item of items) {
        if (item === 'default') {
          exports.push({ name: 'default', alias: null, from: fromPath, isDefault: true });
        } else if (item.includes(' as ')) {
          const [original, alias] = item.split(' as ').map(s => s.trim());
          exports.push({ name: original, alias: alias, from: fromPath, isDefault: false });
        } else {
          exports.push({ name: item, alias: null, from: fromPath, isDefault: false });
        }
      }
      continue;
    }
    
    match = exportStarRegex.exec(trimmedLine);
    if (match) {
      exports.push({ name: '*', alias: null, from: match[1], isWildcard: true });
      continue;
    }
    
    match = exportDefaultRegex.exec(trimmedLine);
    if (match) {
      exports.push({ name: 'default', alias: null, from: match[1], isDefault: true });
    }
  }
  return exports;
}

/**
 * Get expected component name from directory name
 */
function getExpectedComponentNameFromDirectory(dirPath) {
  const dirName = basename(dirPath);
  return dirName
    .split(/[-\_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Get the actual exported name (alias if present, otherwise name)
 */
function getExportedName(exp) {
  return exp.alias || exp.name;
}

/**
 * Validate exports in an index.ts file
 */
function validateIndexFile(indexFilePath) {
  const dirPath = dirname(indexFilePath);
  const errors = [];
  const warnings = [];
  const info = [];
  
  if (!existsSync(indexFilePath)) {
    return { isValid: false, errors: [`Index file not found: ${indexFilePath}`], warnings, info };
  }
  
  let content;
  try {
    content = readFileSync(indexFilePath, 'utf-8');
  } catch (error) {
    return { isValid: false, errors: [`Cannot read index file: ${indexFilePath} - ${error.message}`], warnings, info };
  }
  
  const actualExports = extractExportsFromContent(content);
  info.push(`Found ${actualExports.length} export(s) in ${indexFilePath}`);
  
  // Check if directory has Component.tsx or Component.jsx
  const hasComponentFile = existsSync(resolve(dirPath, 'Component.tsx')) || 
                           existsSync(resolve(dirPath, 'Component.jsx'));
  
  if (hasComponentFile) {
    const expectedComponentName = getExpectedComponentNameFromDirectory(dirPath);
    
    // Check if any export matches the expected component name
    const hasMatchingNamedExport = actualExports.some(e => getExportedName(e) === expectedComponentName);
    
    // Also check for default export from Component file
    const hasDefaultExportFromComponent = actualExports.some(e => 
      e.isDefault && 
      (e.from === './Component.tsx' || e.from === './Component' || e.from === './Component.jsx')
    );
    
    if (!hasMatchingNamedExport && !hasDefaultExportFromComponent) {
      const exportedNames = actualExports.map(e => getExportedName(e)).filter(Boolean);
      errors.push(`Component directory '${basename(dirPath)}' should export '${expectedComponentName}' (or default from Component.tsx) but exports: ${exportedNames.join(', ') || 'none'}`);
    } else {
      if (hasMatchingNamedExport) {
        info.push(`✓ Component '${expectedComponentName}' is exported`);
        
        // Check that the export comes from Component file
        const componentExport = actualExports.find(e => getExportedName(e) === expectedComponentName);
        if (componentExport) {
          const validSources = ['./Component.tsx', './Component', './Component.jsx'];
          if (!validSources.includes(componentExport.from)) {
            warnings.push(`Component export '${expectedComponentName}' should be from './Component.tsx' but is from '${componentExport.from}'`);
          }
        }
      } else if (hasDefaultExportFromComponent) {
        info.push(`✓ Default export from Component.tsx found`);
      }
    }
  } else {
    // No Component.tsx - check that all exported names match source files
    // AND that all source files are exported
    const files = existsSync(dirPath) ? readdirSync(dirPath, { withFileTypes: true }) : [];
    const sourceFiles = files
      .filter(f => f.isFile() && !f.name.endsWith('.d.ts') && !f.name.endsWith('.types.ts') && f.name !== 'index.ts')
      .map(f => basename(f.name, extname(f.name)));
    
    // Check that all exported names match source files
    for (const actualExport of actualExports) {
      if (actualExport.isWildcard || actualExport.isDefault) {
        continue;
      }
      
      const exportedName = getExportedName(actualExport);
      if (!sourceFiles.includes(exportedName)) {
        errors.push(`Export '${exportedName}' does not match any source file in ${dirPath}`);
      } else {
        info.push(`✓ Export '${exportedName}' matches source file`);
      }
    }
    
    // Check that all source files are exported
    const exportedNames = actualExports
      .filter(e => !e.isWildcard && !e.isDefault)
      .map(e => getExportedName(e));
    
    for (const sourceFile of sourceFiles) {
      if (!exportedNames.includes(sourceFile)) {
        errors.push(`Source file '${sourceFile}.tsx' (or .ts/.jsx) is not exported from ${indexFilePath}`);
      }
    }
  }
  
  // Check parts/ directory if it exists
  const partsDir = resolve(dirPath, 'parts');
  if (existsSync(partsDir) && statSync(partsDir).isDirectory()) {
    const partsFiles = readdirSync(partsDir, { withFileTypes: true })
      .filter(f => f.isFile() && !f.name.endsWith('.d.ts') && !f.name.endsWith('.types.ts') && f.name !== 'index.ts')
      .map(f => f.name);
    
    const partsIndexPath = resolve(partsDir, 'index.ts');
    
    if (existsSync(partsIndexPath)) {
      const partsContent = readFileSync(partsIndexPath, 'utf-8');
      const partsExports = extractExportsFromContent(partsContent);
      
      for (const partFile of partsFiles) {
        const partBaseName = basename(partFile, extname(partFile));
        const hasPartExport = partsExports.some(e => getExportedName(e) === partBaseName);
        
        if (!hasPartExport) {
          errors.push(`parts/index.ts: Expected export '${partBaseName}' from part file '${partFile}' not found`);
        } else {
          info.push(`✓ Part '${partBaseName}' is exported from parts/index.ts`);
        }
      }
    } else {
      warnings.push(`parts/ directory exists but parts/index.ts not found`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info
  };
}

/**
 * Validate a single path (file or directory)
 */
function validatePath(path) {
  const resolvedPath = resolve(path);
  
  if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
    if (basename(resolvedPath) === 'index.ts') {
      return validateIndexFile(resolvedPath);
    }
    const dirPath = dirname(resolvedPath);
    const indexPath = resolve(dirPath, 'index.ts');
    if (existsSync(indexPath)) {
      return validateIndexFile(indexPath);
    }
    return { isValid: false, errors: [`No index.ts found in directory: ${dirPath}`], warnings: [], info: [] };
  }
  
  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    const indexPath = resolve(resolvedPath, 'index.ts');
    if (existsSync(indexPath)) {
      return validateIndexFile(indexPath);
    }
    
    // Check if there's a parts/index.ts even without main index.ts
    const partsIndexPath = resolve(resolvedPath, 'parts', 'index.ts');
    if (existsSync(partsIndexPath)) {
      return validateIndexFile(partsIndexPath);
    }
    
    return { isValid: false, errors: [`No index.ts found in directory: ${resolvedPath}`], warnings: [], info: [] };
  }
  
  return { isValid: false, errors: [`Path does not exist: ${resolvedPath}`], warnings: [], info: [] };
}

/**
 * Format validation results for console output
 */
function formatResults(path, result, verbose = true) {
  const { isValid, errors, warnings, info } = result;

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log(`Export Validation: ${path}`);
    console.log('='.repeat(60));
    console.log('');
  }

  if (info.length > 0 && verbose) {
    info.forEach(msg => printInfo(msg));
    console.log('');
  }

  if (isValid) {
    if (verbose) {
      printSuccess('✓ All exports are valid');
    }
  } else {
    if (verbose) {
      printError('✗ Export validation failed');
      errors.forEach((error) => printError(`  - ${error}`));
    }
  }

  if (warnings.length > 0 && verbose) {
    console.log('');
    printWarning('Warnings:');
    warnings.forEach((warning) => printWarning(`  - ${warning}`));
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
function outputJson(path, result) {
  const output = {
    path: path,
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    info: result.info,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(output, null, 2));
  return result.isValid;
}

/**
 * Expand paths with glob patterns
 */
function expandPaths(pattern) {
  const cwdPath = cwd();
  if (pattern.includes('*')) {
    // Normalize path separators
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // If pattern is absolute, use it as-is, otherwise resolve from cwd
    let baseDir;
    if (normalizedPattern.startsWith('/') || normalizedPattern.match(/^[a-zA-Z]:\//)) {
      // Absolute path
      const beforeStar = normalizedPattern.split('**')[0] || normalizedPattern;
      baseDir = dirname(beforeStar);
    } else {
      // Relative path
      baseDir = cwdPath;
    }
    
    return expandGlobPattern(normalizedPattern, baseDir);
  }
  return [resolve(cwdPath, pattern)];
}

async function main() {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      path: { type: 'string' },
      json: { type: 'boolean' },
      fix: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  const { path: inputPath, json, fix, help } = args.values;
  const positionals = args.positionals || [];

  let resolvedPath = inputPath;
  if (!resolvedPath && positionals.length > 0) {
    resolvedPath = positionals[0];
  }

  if (help || !resolvedPath) {
    console.log(`
Export Validator Script

Validates that component index.ts files export the expected components.
Checks that named exports match component file names and directory names.

Usage: node validate-exports.js <path> [options]
       node validate-exports.js --path <path> [options]

Arguments:
  <path>                  Path to validate (file, directory, or glob pattern)

Options:
  --path <path>           Path to validate
  --json                 Output results as JSON
  --fix                  Auto-fix violations (future - not yet implemented)
  -h, --help             Show this help message

Examples:
  # Validate a single index file
  node validate-exports.js components/Card/index.ts

  # Validate a component directory
  node validate-exports.js components/Card

  # Validate all index files with glob pattern
  node validate-exports.js components/**/index.ts

  # Output as JSON
  node validate-exports.js components/Card --json
`);
    process.exit(help ? 0 : 1);
  }

  if (fix) {
    printWarning('--fix flag is not yet implemented. Use --json for programmatic output.');
  }

  let paths;
  try {
    paths = expandPaths(resolvedPath);
  } catch (error) {
    printError(`Error expanding path: ${error.message}`);
    process.exit(1);
  }
  
  if (paths.length === 0) {
    printError(`No paths matched pattern: ${resolvedPath}`);
    process.exit(1);
  }

  let allValid = true;
  const results = [];

  for (const path of paths) {
    const result = validatePath(path);
    results.push({ path, result });
    
    if (json) {
      outputJson(path, result);
    } else {
      formatResults(path, result, true);
      if (paths.length > 1 && path !== paths[paths.length - 1]) {
        console.log('');
      }
    }

    if (!result.isValid) {
      allValid = false;
    }
  }

  if (paths.length > 1 && !json) {
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    const passCount = results.filter(r => r.result.isValid).length;
    const failCount = results.length - passCount;
    console.log(`Total: ${results.length}, Passed: ${passCount}, Failed: ${failCount}`);
    console.log('='.repeat(60));
  }

  process.exit(allValid ? 0 : 1);
}

main().catch((error) => {
  printError(`Validation failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
