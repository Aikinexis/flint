# Debug Undo/Redo - Step by Step

## How to Debug

1. **Reload the extension:**
   - Go to `chrome://extensions`
   - Click the reload button on Flint
   - Open the side panel

2. **Open DevTools Console:**
   - Right-click on the side panel
   - Select "Inspect"
   - Go to the Console tab

3. **Test typing:**
   - Type some text in the editor (e.g., "Hello world")
   - Wait 300ms
   - Look for console message: `[UndoRedo] Pushed state. History size: X, Index: Y`

4. **Test undo:**
   - Press `Cmd+Z` (Mac) or `Ctrl+Z` (Windows)
   - Look for these console messages:
     ```
     [UnifiedEditor] Undo triggered, canUndo: true/false
     [UndoRedo] Undo to index: X
     [UnifiedEditor] Undo returned state: YES/NO
     [UnifiedEditor] Restoring content: ...
     ```

## What to Check

### If you see "canUndo: false":
- The history is empty or at the beginning
- Check if you see `[UndoRedo] Pushed state` messages after typing
- If not, the debounce might not be working

### If you see "Undo returned state: NO":
- The undo function returned null
- Check the `[UndoRedo] Cannot undo` message for the reason

### If you see "Undo returned state: YES" but nothing happens:
- The state was retrieved but not applied
- Check if `onContentChange` is being called
- Check if the textarea ref is valid

## Common Issues

### Issue 1: History not being populated
**Symptoms:** No `[UndoRedo] Pushed state` messages after typing

**Fix:** Check if the initialization effect is running:
- Look for: `[UnifiedEditor] Initializing undo history with content: ...`
- If missing, the content might be empty on mount

### Issue 2: Undo triggered but canUndo is false
**Symptoms:** `canUndo: false` even after typing

**Fix:** The history index might be at 0 or -1
- Check the history size in the push messages
- Should be at least 2 states to undo (initial + after typing)

### Issue 3: Content not restoring
**Symptoms:** Undo returns state but editor doesn't change

**Fix:** Check if `onContentChange` is working:
- Add a console.log in the parent component's handler
- Verify the content is actually being updated

## Expected Console Output

### After typing "Hello":
```
[UnifiedEditor] Content changed, will push state in 300ms
[UnifiedEditor] Pushing state to history: Hello
[UndoRedo] Pushed state. History size: 2, Index: 1
```

### After pressing Cmd+Z:
```
[UnifiedEditor] Undo triggered, canUndo: true
[UndoRedo] Undo to index: 0
[UnifiedEditor] Undo returned state: YES
[UnifiedEditor] Restoring content: (empty or previous content)
[UnifiedEditor] Content changed during undo/redo, NOT pushing to history
```

### After pressing Cmd+Shift+Z:
```
[UnifiedEditor] Redo triggered, canRedo: true
[UndoRedo] Redo to index: 1
[UnifiedEditor] Redo returned state: YES
[UnifiedEditor] Restoring content: Hello
[UnifiedEditor] Content changed during undo/redo, NOT pushing to history
```

## Quick Test Script

Open the console and run:

```javascript
// Get the editor ref (you'll need to expose this for testing)
// For now, just type and watch the console

// 1. Type "test" in the editor
// 2. Wait 300ms
// 3. Press Cmd+Z
// 4. Check console for the messages above
```

## Next Steps

After you test and share the console output, I can:
1. Identify exactly where the issue is
2. Fix the specific problem
3. Ensure undo/redo works correctly
