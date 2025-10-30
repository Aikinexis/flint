# SIMPLE TEST - Selection Should Stay

## What I Fixed

**The `e.preventDefault()` is now called BEFORE the handler**, which prevents the button from stealing focus and clearing the selection.

## Test It

### 1. Rebuild & Reload
```bash
npm run build
```
Then reload extension in Chrome.

### 2. Test Rewrite

1. Go to Rewrite tab
2. Type: "hello world"
3. **SELECT the text** (drag to highlight)
4. Click dropdown arrow (↓) → Choose "Formal"
5. **Click Rewrite button**
6. **Selection should STAY HIGHLIGHTED**

### 3. Test Summarize

1. Go to Summarize tab
2. Paste a paragraph
3. **SELECT the text**
4. **Click Summarize button**
5. **Selection should STAY HIGHLIGHTED**

## If It Still Doesn't Work

Open console (F12) and share what you see when you click the buttons.

The key fix: `onMouseDown={(e) => { e.preventDefault(); handleRewrite(); }}`

This prevents the button from taking focus, which is what clears the selection.
