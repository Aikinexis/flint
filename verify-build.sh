#!/bin/bash

# Verification script for collapsible sidebar build

echo "🔍 Verifying Flint Extension Build..."
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ dist directory not found. Run 'npm run build' first."
  exit 1
fi

echo "✅ dist directory exists"

# Check manifest.json
if [ ! -f "dist/manifest.json" ]; then
  echo "❌ manifest.json not found in dist"
  exit 1
fi
echo "✅ manifest.json present"

# Check icons
if [ ! -d "dist/icons" ]; then
  echo "❌ icons directory not found"
  exit 1
fi
echo "✅ icons directory present"

# Check panel files
if [ ! -f "dist/src/panel/index.html" ]; then
  echo "❌ panel/index.html not found"
  exit 1
fi
echo "✅ panel/index.html present"

if [ ! -f "dist/src/panel/panel.js" ]; then
  echo "❌ panel/panel.js not found"
  exit 1
fi
echo "✅ panel/panel.js present"

if [ ! -f "dist/src/panel/panel.css" ]; then
  echo "❌ panel/panel.css not found"
  exit 1
fi
echo "✅ panel/panel.css present"

# Check background script
if [ ! -f "dist/src/background/background.js" ]; then
  echo "❌ background/background.js not found"
  exit 1
fi
echo "✅ background/background.js present"

# Check for Sidebar styles in CSS
if grep -q "flint-sidebar" "dist/src/panel/panel.css"; then
  echo "✅ Sidebar styles found in CSS"
else
  echo "❌ Sidebar styles not found in CSS"
  exit 1
fi

# Check bundle size
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "📦 Bundle size: $BUNDLE_SIZE"

echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Next steps:"
echo "1. Open Chrome and navigate to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo "4. Click the Flint extension icon to open the side panel"
echo "5. Follow the testing guide in TESTING_GUIDE.md"
echo ""
