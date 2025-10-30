# Manual Test Files

This folder contains HTML test files for manually testing specific features and components of the Flint Chrome extension.

## Contents

Test files are organized by feature area:

### AI Features
- **test-ai-availability.html** - Test AI API availability detection
- **test-ai-banner.html** - Test AI availability banner
- **test-ai-check.html** - Test AI capability checks
- **test-prompt-api-debug.html** - Debug Prompt API issues
- **test-prompt-api-simple.html** - Simple Prompt API test

### Editor Features
- **test-unified-editor-indicators.html** - Test unified editor indicators
- **test-selection-cursor-indicators.html** - Test selection and cursor indicators
- **test-selection-debug.html** - Debug selection handling
- **test-text-replacement.html** - Test text replacement functionality

### UI Components
- **test-minibar.html** - Test mini bar component
- **test-minibar-focus.html** - Test mini bar focus handling
- **test-minibar-selection-fix.html** - Test mini bar selection fixes
- **test-floating-minibar.html** - Test floating mini bar positioning
- **test-collapsible-settings.html** - Test collapsible settings panel

### Error Handling
- **test-error-boundary.html** - Test error boundary component
- **test-error-handling.html** - Test error handling flows

### Other Features
- **test-clipboard-fallback.html** - Test clipboard fallback mechanism
- **test-history-fix.html** - Test history functionality fixes
- **test-migration.html** - Test data migration
- **test.html** - General test file

## Usage

1. Open any test file in Chrome
2. Follow the instructions in the test file
3. Verify expected behavior
4. Report any issues found

## Note

These are manual test files for development and debugging. Automated tests are located in the `src/` directory with `.test.ts` or `.test.tsx` extensions.
