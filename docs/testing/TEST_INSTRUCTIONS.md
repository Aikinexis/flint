# Testing Instructions for Unified Editor

## Current Status
- ✅ Build: Successful (276.64 KB)
- ✅ TypeScript: No errors
- ✅ All components created

## Issues Reported
1. Can't type in textarea properly
2. Icons styled wrong
3. AI doesn't work
4. Inline features don't work

## Testing Steps

### 1. Reload the Extension
```
1. Go to chrome://extensions/
2. Find Flint extension
3. Click the reload button (circular arrow)
4. Close and reopen the side panel
```

### 2. Test Textarea
```
1. Click Generate tab
2. Try typing in the large textarea
3. Verify text appears correctly
4. Try selecting text
```

### 3. Test Generate Feature
```
1. Type a prompt in the bottom input field (e.g., "Write a haiku about coding")
2. Click the sparkles button (✨)
3. Check browser console (F12) for errors
4. Verify text appears in the textarea above
```

### 4. Test Rewrite Feature
```
1. Click Rewrite tab
2. Type or paste some text in the textarea
3. Type instructions in the bottom input (e.g., "Make it more formal")
4. Click the pencil button (✏️)
5. Check console for errors
```

### 5. Test Summarize Feature
```
1. Click Summary tab
2. Paste some text in the textarea
3. Select a mode (Bullets/Paragraph/Brief)
4. Click "Summarize" button
5. Check console for errors
```

### 6. Check Console for Errors
Open DevTools (F12) and look for:
- Red error messages
- Failed API calls
- "User activation" errors
- Any other warnings

## Common Issues & Fixes

### Issue: "User activation required"
**Fix:** This is normal. Click the button again. AI APIs require a user click.

### Issue: "AI features require Chrome 128+"
**Fix:** 
1. Check Chrome version: chrome://version/
2. Enable flags: chrome://flags/#optimization-guide-on-device-model
3. Enable: chrome://flags/#prompt-api-for-gemini-nano

### Issue: Textarea not responding
**Fix:**
1. Check if there are JavaScript errors in console
2. Try clicking directly in the textarea
3. Reload the extension

### Issue: Icons wrong color
**Fix:** This should be fixed in the latest build. If not:
1. Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Reload extension

## Debug Mode

To see detailed logs:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for messages starting with:
   - `[Panel]`
   - `[AI]`
   - `[ToolControlsContainer]`
   - `[MiniBar]`

## What Should Work

✅ **Typing in textarea** - Should work immediately
✅ **Switching tabs** - Content should persist
✅ **Generate button** - Should generate text (if AI enabled)
✅ **Rewrite button** - Should rewrite text (if AI enabled)
✅ **Summarize button** - Should summarize text (if AI enabled)
✅ **Projects button** - Should open modal
✅ **History toggle** - Should slide panel from left

## If Nothing Works

1. **Check the console** - There will be error messages
2. **Share the error** - Copy the error message
3. **Try the old version** - Switch to main branch: `git checkout main`
4. **Rebuild** - Run `npm run build`
5. **Reload extension** - In chrome://extensions/

## Expected Behavior

When you click Generate/Rewrite/Summarize:
1. Button shows "..." or "Processing..."
2. Console shows "[AI] ..." messages
3. After 1-5 seconds, result appears in textarea
4. Text is automatically selected/highlighted
5. Snapshot is created (if project is open)

## Mock Mode

If AI APIs are not available, the extension uses mock responses:
- Generate: Returns template text
- Rewrite: Returns simple transformation
- Summarize: Returns first few sentences

This is NORMAL and expected if:
- Chrome < 128
- Gemini Nano not enabled
- Extension context limitations
