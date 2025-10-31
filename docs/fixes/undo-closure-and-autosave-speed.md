# Undo Closure Bug and Auto-Save Speed Fix

## Issue 1: Undo Capturing Wrong Content

### Problem
The undo system was capturing the same content for multiple states, making undo appear to "leave some text" or not work properly. Looking at the logs:
```
[UnifiedEditor] Restoring content: Meet Flint, your new Chrome extension for AI-power
[UnifiedEditor] Restoring content: Meet Flint, your new Chrome extension for AI-power
```
All undo states had identical content!

### Root Cause
The debounced push to history was using `newContent` from the closure:
```typescript
pushStateTimeoutRef.current = setTimeout(() => {
  undoRedoRef.current.pushState({
    content: newContent,  // ❌ Stale value from closure!
    ...
  });
}, 300);
```

When the user types quickly, `newContent` is captured when `handleChange` is called, but by the time the timeout fires 300ms later, the user has typed more characters. The closure still has the old value, so it pushes the wrong content to history.

### Solution
Get the current content from the textarea at push time, not from the closure:
```typescript
pushStateTimeoutRef.current = setTimeout(() => {
  if (textareaRef.current) {
    const currentContent = textareaRef.current.value;  // ✅ Current value!
    undoRedoRef.current.pushState({
      content: currentContent,
      ...
    });
  }
}, 300);
```

Now each undo state captures the actual content at the time of the push, not a stale value from 300ms ago.

## Issue 2: Auto-Save Too Slow

### Problem
Auto-save had a 500ms delay, which felt sluggish. Users wanted faster saves.

### Solution
Reduced auto-save delay from 500ms to 200ms:
```typescript
// Before: 500ms delay
autoSaveTimeoutRef.current = setTimeout(async () => { ... }, 500);

// After: 200ms delay
autoSaveTimeoutRef.current = setTimeout(async () => { ... }, 200);
```

### Benefits
- Faster feedback (saved checkmark appears sooner)
- Less chance of losing work
- Still debounced enough to avoid excessive saves during typing
- More responsive feel

## Technical Details

### Why Debouncing?
Both undo and auto-save use debouncing to avoid:
- Creating too many undo states (one per keystroke)
- Saving too frequently (excessive storage writes)

### Timing Balance
- **Undo**: 300ms debounce (captures typing pauses)
- **Auto-save**: 200ms debounce (faster saves, still efficient)

### Closure Pitfall
This is a classic JavaScript closure bug:
1. Function captures variable from outer scope
2. Async operation (setTimeout) runs later
3. By the time it runs, the captured variable is stale
4. Solution: Get fresh value from ref/DOM at execution time

## Files Modified
- `src/components/UnifiedEditor.tsx` - Fixed closure bug in handleChange
- `src/panel/panel.tsx` - Reduced auto-save delay from 500ms to 200ms

## Testing
- Type quickly and undo - should restore correct previous states
- Type and watch save icon - should show checkmark faster
- Undo multiple times - each state should be different
- Check logs - "Pushing state to history" should show different content each time
