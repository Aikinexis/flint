# Step-by-Step Testing Guide

## Before You Start

1. **Rebuild the extension:**
   ```bash
   npm run build
   ```

2. **Reload in Chrome:**
   - Go to `chrome://extensions/`
   - Find "Flint" extension
   - Click the reload icon (circular arrow)

3. **Open DevTools:**
   - Right-click on the Flint extension icon
   - Click "Inspect" or "Inspect popup"
   - Go to the "Console" tab
   - Keep this open while testing

## Test 1: Generate Tool (Cursor Indicator)

### Steps:
1. Click the **Generate** tab (✨ sparkle icon)
2. Type a prompt in the input field (e.g., "Write a greeting")
3. Click the **Generate button** (sparkle icon on the right)

### What to Check:
- **Console should show:**
  ```
  [ToolControls] Showing cursor indicator, editorRef: {...}
  [UnifiedEditor] showCursorIndicator called, textarea: <textarea>
  [UnifiedEditor] Cursor position: X hasTextAfter: true/false
  [UnifiedEditor] Cursor indicator state set to true
  ```

- **Visual indicator should appear** at top-left of editor:
  - If cursor at end: `| →`
  - If cursor in middle: `← | →`

### If It Doesn't Work:
- Copy the console output
- Check if you see "editorRef: undefined"
- Take a screenshot

## Test 2: Rewrite Tool (Selection Highlight)

### Steps:
1. Click the **Rewrite** tab (✏️ pencil icon)
2. **Type or paste some text** in the editor (e.g., "Hello world")
3. **Select the text** (click and drag to highlight it)
4. **You should see** at top-left: `✓ 2 words selected`
5. Click the **dropdown arrow** (↓) on the left side of the input field
6. Choose a preset like "Formal" or "Simplify"
7. Click the **Rewrite button** (pencil icon on the right)

### What to Check:
- **Console should show:**
  ```
  [ToolControls] Rewrite clicked, selection: {start: X, end: Y}, customPrompt: "Formal"
  [ToolControls] Text to rewrite: "Hello world..."
  [ToolControls] Calling AIService.rewrite...
  [ToolControls] Rewrite complete, result length: XX
  ```

- **Selection highlight should stay visible** (not disappear when clicking button)

### Common Mistakes:
- ❌ Not selecting text first
- ❌ Not choosing a preset or typing instructions
- ❌ Clicking the input field instead of the rewrite button

### If You Get Errors:
- **"Please type or paste text in the editor first"** → Add text to editor
- **"Please choose a preset from the dropdown (↓) or type rewrite instructions"** → Click dropdown arrow and select a preset

## Test 3: Summarize Tool

### Steps:
1. Click the **Summarize** tab (📝 document icon)
2. **Type or paste some text** (at least a paragraph)
3. **Select the text** you want to summarize
4. **You should see** at top-left: `✓ X words selected`
5. Choose a summary format (Bullets, Paragraph, or Brief)
6. Click the **Summarize button**

### What to Check:
- **Console should show:**
  ```
  [ToolControls] Text to summarize: "Your text..."
  [AIService] Summarizing...
  ```

- **Selection highlight should stay visible**

## Troubleshooting

### Issue: "editorRef: undefined" in Console

**This means the ref isn't being passed.**

Check in `src/panel/panel.tsx` that you have:
```typescript
<ToolControlsContainer
  activeTool="generate"
  editorRef={generateEditorRef}  // ← This line
  // ... other props
/>
```

### Issue: Cursor Indicator Never Appears

1. Check console for errors
2. Verify `showCursorIndicator` is being called
3. Check if `showCursorIndicator` state is true
4. Look for the indicator div in Elements tab

### Issue: Selection Disappears on Click

1. Check that button uses `onMouseDown` not `onClick`
2. Verify `e?.preventDefault()` is in the handler
3. Check console for any errors

### Issue: "Please enter rewrite instructions"

You need to either:
- Click the dropdown arrow (↓) and select a preset, OR
- Type your own instructions in the input field

The dropdown is on the LEFT side of the input field.

## What the Console Logs Mean

### Good Signs:
```
✅ [ToolControls] Showing cursor indicator, editorRef: {current: {...}}
✅ [UnifiedEditor] showCursorIndicator called
✅ [UnifiedEditor] Cursor indicator state set to true
✅ [ToolControls] Rewrite clicked, selection: {start: 0, end: 11}
✅ [ToolControls] Calling AIService.rewrite...
```

### Bad Signs:
```
❌ [ToolControls] Showing cursor indicator, editorRef: undefined
❌ [UnifiedEditor] No textarea ref, returning
❌ Uncaught TypeError: Cannot read property 'showCursorIndicator' of undefined
```

## Quick Checklist

Before reporting issues, verify:
- [ ] Extension was rebuilt (`npm run build`)
- [ ] Extension was reloaded in Chrome
- [ ] DevTools Console is open
- [ ] You followed the exact steps above
- [ ] You have console output to share
- [ ] You tried all three tools (Generate, Rewrite, Summarize)

## Next Steps

After testing, please share:
1. **Console output** (copy/paste or screenshot)
2. **Which tool(s) didn't work**
3. **What you saw vs. what you expected**
4. **Any error messages**

This will help me identify the exact issue!
