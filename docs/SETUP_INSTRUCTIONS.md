# Flint UI Setup Instructions

## Installation

The UI implementation is complete. To run tests and verify everything works:

### 1. Install Dependencies

```bash
npm install
```

This will install the newly added test dependencies:
- `@playwright/test` - E2E testing
- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers
- `jest-environment-jsdom` - Browser environment for Jest
- `identity-obj-proxy` - CSS module mocking

### 2. Run Type Check

```bash
npm run type-check
```

Expected: ✅ Zero TypeScript errors

### 3. Build the Extension

```bash
npm run build
```

Expected output:
- `dist/src/panel/panel.js` - ~148 KB (47 KB gzipped)
- `dist/src/panel/panel.css` - ~11 KB (2.5 KB gzipped)
- Total under 1 MB budget ✅

### 4. Run Unit Tests

```bash
npm test
```

Tests include:
- Button focus visibility
- Input focus states
- WCAG AA contrast validation

### 5. Run E2E Tests (Optional)

```bash
npm run test:e2e
```

This will:
1. Start dev server on port 5173
2. Run Playwright tests for:
   - Panel opening
   - Tab navigation
   - Keyboard focus order
   - Theme toggle

### 6. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. Click the Flint icon or open side panel

## Verification Checklist

### Visual Verification
- [ ] Panel opens with tabbed interface
- [ ] All tabs (Voice, Rewrite, Summary, Settings) are visible
- [ ] Buttons have consistent height (38px)
- [ ] Primary buttons use yellow-green color
- [ ] Focus states are visible (blue outline)
- [ ] Theme toggle works (Settings tab)

### Keyboard Navigation
- [ ] Tab key moves focus through controls
- [ ] Focus is always visible
- [ ] Enter/Space activates buttons
- [ ] Tab order is logical

### Color Verification
Open DevTools and check computed styles:

**Primary button:**
- Background: `oklch(0.54 0.11 60)`
- Text: `oklch(0.12 0 60)`

**Secondary button:**
- Background: `oklch(0.64 0.15 60)`
- Text: `oklch(0.12 0 60)`

**Body text (dark mode):**
- Background: `oklch(0.15 0 60)`
- Text: `oklch(0.96 0 60)`

### Gestalt Similarity Check
- [ ] All primary action buttons look the same
- [ ] All ghost buttons look the same
- [ ] All section headers look the same
- [ ] All inputs have same border/radius
- [ ] Related buttons have equal spacing (8px)
- [ ] All icons in same context are same size

## Troubleshooting

### Tests fail with "jest-environment-jsdom not found"
```bash
npm install jest-environment-jsdom --save-dev
```

### Playwright tests fail
Make sure dev server is running:
```bash
npm run dev
```
Then in another terminal:
```bash
npm run test:e2e
```

### Extension doesn't load
1. Check that `dist` folder exists
2. Run `npm run build` again
3. Verify `dist/manifest.json` exists
4. Check Chrome console for errors

### Colors look wrong
1. Verify browser supports OKLCH (Chrome 111+)
2. Check DevTools computed styles
3. Ensure no browser extensions interfering with CSS

## Development Workflow

### Making Changes
1. Edit source files in `src/`
2. Run `npm run type-check` to verify TypeScript
3. Run `npm run build` to compile
4. Reload extension in Chrome (click reload icon)

### Adding New Components
1. Create component in `src/components/`
2. Use existing token classes (`.flint-btn`, `.flint-section`, etc.)
3. Follow Gestalt similarity principles
4. Add tests in same directory
5. Import in `panel.tsx`

### Modifying Tokens
1. Edit `src/styles/tokens.css`
2. Keep OKLCH values exact
3. Update both dark and light themes
4. Verify contrast ratios
5. Test in both themes

## Next Steps

After setup is complete:
1. Implement actual AI service integration
2. Add speech recognition functionality
3. Connect content scripts for text selection
4. Add storage for user preferences
5. Implement actual rewrite/summarize logic

## Resources

- [OKLCH Color Picker](https://oklch.com)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Gestalt Principles](https://www.interaction-design.org/literature/topics/gestalt-principles)
