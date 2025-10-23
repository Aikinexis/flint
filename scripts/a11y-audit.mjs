#!/usr/bin/env node

import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import axe from 'axe-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read and inject CSS tokens
const tokensCSS = fs.readFileSync(path.join(__dirname, '../src/styles/tokens.css'), 'utf-8');
const indexCSS = fs.readFileSync(path.join(__dirname, '../src/styles/index.css'), 'utf-8');

// Create DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A11y Audit</title>
  <style>${tokensCSS}</style>
  <style>${indexCSS}</style>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
  runScripts: 'dangerously'
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true
});

// Manually create the component HTML for testing
const componentHTML = `
<div class="flint-bg min-h-screen p-6">
  <div class="max-w-4xl mx-auto">
    <div class="flint-toolbar mb-6">
      <h1 class="text-xl font-semibold">Flint Design System Demo</h1>
      <button class="flint-btn" aria-label="Switch to light mode">🌙 Dark</button>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Color palette</h2>
      <div class="grid grid-cols-4 gap-3">
        <div><div class="h-16 rounded-md border border-border-muted mb-2" style="background: var(--primary)" role="img" aria-label="Primary color swatch"></div><p class="text-xs text-text-muted text-center">Primary</p></div>
        <div><div class="h-16 rounded-md border border-border-muted mb-2" style="background: var(--secondary)" role="img" aria-label="Secondary color swatch"></div><p class="text-xs text-text-muted text-center">Secondary</p></div>
        <div><div class="h-16 rounded-md border border-border-muted mb-2" style="background: var(--danger)" role="img" aria-label="Danger color swatch"></div><p class="text-xs text-text-muted text-center">Danger</p></div>
        <div><div class="h-16 rounded-md border border-border-muted mb-2" style="background: var(--success)" role="img" aria-label="Success color swatch"></div><p class="text-xs text-text-muted text-center">Success</p></div>
      </div>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Buttons (similar actions look alike)</h2>
      <div class="mb-4">
        <p class="text-text-muted text-sm mb-2">Primary actions - all share same style:</p>
        <div class="flint-action-group">
          <button class="flint-btn primary">Record</button>
          <button class="flint-btn primary">Rewrite</button>
          <button class="flint-btn primary">Summarize</button>
        </div>
      </div>
      <div class="mb-4">
        <p class="text-text-muted text-sm mb-2">Secondary actions - all share same style:</p>
        <div class="flint-action-group">
          <button class="flint-btn">Copy</button>
          <button class="flint-btn">Insert</button>
          <button class="flint-btn">Export</button>
        </div>
      </div>
      <div class="mb-4">
        <p class="text-text-muted text-sm mb-2">Cancel/Clear actions - all share same style:</p>
        <div class="flint-action-group">
          <button class="flint-btn ghost">Cancel</button>
          <button class="flint-btn ghost">Clear</button>
          <button class="flint-btn ghost">Discard</button>
        </div>
      </div>
      <div>
        <p class="text-text-muted text-sm mb-2">Selected state - all share same style:</p>
        <div class="flint-action-group">
          <button class="flint-btn secondary">Active Tab</button>
          <button class="flint-btn secondary">Selected Tone</button>
          <button class="flint-btn secondary">Current Mode</button>
        </div>
      </div>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Icon buttons (same size, shape, spacing)</h2>
      <div class="flint-action-group">
        <button class="flint-icon-btn primary" aria-label="Record">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><circle cx="9" cy="9" r="7" /></svg>
        </button>
        <button class="flint-icon-btn primary" aria-label="Summarize">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="3" y="4" width="12" height="2" rx="1" /><rect x="3" y="8" width="8" height="2" rx="1" /><rect x="3" y="12" width="10" height="2" rx="1" /></svg>
        </button>
        <button class="flint-icon-btn primary" aria-label="Rewrite">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor"><path d="M9 3L15 9L9 15M15 9H3" stroke-width="2" /></svg>
        </button>
      </div>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Inputs (consistent border, radius, padding)</h2>
      <label for="demo-text-input" class="sr-only">Demo text input</label>
      <input id="demo-text-input" type="text" class="flint-input w-full mb-3" placeholder="Text input..." aria-label="Demo text input" />
      <label for="demo-textarea" class="sr-only">Demo textarea</label>
      <textarea id="demo-textarea" class="flint-textarea w-full" placeholder="Textarea..." rows="3" aria-label="Demo textarea"></textarea>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Status badges</h2>
      <div class="flint-action-group">
        <span class="flint-badge danger">Error</span>
        <span class="flint-badge warning">Warning</span>
        <span class="flint-badge success">Success</span>
        <span class="flint-badge info">Info</span>
      </div>
    </div>
    
    <div class="flint-section mb-4">
      <h2 class="flint-section-header">Spacing & alignment (8px gap, consistent)</h2>
      <div class="flint-action-group mb-3">
        <button class="flint-btn primary">Action 1</button>
        <button class="flint-btn primary">Action 2</button>
        <button class="flint-btn primary">Action 3</button>
      </div>
      <p class="text-text-muted text-xs">↑ All buttons have 8px gap between them</p>
    </div>
    
    <div class="flint-section">
      <h2 class="flint-section-header">Focus states (tab to see)</h2>
      <p class="text-text-muted text-sm mb-3">Press Tab to navigate. All interactive elements show visible focus outline.</p>
      <div class="flint-action-group">
        <button class="flint-btn primary">Button 1</button>
        <button class="flint-btn">Button 2</button>
        <label for="demo-focus-input" class="sr-only">Demo focus input</label>
        <input id="demo-focus-input" type="text" class="flint-input" placeholder="Input" style="width: 150px" aria-label="Demo focus input" />
      </div>
    </div>
  </div>
</div>
`;

document.getElementById('root').innerHTML = componentHTML;

// Wait for render
await new Promise(resolve => setTimeout(resolve, 100));

// Run axe
const results = await axe.run(document.body, {
  rules: {
    'color-contrast': { enabled: true },
    'button-name': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'tabindex': { enabled: true },
    'landmark-one-main': { enabled: false }, // Not applicable for component
    'region': { enabled: false } // Not applicable for component
  }
});

// Format results
console.log('\n=== Accessibility Audit Results ===\n');

if (results.violations.length === 0) {
  console.log('✅ No accessibility violations found!\n');
} else {
  console.log(`❌ Found ${results.violations.length} violation(s):\n`);
  
  results.violations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.id} [${violation.impact}]`);
    console.log(`   ${violation.description}`);
    console.log(`   Help: ${violation.helpUrl}`);
    console.log(`   Affected elements: ${violation.nodes.length}`);
    
    violation.nodes.forEach((node, nodeIndex) => {
      console.log(`   ${nodeIndex + 1}) ${node.html.substring(0, 100)}...`);
      console.log(`      ${node.failureSummary}`);
    });
    console.log('');
  });
}

// Incomplete checks
if (results.incomplete.length > 0) {
  console.log('=== Incomplete Checks ===\n');
  results.incomplete.forEach((item, index) => {
    console.log(`${index + 1}. ${item.id}`);
    console.log(`   ${item.description}`);
    console.log(`   Affected elements: ${item.nodes.length}`);
    item.nodes.forEach((node, nodeIndex) => {
      console.log(`   ${nodeIndex + 1}) ${node.html.substring(0, 80)}...`);
    });
    console.log('');
  });
}

// Summary
console.log('=== Summary ===');
console.log(`Passes: ${results.passes.length}`);
console.log(`Violations: ${results.violations.length}`);
console.log(`Incomplete: ${results.incomplete.length}`);
console.log(`Inapplicable: ${results.inapplicable.length}\n`);

// Exit with error if critical/serious violations
const criticalViolations = results.violations.filter(v => 
  v.impact === 'critical' || v.impact === 'serious'
);

if (criticalViolations.length > 0) {
  console.log(`⚠️  ${criticalViolations.length} critical/serious violations found`);
  process.exit(1);
}

process.exit(0);
