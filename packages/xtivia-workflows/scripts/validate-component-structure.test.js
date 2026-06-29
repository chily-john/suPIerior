import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

describe('validate-component-structure script', () => {
  const testDir = resolve(tmpdir(), 'component-structure-script-test');
  const scriptPath = resolve(__dirname, 'validate-component-structure.js');

  beforeAll(() => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function runScript(args) {
    const result = spawnSync('node', [scriptPath, ...args.split(' ')], {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    return { 
      code: result.status || 0, 
      output: result.stdout || '', 
      error: result.stderr || '' 
    };
  }

  describe('Basic validation', () => {
    // Helper to get combined output (stdout + stderr)
    function getFullOutput(result) {
      return result.output + '\n' + result.error;
    }

    it('should show help when no path is provided', () => {
      const result = runScript('--help');
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('Component Directory Structure Validation Script');
      expect(getFullOutput(result)).toContain('--path <path>');
    });

    it('should fail when Component.tsx is missing', () => {
      const componentPath = resolve(testDir, 'MissingComponent');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'index.ts'), 'export {};');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('Missing Component.tsx');
      expect(getFullOutput(result)).toContain('FAIL');
    });

    it('should accept path as positional argument', () => {
      const componentPath = resolve(testDir, 'PositionalArg');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const PositionalArg = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { PositionalArg } from "./Component";');
      
      const result = runScript(componentPath);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('Component structure is valid');
    });

    it('should fail when component is missing index.ts', () => {
      const componentPath = resolve(testDir, 'MissingIndex');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const MissingIndex = () => null;');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('Missing index.ts');
      expect(getFullOutput(result)).toContain('FAIL');
    });

    it('should pass when component has all required files', () => {
      const componentPath = resolve(testDir, 'ValidComponent');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const ValidComponent = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { ValidComponent } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('Component structure is valid');
      expect(getFullOutput(result)).toContain('PASS');
    });

    it('should output JSON when --json flag is used', () => {
      const componentPath = resolve(testDir, 'JsonOutput');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const JsonOutput = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { JsonOutput } from "./Component";');
      
      const result = runScript(`--path ${componentPath} --json`);
      expect(result.code).toBe(0);
      const output = JSON.parse(result.output);
      expect(output.isValid).toBe(true);
      expect(output.path).toBe(componentPath);
      expect(Array.isArray(output.errors)).toBe(true);
      expect(Array.isArray(output.warnings)).toBe(true);
    });

    it('should fail when directory does not exist', () => {
      const result = runScript('--path /nonexistent/path');
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('does not exist');
    });
  });

  describe('Options', () => {
    // Helper to get combined output (stdout + stderr)
    function getFullOutput(result) {
      return result.output + '\n' + result.error;
    }

    it('should require component.types.ts when --requireTypes is true', () => {
      const componentPath = resolve(testDir, 'RequireTypes');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const RequireTypes = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { RequireTypes } from "./Component";');
      
      const result = runScript(`--path ${componentPath} --requireTypes true`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('Missing component.types.ts');
    });

    it('should require parts directory when --requireParts is true', () => {
      const componentPath = resolve(testDir, 'RequireParts');
      mkdirSync(componentPath, { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const RequireParts = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { RequireParts } from "./Component";');
      
      const result = runScript(`--path ${componentPath} --requireParts true`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('Missing parts/ directory');
    });
  });

  describe('Parts directory validation', () => {
    // Helper to get combined output (stdout + stderr)
    function getFullOutput(result) {
      return result.output + '\n' + result.error;
    }

    it('should warn when parts directory is empty', () => {
      const componentPath = resolve(testDir, 'EmptyParts');
      mkdirSync(componentPath, { recursive: true });
      mkdirSync(resolve(componentPath, 'parts'), { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const EmptyParts = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { EmptyParts } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0); // Empty parts is just a warning
      expect(getFullOutput(result)).toContain('parts/ directory is empty');
    });

    it('should warn when parts directory is missing index.ts', () => {
      const componentPath = resolve(testDir, 'PartsNoIndex');
      mkdirSync(componentPath, { recursive: true });
      mkdirSync(resolve(componentPath, 'parts'), { recursive: true });
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const PartsNoIndex = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { PartsNoIndex } from "./Component";');
      writeFileSync(resolve(componentPath, 'parts', 'Header.tsx'), 'export const Header = () => null;');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0); // Missing parts/index.ts is just a warning
      // Check for the warning in the output (with or without [WARN] prefix)
      expect(getFullOutput(result)).toMatch(/parts\/ directory missing index\.ts/);
    });
  });
});
