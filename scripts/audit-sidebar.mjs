#!/usr/bin/env node

import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read CSS
const tokensCSS = fs.readFileSync(path.join(__dirname, '../src/styles/tokens.css'), 'utf-8');
const indexCSS = fs.readFileSync(path.join(__dirname, '../src/styles/index.css'), 'utf-8');

// Create DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sidebar A11y Audit</title>
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

// Render Sidebar component HTML (expanded state)
const sidebarHTML = `
<div class="flint-sidebar">
  <button class="flint-icon-btn sidebar-toggle" aria-label="Toggle sidebar" aria-expanded="true">
    ☰
  </button>
  
  <div class="sidebar-content">
    <label for="sidebar-search" class="sr-only">Search navigation</label>
    <input id="sidebar-search" type="text" class="flint-input sidebar-search" placeholder="Search..." aria-label="Search navigation" />
    
    <nav class="sidebar-nav" aria-label="Main navigation">
      <button class="flint-btn active" aria-label="Home" aria-current="page">
        <span class="icon" aria-hidden="true">🏠</span>
        <span>Home</span>
      </button>
      <button class="flint-btn" aria-label="Projects">
        <span class="icon" aria-hidden="true">📁</span>
        <span>Projects</span>
      </button>
      <button class="flint-btn" aria-label="Analytics">
        <span class="icon" aria-hidden="true">📊</span>
        <span>Analytics</span>
      </button>
      <button class="flint-btn" aria-label="Settings">
        <span class="icon" aria-hidden="true">⚙️</span>
        <span>Settings</span>
      </button>
    </nav>
  </div>
</div>
`;

document.getElementById('root').innerHTML = sidebarHTML;

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
console.log('\n=== Sidebar Accessibility Audit ===\n');

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

console.log('✅ No critical or serious accessibility issues detected\n');
process.exit(0);
