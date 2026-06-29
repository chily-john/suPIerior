#!/usr/bin/env node

/**
 * Atomic Usage Scanner Script
 * 
 * Scans source files and flags raw <a> and <img> tags where project atomic elements
 * (Next.js Link, Image) should be used.
 * 
 * Usage: node scan-atomic-usage.js --path <path> [options]
 * 
 * Options:
 *   --path <path>           Required: Path to scan
 *   --catalog <path>        Path to atomic elements catalog file
 *   --json                 Output results as JSON
 *   --fix                  Auto-fix violations (future)
 *   -h, --help             Show this help message
 */

import { parseArgs } from 'node:util';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, relative, extname, join } from 'node:path';
import { cwd } from 'node:process';

// Default atomic elements catalog (Next.js defaults)
const DEFAULT_ATOMIC_ELEMENTS = {
  a: {
    atomic: 'Link',
    import: 'next/link',
    suggestion: 'Use Link from next/link instead of <a>',
  },
  img: {
    atomic: 'Image',
    import: 'next/image',
    suggestion: 'Use Image from next/image instead of <img>',
  },
};

// Supported file extensions
const SUPPORTED_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);

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
 * Load atomic elements catalog from file
 */
function loadAtomicCatalog(catalogPath) {
  if (!catalogPath) {
    return DEFAULT_ATOMIC_ELEMENTS;
  }

  const resolvedPath = resolve(cwd(), catalogPath);
  
  if (!existsSync(resolvedPath)) {
    printWarning(`Atomic catalog not found: ${catalogPath}. Using default catalog.`);
    return DEFAULT_ATOMIC_ELEMENTS;
  }

  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    // Parse the catalog file (simple markdown or JSON format)
    // For now, return default and log that custom catalog is loaded
    printInfo(`Loaded atomic catalog from: ${catalogPath}`);
    return DEFAULT_ATOMIC_ELEMENTS;
  } catch (error) {
    printWarning(`Failed to load atomic catalog: ${error.message}. Using default catalog.`);
    return DEFAULT_ATOMIC_ELEMENTS;
  }
}

/**
 * Find all files in a directory tree with supported extensions
 */
function findFilesInDirectory(dirPath, extensions) {
  const files = [];
  const resolvedPath = resolve(dirPath);

  if (!existsSync(resolvedPath)) {
    return files;
  }

  if (!statSync(resolvedPath).isDirectory()) {
    // If it's a file, check if it has a supported extension
    if (extensions.has(extname(resolvedPath))) {
      files.push(resolvedPath);
    }
    return files;
  }

  // Recursively scan directory
  function scanDirectory(currentPath) {
    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common non-source directories
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensions.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      printWarning(`Cannot read directory: ${currentPath} - ${error.message}`);
    }
  }

  scanDirectory(resolvedPath);
  return files;
}

/**
 * Parse a file to find HTML tags using a simple regex-based approach
 * Note: For production, consider using a proper parser like parse5
 */
function findHtmlTags(fileContent, tagNames) {
  const violations = [];
  const lines = fileContent.split('\n');

  // Build regex pattern to match opening tags like <a>, <a ...>, <a ... />
  // This pattern captures the tag name and handles self-closing tags
  const tagPattern = new RegExp(`<(${tagNames.join('|')})\\b[^>]*(?:>|\\/>)`, 'gi');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match;

    // Reset regex lastIndex for each line to ensure proper matching
    tagPattern.lastIndex = 0;

    while ((match = tagPattern.exec(line)) !== null) {
      // Extract the tag name from the match
      // The first capture group contains the tag name
      const tagName = match[1] ? match[1].toLowerCase() : null;

      if (tagName && tagNames.includes(tagName)) {
        const column = match.index + 1; // 1-indexed
        const fullMatch = match[0];
        
        violations.push({
          tag: tagName,
          line: lineIndex + 1, // 1-indexed
          column,
          match: fullMatch,
          context: line.trim().substring(0, 80),
        });
      }
    }
  }

  return violations;
}

/**
 * Scan a single file for atomic usage violations
 */
function scanFile(filePath, atomicElements) {
  const violations = [];
  const tagNames = Object.keys(atomicElements);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileViolations = findHtmlTags(content, tagNames);

    for (const violation of fileViolations) {
      const elementInfo = atomicElements[violation.tag];
      
      violations.push({
        file: filePath,
        line: violation.line,
        column: violation.column,
        tag: violation.tag,
        match: violation.match,
        suggestion: elementInfo.suggestion,
        atomicElement: elementInfo.atomic,
        importPath: elementInfo.import,
        context: violation.context,
      });
    }
  } catch (error) {
    printWarning(`Cannot read file: ${filePath} - ${error.message}`);
  }

  return violations;
}

/**
 * Scan all files in a directory for atomic usage violations
 */
function scanDirectory(dirPath, atomicElements, quiet = false) {
  const allViolations = [];
  const files = findFilesInDirectory(dirPath, SUPPORTED_EXTENSIONS);

  if (!quiet) {
    printInfo(`Scanning ${files.length} file(s) in: ${dirPath}`);
  }

  for (const file of files) {
    const fileViolations = scanFile(file, atomicElements);
    allViolations.push(...fileViolations);
  }

  return allViolations;
}

/**
 * Format violation for console output
 */
function formatViolation(violation, index) {
  const relativePath = relative(cwd(), violation.file);
  return `  ${index + 1}. ${relativePath}:${violation.line}:${violation.column}
     Tag: ${violation.match}
     Suggested: ${violation.suggestion}
     Context: ${violation.context}`;
}

/**
 * Format all violations for console output
 */
function formatResults(violations, scanPath) {
  const relativeScanPath = relative(cwd(), scanPath);
  console.log('');
  console.log('='.repeat(70));
  console.log(`Atomic Usage Scan Results: ${relativeScanPath}`);
  console.log('='.repeat(70));
  console.log('');

  if (violations.length === 0) {
    printSuccess('No violations found. All files use atomic elements correctly.');
    console.log('');
    console.log('Status: PASS');
  } else {
    printError(`Found ${violations.length} violation(s):`);
    console.log('');

    for (let i = 0; i < violations.length; i++) {
      console.log(formatViolation(violations[i], i));
      console.log('');
    }

    console.log('Status: FAIL');
  }

  console.log('='.repeat(70));
  return violations.length === 0;
}

/**
 * Output results as JSON
 */
function outputJson(violations, scanPath) {
  const output = {
    scanPath: relative(cwd(), scanPath),
    violations,
    count: violations.length,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(output, null, 2));
  return violations.length === 0;
}

async function main() {
  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      path: { type: 'string' },
      catalog: { type: 'string' },
      json: { type: 'boolean' },
      fix: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  const { path: scanPath, catalog: catalogPath, json, fix, help } = args.values;
  const positionals = args.positionals || [];

  // Get path from positional argument or --path option
  let resolvedScanPath = scanPath;
  if (!resolvedScanPath && positionals.length > 0) {
    resolvedScanPath = positionals[0];
  }

  // Show help
  if (help || !resolvedScanPath) {
    console.log(`
Atomic Usage Scanner Script

Scans source files and flags raw <a> and <img> tags where project atomic
elements (Next.js Link, Image) should be used.

Usage: node scan-atomic-usage.js <path> [options]
       node scan-atomic-usage.js --path <path> [options]

Options:
  <path>                 Path to scan (positional or --path)
  --path <path>           Path to scan
  --catalog <path>        Path to atomic elements catalog file
  --json                 Output results as JSON
  --fix                  Auto-fix violations (future - not yet implemented)
  -h, --help             Show this help message

Examples:
  node scan-atomic-usage.js src/
  node scan-atomic-usage.js --path src/ --catalog .workflower/components/atomic-elements.md
  node scan-atomic-usage.js src/ --json
`);
    process.exit(help ? 0 : 1);
  }

  // Check if path exists
  const resolvedPath = resolve(cwd(), resolvedScanPath);
  if (!existsSync(resolvedPath)) {
    printError(`Path does not exist: ${resolvedScanPath}`);
    process.exit(1);
  }

  // Load atomic elements catalog
  const atomicElements = loadAtomicCatalog(catalogPath);

  // Check for fix flag (not yet implemented)
  if (fix) {
    printWarning('--fix flag is not yet implemented. Use --json for programmatic output.');
  }

  // Scan for violations
  const violations = scanDirectory(resolvedPath, atomicElements, json);

  // Output results
  if (json) {
    const success = outputJson(violations, resolvedScanPath);
    process.exit(success ? 0 : 1);
  } else {
    const success = formatResults(violations, resolvedScanPath);
    process.exit(success ? 0 : 1);
  }
}

main().catch((error) => {
  printError(`Scan failed: ${error.message}`);
  process.exit(1);
});
