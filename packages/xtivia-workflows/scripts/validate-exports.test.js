import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

describe('validate-exports script', () => {
  const testDir = resolve(tmpdir(), 'validate-exports-script-test');
  const scriptPath = resolve(__dirname, 'validate-exports.js');

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

  // Helper to get combined output (stdout + stderr)
  function getFullOutput(result) {
    return result.output + '\n' + result.error;
  }

  describe('Basic functionality', () => {
    it('should show help when no path is provided', () => {
      const result = runScript('--help');
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('Export Validator Script');
      expect(getFullOutput(result)).toContain('--path <path>');
    });

    it('should fail when directory does not exist', () => {
      const result = runScript('--path /nonexistent/path');
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('does not exist');
    });
  });

  describe('Red Phase - Export name validation', () => {
    it('should fail when index.ts exports wrong component name', () => {
      // Create a component directory with wrong export name
      const componentPath = resolve(testDir, 'WrongExport');
      mkdirSync(componentPath, { recursive: true });
      
      // Create Component.tsx
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const WrongExport = () => null;');
      
      // Create index.ts with WRONG export name (should be WrongExport but we export as DifferentName)
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { WrongExport as DifferentName } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      // This should fail because the export name doesn't match the expected component name
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('FAIL');
    });

    it('should pass when index.ts exports correct component name', () => {
      const componentPath = resolve(testDir, 'CorrectExport');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const CorrectExport = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { CorrectExport } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });
  });

  describe('Named exports validation', () => {
    it('should check that named exports match component file names', () => {
      const componentPath = resolve(testDir, 'NamedExports');
      mkdirSync(componentPath, { recursive: true });
      
      // Create multiple component files
      writeFileSync(resolve(componentPath, 'Button.tsx'), 'export const Button = () => null;');
      writeFileSync(resolve(componentPath, 'Icon.tsx'), 'export const Icon = () => null;');
      
      // Create index.ts that exports them
      writeFileSync(resolve(componentPath, 'index.ts'), `
        export { Button } from './Button';
        export { Icon } from './Icon';
      `);
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });

    it('should fail when named export does not match file name', () => {
      const componentPath = resolve(testDir, 'MismatchedExports');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Button.tsx'), 'export const Button = () => null;');
      
      // Export with wrong name
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { Button as MyButton } from "./Button";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('FAIL');
    });
  });

  describe('Default and named exports', () => {
    it('should handle default exports', () => {
      const componentPath = resolve(testDir, 'DefaultExport');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export default function Component() { return null; }');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { default } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });

    it('should handle mixed default and named exports', () => {
      const componentPath = resolve(testDir, 'MixedExports');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), `
        export const NamedExport = () => null;
        export default function Component() { return null; }
      `);
      writeFileSync(resolve(componentPath, 'index.ts'), `
        export { default } from './Component';
        export { NamedExport } from './Component';
      `);
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });
  });

  describe('Parts directory validation', () => {
    it('should check that all part files are exported from parts/index.ts', () => {
      const componentPath = resolve(testDir, 'WithParts');
      mkdirSync(componentPath, { recursive: true });
      mkdirSync(resolve(componentPath, 'parts'), { recursive: true });
      
      // Create part files
      writeFileSync(resolve(componentPath, 'parts', 'Header.tsx'), 'export const Header = () => null;');
      writeFileSync(resolve(componentPath, 'parts', 'Footer.tsx'), 'export const Footer = () => null;');
      
      // Create parts/index.ts
      writeFileSync(resolve(componentPath, 'parts', 'index.ts'), `
        export { Header } from './Header';
        export { Footer } from './Footer';
      `);
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });

    it('should fail when parts/index.ts is missing exports for part files', () => {
      const componentPath = resolve(testDir, 'PartsMissingExport');
      mkdirSync(componentPath, { recursive: true });
      mkdirSync(resolve(componentPath, 'parts'), { recursive: true });
      
      writeFileSync(resolve(componentPath, 'parts', 'Header.tsx'), 'export const Header = () => null;');
      writeFileSync(resolve(componentPath, 'parts', 'Footer.tsx'), 'export const Footer = () => null;');
      
      // parts/index.ts is missing Footer export
      writeFileSync(resolve(componentPath, 'parts', 'index.ts'), 'export { Header } from "./Header";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('FAIL');
    });
  });

  describe('Glob pattern support', () => {
    it('should validate all index.ts files with glob pattern', () => {
      // Create multiple component directories
      const basePath = resolve(testDir, 'GlobTest');
      mkdirSync(basePath, { recursive: true });
      
      // Valid component
      const validPath = resolve(basePath, 'ValidComp');
      mkdirSync(validPath, { recursive: true });
      writeFileSync(resolve(validPath, 'Component.tsx'), 'export const ValidComp = () => null;');
      writeFileSync(resolve(validPath, 'index.ts'), 'export { ValidComp } from "./Component";');
      
      // Invalid component
      const invalidPath = resolve(basePath, 'InvalidComp');
      mkdirSync(invalidPath, { recursive: true });
      writeFileSync(resolve(invalidPath, 'Component.tsx'), 'export const InvalidComp = () => null;');
      writeFileSync(resolve(invalidPath, 'index.ts'), 'export { InvalidComp as WrongName } from "./Component";');
      
      // Run with glob pattern
      const result = runScript(`${basePath}/**/index.ts`);
      expect(result.code).toBe(1); // Should fail because of the invalid component
      expect(getFullOutput(result)).toContain('FAIL');
    });
  });

  describe('JSON output', () => {
    it('should output JSON when --json flag is used', () => {
      const componentPath = resolve(testDir, 'JsonTest');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const JsonTest = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { JsonTest } from "./Component";');
      
      const result = runScript(`--path ${componentPath} --json`);
      expect(result.code).toBe(0);
      const output = JSON.parse(result.output);
      expect(output.isValid).toBe(true);
      expect(output.path).toBe(componentPath);
      expect(Array.isArray(output.errors)).toBe(true);
      expect(Array.isArray(output.warnings)).toBe(true);
    });
  });

  describe('Component name derivation', () => {
    it('should derive expected component name from directory name', () => {
      const componentPath = resolve(testDir, 'DirectoryName');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const DirectoryName = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { DirectoryName } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(0);
      expect(getFullOutput(result)).toContain('PASS');
    });

    it('should fail when export name does not match directory name', () => {
      const componentPath = resolve(testDir, 'NameMismatch');
      mkdirSync(componentPath, { recursive: true });
      
      writeFileSync(resolve(componentPath, 'Component.tsx'), 'export const WrongName = () => null;');
      writeFileSync(resolve(componentPath, 'index.ts'), 'export { WrongName } from "./Component";');
      
      const result = runScript(`--path ${componentPath}`);
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('FAIL');
    });
  });
});
