import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

describe('scan-atomic-usage script', () => {
  const testDir = resolve(tmpdir(), 'atomic-usage-scanner-test');
  const scriptPath = resolve(__dirname, 'scan-atomic-usage.js');

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
      expect(getFullOutput(result)).toContain('Atomic Usage Scanner');
      expect(getFullOutput(result)).toContain('--path <path>');
    });

    it('should fail when path does not exist', () => {
      const result = runScript('--path /nonexistent/path');
      expect(result.code).toBe(1);
      expect(getFullOutput(result)).toContain('does not exist');
    });

    it('should accept path as positional argument', () => {
      const scanPath = resolve(testDir, 'empty-dir');
      mkdirSync(scanPath, { recursive: true });
      
      const result = runScript(scanPath);
      // Empty directory should pass (no violations)
      expect(result.code).toBe(0);
    });
  });

  describe('Detecting raw <a> tags', () => {
    it('should detect raw <a> tag in a .tsx file', () => {
      const scanPath = resolve(testDir, 'a-tag-test');
      mkdirSync(scanPath, { recursive: true });
      
      // Create a test file with a raw <a> tag
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <a href="/test">Click me</a>
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      // Should detect at least one violation
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('violation');
      expect(output).toContain('<a>');
      expect(output).toContain('Link');
    });

    it('should detect raw <a> tag in a .jsx file', () => {
      const scanPath = resolve(testDir, 'jsx-a-tag-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.jsx'),
        `export const Component = () => (
  <div>
    <a href="/test">Click me</a>
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('violation');
      expect(output).toContain('<a>');
    });

    it('should detect multiple <a> tags in a file', () => {
      const scanPath = resolve(testDir, 'multiple-a-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <a href="/test1">Link 1</a>
    <a href="/test2">Link 2</a>
    <a href="/test3">Link 3</a>
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      // Should find 3 violations
      expect(output).toMatch(/<a>/i);
      // Check that we report multiple violations - look for line numbers 3, 4, 5
      expect(output).toMatch(/3:\d+/);
      expect(output).toMatch(/4:\d+/);
      expect(output).toMatch(/5:\d+/);
    });
  });

  describe('Detecting raw <img> tags', () => {
    it('should detect raw <img> tag in a .tsx file', () => {
      const scanPath = resolve(testDir, 'img-tag-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <img src="/image.png" alt="Test" />
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('violation');
      expect(output).toContain('<img>');
      expect(output).toContain('Image');
    });

    it('should detect raw <img> tag in a .ts file', () => {
      const scanPath = resolve(testDir, 'ts-img-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.ts'),
        `const html = '<img src="/image.png" alt="Test" />';`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('violation');
      expect(output).toContain('<img>');
    });
  });

  describe('Mixed violations', () => {
    it('should detect both <a> and <img> tags in the same file', () => {
      const scanPath = resolve(testDir, 'mixed-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <a href="/test">Click me</a>
    <img src="/image.png" alt="Test" />
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('<a>');
      expect(output).toContain('<img>');
      expect(output).toContain('Link');
      expect(output).toContain('Image');
    });
  });

  describe('No violations', () => {
    it('should pass when no raw tags are found', () => {
      const scanPath = resolve(testDir, 'clean-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `import Link from 'next/link';
import Image from 'next/image';

export const Component = () => (
  <div>
    <Link href="/test">Click me</Link>
    <Image src="/image.png" alt="Test" />
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(0);
      const output = getFullOutput(result);
      expect(output).toContain('No violations');
    });

    it('should ignore non-code files', () => {
      const scanPath = resolve(testDir, 'non-code-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'readme.md'),
        `# Documentation

This has <a href="test">markdown links</a> that should be ignored.
`
      );

      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => <div>Clean component</div>;`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(0);
    });
  });

  describe('Output format', () => {
    it('should output violations with file, line, and column', () => {
      const scanPath = resolve(testDir, 'format-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <a href="/test">Click me</a>
  </div>
);`
      );

      const result = runScript(`--path ${scanPath}`);
      const output = getFullOutput(result);
      
      // Should contain file path
      expect(output).toMatch(/test\.tsx/);
      // Should contain line number (format: line:column)
      expect(output).toMatch(/3:\d+/);
      // Should contain column number (format: line:column)
      expect(output).toMatch(/:\d+/);
    });

    it('should output JSON when --json flag is used', () => {
      const scanPath = resolve(testDir, 'json-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.tsx'),
        `export const Component = () => (
  <div>
    <a href="/test">Click me</a>
  </div>
);`
      );

      const result = runScript(`--path ${scanPath} --json`);
      expect(result.code).toBe(1);
      // Parse only the last JSON object (in case there are multiple outputs)
      const lines = result.output.split('\n');
      let jsonOutput = null;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          try {
            jsonOutput = JSON.parse(lines[i]);
            break;
          } catch (e) {
            // Try to parse the whole output as JSON
            try {
              jsonOutput = JSON.parse(result.output);
              break;
            } catch (e2) {
              // Not JSON, continue
            }
          }
        }
      }
      expect(jsonOutput).not.toBeNull();
      expect(Array.isArray(jsonOutput.violations)).toBe(true);
      expect(jsonOutput.violations.length).toBeGreaterThan(0);
      expect(jsonOutput.violations[0]).toHaveProperty('file');
      expect(jsonOutput.violations[0]).toHaveProperty('line');
      expect(jsonOutput.violations[0]).toHaveProperty('column');
      expect(jsonOutput.violations[0]).toHaveProperty('tag');
      expect(jsonOutput.violations[0]).toHaveProperty('suggestion');
    });
  });

  describe('File extensions', () => {
    it('should scan .js files', () => {
      const scanPath = resolve(testDir, 'js-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.js'),
        `module.exports = '<a href="/test">Click me</a>';`
      );

      const result = runScript(`--path ${scanPath}`);
      expect(result.code).toBe(1);
      const output = getFullOutput(result);
      expect(output).toContain('violation');
    });

    it('should ignore non-JS/TS files by default', () => {
      const scanPath = resolve(testDir, 'non-js-test');
      mkdirSync(scanPath, { recursive: true });
      
      writeFileSync(
        resolve(scanPath, 'test.html'),
        `<html><body><a href="/test">Click me</a></body></html>`
      );

      const result = runScript(`--path ${scanPath}`);
      // HTML files should be ignored by default
      expect(result.code).toBe(0);
    });
  });
});
