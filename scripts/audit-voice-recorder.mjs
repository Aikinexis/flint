#!/usr/bin/env node

import { JSDOM } from 'jsdom';
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
  <title>VoiceRecorder A11y Audit</title>
  <style>${tokensCSS}</style>
  <style>${indexCSS}</style>
</head>
<body class="flint-bg">
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

// Render VoiceRecorder component HTML
const voiceRecorderHTML = `
<div class="flint-section flex flex-col h-full">
  <h2 class="flint-section-header">Voice to text</h2>

  <!-- Primary action group - Record and Clear -->
  <div class="flint-action-group mb-4">
    <button class="flint-btn primary">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="6" />
      </svg>
      Record
    </button>
    <button class="flint-btn ghost">
      Clear
    </button>
  </div>

  <!-- Secondary actions - Insert and Copy -->
  <div class="flint-action-group mb-4">
    <button class="flint-btn">Insert at cursor</button>
    <button class="flint-btn ghost">Copy</button>
  </div>

  <!-- Transcript area -->
  <div class="flex-1 flex flex-col min-h-0">
    <textarea
      class="flint-textarea w-full h-full resize-none"
      placeholder="Your transcript will appear here..."
    ></textarea>
  </div>
</div>
`;

document.getElementById('root').innerHTML = voiceRecorderHTML;

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
    'tabindex': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'landmark-one-main': { enabled: false },
    'region': { enabled: false }
  }
});

// Format results
console.log('\n=== VoiceRecorder Accessibility Audit ===\n');

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
  console.log('=== Incomplete Checks (Manual Review Needed) ===\n');
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

console.log('✅ No critical or serious accessibility issues found\n');
process.exit(0);
