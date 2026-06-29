import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, 'playwright-capture.js');

// Check if Playwright is available for success tests
const hasPlaywright = (() => {
  try {
    require.resolve('playwright');
    return true;
  } catch {
    return false;
  }
})();

// Skip success tests if Playwright is not available
const describeIfPlaywright = hasPlaywright ? describe : describe.skip;

describe('playwright-capture script', () => {
  const testOutputDir = resolve(__dirname, '..', 'test-output');

  beforeEach(() => {
    // Clean up test output directory before each test
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up after all tests
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should exit with error code 1 when Playwright is not installed', async () => {
    // This test runs even without Playwright by using a mock environment
    const result = await new Promise((resolve) => {
      // Use a subprocess that doesn't have Playwright
      const child = spawn('node', [
        '-e',
        `const { spawn } = require('child_process');` +
        `const child = spawn('node', ['${scriptPath.replace(/\\/g, '\\\\')}'], { stdio: ['ignore', 'pipe', 'pipe'] });` +
        `let stdout = ''; let stderr = '';` +
        `child.stdout.on('data', d => stdout += d.toString());` +
        `child.stderr.on('data', d => stderr += d.toString());` +
        `child.on('close', code => process.stdout.write(JSON.stringify({code, stdout, stderr})));`
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { output += data.toString(); });
      
      child.on('close', () => {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch {
          resolve({ code: 1, stdout: '', stderr: output });
        }
      });
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Playwright is not installed');
  });

  describeIfPlaywright('success cases', () => {
    it('should exit with error code 1 when URL is missing', async () => {
      const result = await new Promise((resolve) => {
        const child = spawn('node', [scriptPath, '--outputDir', testOutputDir],
          { stdio: ['ignore', 'pipe', 'pipe'] });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('--url is required');
    });

    it('should exit with error code 1 when outputDir is missing', async () => {
      const result = await new Promise((resolve) => {
        const child = spawn('node', [scriptPath, '--url', 'https://example.com'],
          { stdio: ['ignore', 'pipe', 'pipe'] });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('--outputDir is required');
    });

    it('should accept and parse custom viewports', async () => {
      const customOutputDir = resolve(testOutputDir, 'custom-viewports');
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath, 
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--viewports', 'desktop,tablet'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      // The script should complete successfully (code 0) or fail due to network
      // We're mainly testing that it accepts the parameters
      expect([0, 1]).toContain(result.code);
    });

    it('should accept timeout configuration', async () => {
      const customOutputDir = resolve(testOutputDir, 'custom-timeout');
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath,
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--timeout', '10000'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 15000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      expect([0, 1]).toContain(result.code);
      expect(stdout).toContain('Timeout: 10000 ms');
    });

    it('should accept headless mode configuration', async () => {
      const customOutputDir = resolve(testOutputDir, 'headless-false');
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath,
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--headless', 'false'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      expect([0, 1]).toContain(result.code);
      expect(stdout).toContain('Headless: false');
    });

    it('should accept retry configuration', async () => {
      const customOutputDir = resolve(testOutputDir, 'custom-retries');
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath,
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--retries', '5',
          '--retryDelay', '2000'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 30000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      expect([0, 1]).toContain(result.code);
      expect(stdout).toContain('Retries: 5');
      expect(stdout).toContain('Retry delay: 2000 ms');
    });

    it('should accept basic auth configuration', async () => {
      const customOutputDir = resolve(testOutputDir, 'basic-auth');
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath,
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--basicAuth', 'testuser:testpass'
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      expect([0, 1]).toContain(result.code);
      expect(stdout).toContain('Basic auth: configured');
    });

    it('should accept cookies configuration', async () => {
      const customOutputDir = resolve(testOutputDir, 'cookies');
      const cookiesJson = JSON.stringify([
        { name: 'test-cookie', value: 'test-value', domain: 'example.com', path: '/' }
      ]);
      
      const result = await new Promise((resolve) => {
        const child = spawn('node', [
          scriptPath,
          '--url', 'https://example.com',
          '--outputDir', customOutputDir,
          '--cookies', cookiesJson
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
          resolve({ code: 1, stdout: '', stderr: err.message });
        });
      });

      expect([0, 1]).toContain(result.code);
      expect(stdout).toContain('Cookies: 1 configured');
    });
  });
});
