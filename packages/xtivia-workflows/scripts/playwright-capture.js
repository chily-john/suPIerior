#!/usr/bin/env node

/**
 * Reusable Playwright Capture Script
 * 
 * Captures a webpage at multiple viewports, generating screenshots, HTML snapshots,
 * DOM summaries, and image inventories.
 * 
 * Usage: node playwright-capture.js --url <url> --outputDir <dir> [options]
 * 
 * Options:
 *   --url <url>              Required: URL to capture
 *   --outputDir <dir>        Required: Output directory for artifacts
 *   --viewports <list>       Viewports to capture (default: desktop,tablet,mobile)
 *   --retries <n>           Number of retry attempts for failed page loads (default: 3)
 *   --retryDelay <ms>       Delay between retries in ms (default: 5000)
 *   --timeout <ms>          Navigation timeout in ms (default: 30000)
 *   --headless <bool>       Run browser in headless mode (default: true)
 *   --basicAuth <user:pass> Basic authentication credentials
 *   --cookies <json>        JSON string of cookies to set
 */

import { parseArgs } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Viewport configurations
const VIEWPORT_PRESETS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  // XTIVIA workflow contract viewports
  '1440x900': { width: 1440, height: 900 },
  '390x844': { width: 390, height: 844 }
};

/**
 * Parse viewport string - can be a preset name or custom "WxH" format
 */
function parseViewport(viewportStr) {
  // Check if it's a custom WxH format
  const match = viewportStr.match(/^(\d+)x(\d+)$/);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10)
    };
  }
  // Otherwise, use preset or default to desktop
  return VIEWPORT_PRESETS[viewportStr] || VIEWPORT_PRESETS.desktop;
}

// Default configuration
const DEFAULT_CONFIG = {
  retries: 3,
  retryDelay: 5000,
  timeout: 30000,
  headless: true
};

/**
 * Extract DOM structure and generate a summary from actual DOM
 */
function generateDOMSummaryFromDOM(page) {
  return page.evaluate(() => {
    const result = {
      title: document.title,
      headings: {
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: []
      },
      links: [],
      images: [],
      forms: [],
      interactiveElements: []
    };

    // Extract headings
    for (let i = 1; i <= 6; i++) {
      const elements = document.querySelectorAll(`h${i}`);
      elements.forEach(el => {
        result.headings[`h${i}`].push({
          text: el.textContent?.trim() || '',
          id: el.id || undefined
        });
      });
    }

    // Extract links
    document.querySelectorAll('a[href]').forEach(a => {
      result.links.push({
        text: a.textContent?.trim() || '',
        href: a.href,
        id: a.id || undefined
      });
    });

    // Extract images
    document.querySelectorAll('img').forEach(img => {
      result.images.push({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth || img.width || 'N/A',
        height: img.naturalHeight || img.height || 'N/A'
      });
    });

    // Extract forms
    document.querySelectorAll('form').forEach(form => {
      result.forms.push({
        id: form.id || undefined,
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          id: input.id
        }))
      });
    });

    // Extract interactive elements
    document.querySelectorAll('button, [role="button"], [onclick]').forEach(el => {
      result.interactiveElements.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
        id: el.id || undefined
      });
    });

    return result;
  });
}

/**
 * Extract image inventory from page
 */
async function generateImageInventoryFromPage(page) {
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt || '',
      width: img.naturalWidth || img.width || 'N/A',
      height: img.naturalHeight || img.height || 'N/A',
      context: getElementContext(img)
    }));

    function getElementContext(el) {
      const parent = el.parentElement;
      if (parent) {
        if (parent.tagName === 'A') return `Link: ${parent.href}`;
        if (parent.classList) return `Class: ${Array.from(parent.classList).join(' ')}`;
        return parent.tagName.toLowerCase();
      }
      return 'none';
    }
  });

  const lines = ['## Image Inventory', '', '| Src | Alt | Width | Height | Context |', '|-----|-----|-------|--------|---------|'];
  for (const img of images) {
    lines.push(`| ${img.src} | ${img.alt} | ${img.width} | ${img.height} | ${img.context} |`);
  }
  return lines.join('\n');
}

/**
 * Generate the page capture markdown report
 */
async function generatePageCaptureMarkdown(outputDir, url, viewports, screenshotFiles, htmlSnapshot, domSummary, imageInventory) {
  const timestamp = new Date().toISOString();
  const markdown = `# Page Capture Report

## Metadata
- **URL**: ${url}
- **Captured At**: ${timestamp}
- **Viewports**: ${viewports}

## Outputs
- [HTML Snapshot](./${htmlSnapshot})
- [DOM Summary](./dom-summary.md)
- [Image Inventory](./image-inventory.md)

## Screenshots
${screenshotFiles.map(file => `- [${file}](./${file})`).join('\n')}

---

${domSummary}

---

${imageInventory}
`;
  
  await writeFile(resolve(outputDir, 'page-capture.md'), markdown);
}

/**
 * Generate DOM summary markdown from structured data
 */
function formatDOMSummary(summary) {
  const lines = [];
  lines.push('## DOM Structure Summary');
  lines.push('');
  lines.push(`### Page Title: ${summary.title}`);
  lines.push('');
  
  // Headings
  lines.push('### Headings');
  for (let i = 1; i <= 6; i++) {
    const level = `h${i}`;
    if (summary.headings[level].length > 0) {
      lines.push(`#### ${level.toUpperCase()}`);
      for (const heading of summary.headings[level]) {
        lines.push(`- ${heading.text}${heading.id ? ` (#${heading.id})` : ''}`);
      }
    }
  }
  lines.push('');

  // Links
  if (summary.links.length > 0) {
    lines.push(`### Links (${summary.links.length})`);
    for (const link of summary.links.slice(0, 20)) {
      lines.push(`- [${link.text}](${link.href})${link.id ? ` (#${link.id})` : ''}`);
    }
    if (summary.links.length > 20) {
      lines.push(`- ... and ${summary.links.length - 20} more`);
    }
    lines.push('');
  }

  // Images
  if (summary.images.length > 0) {
    lines.push(`### Images (${summary.images.length})`);
    for (const img of summary.images.slice(0, 10)) {
      lines.push(`- **Src**: ${img.src}`);
      lines.push(`  **Alt**: ${img.alt}`);
      lines.push(`  **Dimensions**: ${img.width} x ${img.height}`);
    }
    if (summary.images.length > 10) {
      lines.push(`- ... and ${summary.images.length - 10} more`);
    }
    lines.push('');
  }

  // Forms
  if (summary.forms.length > 0) {
    lines.push(`### Forms (${summary.forms.length})`);
    for (const form of summary.forms) {
      lines.push(`- **Action**: ${form.action} **Method**: ${form.method}`);
      lines.push(`  **Inputs**: ${form.inputs.map(i => `${i.type}${i.name ? ` (${i.name})` : ''}`).join(', ')}`);
    }
    lines.push('');
  }

  // Interactive elements
  if (summary.interactiveElements.length > 0) {
    lines.push(`### Interactive Elements (${summary.interactiveElements.length})`);
    for (const el of summary.interactiveElements.slice(0, 10)) {
      lines.push(`- **Tag**: ${el.tag} **Text**: ${el.text}${el.id ? ` (#${el.id})` : ''}`);
    }
    if (summary.interactiveElements.length > 10) {
      lines.push(`- ... and ${summary.interactiveElements.length - 10} more`);
    }
  }

  return lines.join('\n');
}

async function captureWithPlaywright(url, outputDir, viewportList, config) {
  const { chromium } = require('playwright');
  
  // Configure browser launch options
  const browserOptions = {
    headless: config.headless
  };
  
  const browser = await chromium.launch(browserOptions);
  
  // Configure context options based on authentication
  const contextOptions = {};
  
  // Add basic auth if provided
  if (config.basicAuth) {
    const [username, password] = config.basicAuth.split(':');
    contextOptions.httpCredentials = {
      username,
      password
    };
  }
  
  const context = await browser.newContext(contextOptions);
  
  // Set cookies if provided
  if (config.cookies && config.cookies.length > 0) {
    await context.addCookies(config.cookies);
  }
  
  const page = await context.newPage();

  const screenshotFiles = [];
  const htmlSnapshot = 'html-snapshot.html';

  try {
    // Navigate to URL with retry logic
    await navigateWithRetry(page, url, config);

    // Save HTML snapshot
    const htmlContent = await page.content();
    await writeFile(resolve(outputDir, htmlSnapshot), htmlContent);

    // Extract DOM summary
    const domSummaryData = await generateDOMSummaryFromDOM(page);
    const domSummary = formatDOMSummary(domSummaryData);
    await writeFile(resolve(outputDir, 'dom-summary.md'), domSummary);

    // Also write JSON version for workflow compatibility
    await writeFile(resolve(outputDir, 'dom-summary.json'), JSON.stringify(domSummaryData, null, 2));

    // Extract image inventory
    const imageInventory = await generateImageInventoryFromPage(page);
    await writeFile(resolve(outputDir, 'image-inventory.md'), imageInventory);
    
    // Also write JSON version for workflow compatibility
    const images = await page.evaluate(() => {
      function getElementContext(el) {
        const parent = el.parentElement;
        if (parent) {
          if (parent.tagName === 'A') return `Link: ${parent.href}`;
          if (parent.classList) return `Class: ${Array.from(parent.classList).join(' ')}`;
          return parent.tagName.toLowerCase();
        }
        return 'none';
      }
      
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 'N/A',
        height: img.naturalHeight || img.height || 'N/A',
        context: getElementContext(img)
      }));
    });
    await writeFile(resolve(outputDir, 'images.json'), JSON.stringify(images, null, 2));

    // Capture screenshots for each viewport
    for (const viewport of viewportList) {
      const preset = parseViewport(viewport);
      
      // Set viewport size
      await page.setViewportSize({
        width: preset.width,
        height: preset.height
      });
      
      // Navigate again for each viewport to ensure proper rendering
      await navigateWithRetry(page, url, config);
      
      // Take screenshot
      const screenshotFile = `screenshot-${viewport}.png`;
      await page.screenshot({
        path: resolve(outputDir, screenshotFile),
        fullPage: true
      });
      screenshotFiles.push(screenshotFile);
    }

    // Generate page capture markdown
    await generatePageCaptureMarkdown(
      outputDir,
      url,
      viewportList.join(', '),
      screenshotFiles,
      htmlSnapshot,
      domSummary,
      imageInventory
    );

    console.log('Page capture complete!');
    console.log('Outputs generated:');
    console.log(`  - ${htmlSnapshot}`);
    console.log(`  - ${screenshotFiles.length} screenshots`);
    console.log('  - dom-summary.md');
    console.log('  - image-inventory.md');
    console.log('  - page-capture.md');

  } finally {
    await browser.close();
  }
}

/**
 * Navigate to URL with retry logic
 */
async function navigateWithRetry(page, url, config) {
  let lastError;
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: config.timeout 
      });
      return; // Success
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < config.retries) {
        console.log(`Retrying in ${config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError;
}

/**
 * Parse cookies from JSON string
 */
function parseCookies(cookiesStr) {
  if (!cookiesStr) return [];
  
  try {
    return JSON.parse(cookiesStr);
  } catch {
    console.warn('Invalid cookies JSON, ignoring...');
    return [];
  }
}

async function main() {
  // Check for Playwright availability
  try {
    require('playwright');
  } catch (error) {
    console.error('ERROR: Playwright is not installed.');
    console.error('Please install Playwright as a dev dependency:');
    console.error('  npm install --save-dev playwright');
    console.error('or');
    console.error('  pnpm add --save-dev playwright');
    process.exit(1);
  }

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      url: { type: 'string', required: true },
      outputDir: { type: 'string', required: true },
      viewports: { type: 'string', default: 'desktop,tablet,mobile' },
      retries: { type: 'string', default: String(DEFAULT_CONFIG.retries) },
      retryDelay: { type: 'string', default: String(DEFAULT_CONFIG.retryDelay) },
      timeout: { type: 'string', default: String(DEFAULT_CONFIG.timeout) },
      headless: { type: 'string', default: String(DEFAULT_CONFIG.headless) },
      basicAuth: { type: 'string' },
      cookies: { type: 'string' }
    }
  });

  const { 
    url, 
    outputDir, 
    viewports,
    retries: retriesStr,
    retryDelay: retryDelayStr,
    timeout: timeoutStr,
    headless: headlessStr,
    basicAuth,
    cookies: cookiesStr
  } = args.values;
  
  if (!url) {
    console.error('ERROR: --url is required');
    process.exit(1);
  }
  
  if (!outputDir) {
    console.error('ERROR: --outputDir is required');
    process.exit(1);
  }

  // Parse numeric options
  const config = {
    retries: parseInt(retriesStr, 10) || DEFAULT_CONFIG.retries,
    retryDelay: parseInt(retryDelayStr, 10) || DEFAULT_CONFIG.retryDelay,
    timeout: parseInt(timeoutStr, 10) || DEFAULT_CONFIG.timeout,
    headless: headlessStr.toLowerCase() !== 'false' && headlessStr.toLowerCase() !== '0',
    basicAuth,
    cookies: parseCookies(cookiesStr)
  };

  // Create output directory if it doesn't exist
  const outputPath = resolve(process.cwd(), outputDir);
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  console.log('Starting page capture...');
  console.log('URL:', url);
  console.log('Output directory:', outputPath);
  console.log('Viewports:', viewports);
  console.log('Retries:', config.retries);
  console.log('Retry delay:', config.retryDelay, 'ms');
  console.log('Timeout:', config.timeout, 'ms');
  console.log('Headless:', config.headless);
  if (config.basicAuth) console.log('Basic auth: configured');
  if (config.cookies.length > 0) console.log('Cookies:', config.cookies.length, 'configured');

  // Parse viewports
  const viewportList = viewports.split(',').map(v => v.trim());

  // Capture with Playwright
  await captureWithPlaywright(url, outputPath, viewportList, config);
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
