# Debugging Indicators - Troubleshooting Guide

## Changes Made

### 1. Fixed Rewrite/Summarize to Use Selected Text

**Problem:** Rewrite and Summarize were operating on the entire content instead of just the selected text.

**Fix:**
```typescript
// Before:
const result = await AIService.rewrite(content, {...});

// After:
const textToRewrite = _selection && _selection.start !== _selection.end
  ? content.substring(_selection.start, _selection.end)
  : content;
const result = await AIService.rewrite(textToRewrite, {...});
```

### 2. Added Console Logging for Debugging

Added logging to track:
- When `showCursorIndicator()` is called
- Whether the editor ref exists
- Cursor position and direction
- When indicator state changes

## How to Debug

### Step 1: Open Chrome DevTools

1. Load the extension in Chrome
2. Right-click on the extension icon → "Inspect popup" or open the side panel
3. Open DevTools Console tab

### Step 2: Test Generate Tool

1. Click on Generate tab
2. Type a prompt
3. Click the Generate button (sparkle icon)
4. **Check console for:**
   ```
   [ToolControls] Showing cursor indicator, editorRef: {...}
   [UnifiedEditor] showCursorIndicator called, textarea: <textarea>
   [UnifiedEditor] Cursor position: X hasTextAfter: true/false
   [UnifiedEditor] Cursor indicator state set to true
   ```

5. **If you see "editorRef: undefined":**
   - The ref is not being passed correctly
   - Check that `editorRef={generateEditorRef}` is in panel.tsx

6. **If you see "No textarea ref, returning":**
   - The UnifiedEditor hasn't mounted yet
   - Or the ref isn't being set properly

### Step 3: Test Rewrite Tool

1. Click on Rewrite tab
2. Type or paste some text in the editor
3. **Select some text** (important!)
4. Choose a preset or type instructions
5. Click the Rewrite button (pencil icon)
6. **Check console for:**
   - No "Please enter rewrite instructions" error
   - AI operation starting
   - Result being returned

7. **If you see "Please select or enter text to rewrite":**
   - No text is selected
   - Try selecting text first

8. **If selection disappears when clicking:**
   - Check that button uses `onMouseDown` not `onClick`
   - Check that `e?.preventDefault()` is being called

### Step 4: Test Summarize Tool

1. Click on Summarize tab
2. Type or paste some text
3. **Select some text**
4. Choose a summary mode
5. Click Summarize button
6. **Check console for:**
   - No "Please select or enter text to summarize" error
   - AI operation starting

## Common Issues

### Issue 1: Cursor Indicator Not Showing

**Symptoms:**
- No indicator appears when clicking Generate
- Console shows "editorRef: undefined"

**Solutions:**
1. Check that `editorRef={generateEditorRef}` is passed to ToolControlsContainer
2. Check that `ref={generateEditorRef}` is passed to UnifiedEditor
3. Rebuild the extension: `npm run build`
4. Reload the extension in Chrome

### Issue 2: Selection Disappears on Click

**Symptoms:**
- Text selection clears when clicking Rewrite/Summarize button
- Selection highlight disappears

**Solutions:**
1. Check that button uses `onMouseDown` instead of `onClick`
2. Check that handler has `e?.preventDefault()`
3. Verify in DevTools that the button element has `onmousedown` attribute

### Issue 3: "Please enter rewrite instructions" Error

**Symptoms:**
- Error appears even though you selected text
- Rewrite doesn't work

**Solutions:**
1. Make sure you've entered instructions in the input field (or selected a preset)
2. The input field should not be empty
3. Check console for the actual error message

### Issue 4: Rewrite/Summarize Uses Wrong Text

**Symptoms:**
- Operation processes entire document instead of selection
- Wrong text is being rewritten/summarized

**Solutions:**
1. Check that `_selection` prop is being passed to ToolControlsContainer
2. Check that `selection={editorSelection}` is in panel.tsx
3. Verify selection state is being tracked in UnifiedEditor

## Console Commands for Testing

Open DevTools console and try these:

```javascript
// Check if editor ref exists
console.log('Generate ref:', window.generateEditorRef);

// Manually trigger cursor indicator
if (window.generateEditorRef?.current) {
  window.generateEditorRef.current.showCursorIndicator();
}

// Check selection state
const textarea = document.querySelector('textarea');
console.log('Selection:', {
  start: textarea.selectionStart,
  end: textarea.selectionEnd,
  text: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
});
```

## Expected Console Output

### When Generate Button is Clicked:
```
[ToolControls] Showing cursor indicator, editorRef: {current: {...}}
[UnifiedEditor] showCursorIndicator called, textarea: <textarea>
[UnifiedEditor] Cursor position: 42 hasTextAfter: true
[UnifiedEditor] Cursor indicator state set to true
[UnifiedEditor] Cursor indicator auto-hidden (after 3 seconds)
```

### When Rewrite Button is Clicked:
```
[AIService] Rewriting text: "selected text here..."
[AIService] Rewrite complete
```

### When Summarize Button is Clicked:
```
[AIService] Summarizing text: "selected text here..."
[AIService] Summary complete
```

## Next Steps

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Reload in Chrome:**
   - Go to `chrome://extensions/`
   - Click reload icon on Flint extension

3. **Test each tool:**
   - Generate: Type prompt → Click button → Check console
   - Rewrite: Select text → Enter instructions → Click button
   - Summarize: Select text → Click button

4. **Report findings:**
   - Copy console output
   - Note which step fails
   - Check if any errors appear

## Files Modified

- `src/components/ToolControlsContainer.tsx` - Fixed selection handling, added logging
- `src/components/UnifiedEditor.tsx` - Added logging to showCursorIndicator
- `src/panel/panel.tsx` - Passed editor refs to ToolControlsContainer

## Build Status

✅ Build successful: 334.04 KB (panel.js)
✅ No TypeScript errors
✅ Ready for testing with debug logging
