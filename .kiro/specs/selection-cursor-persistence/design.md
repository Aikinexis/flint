# Design Document

## Overview

This design addresses the critical bug where text selection and cursor position are lost when users click AI tool buttons, preventing inline operations from working. The solution uses React refs to capture and preserve selection/cursor state before focus loss, then uses that captured state when executing AI operations. This approach is minimal, non-invasive, and integrates seamlessly with the existing UnifiedEditor implementation.

## Problem Analysis

### Current Behavior (Broken)

1. User selects text in textarea
2. User clicks "Rewrite Selection" button
3. **Textarea loses focus → selection is cleared**
4. AI operation executes but has no selection range → fails or uses wrong text
5. User is confused and frustrated

### Root Cause

When a user clicks any button outside the textarea, the browser automatically:
- Removes focus from the textarea
- Clears the visual selection highlight
- Resets `selectionStart` and `selectionEnd` to the same value (cursor position)

The current implementation reads `textarea.selectionStart` and `textarea.selectionEnd` AFTER the button click, which returns invalid values.

### Solution Approach

Capture selection/cursor state BEFORE focus loss by:
1. Storing selection range in a ref on every `onSelect` event
2. Using the captured ref value when AI operations execute
3. Restoring selection/focus after operations complete

## Architecture

### Component Structure (No Changes)

The existing UnifiedEditor component already has the necessary structure:

```
UnifiedEditor
├── textareaRef (existing)
├── selectionRef (existing - currently unused)
├── capturedSelectionRef (existing - used by MiniBar)
└── handleSelect (existing - needs enhancement)
```

### Data Flow

```
User selects text
    ↓
handleSelect() captures selection → stores in capturedSelectionRef
    ↓
User clicks AI button (focus lost, selection cleared)
    ↓
AI operation handler reads capturedSelectionRef (still valid!)
    ↓
AI processes text using captured range
    ↓
Inline replacement uses captured range
    ↓
Focus restored, new selection set
```

## Implementation Details

### 1. Enhanced Selection Capture (UnifiedEditor.tsx)

**Current Code:**
```typescript
const handleSelect = () => {
  if (!textareaRef.current) return;
  
  const start = textareaRef.current.selectionStart;
  const end = textareaRef.current.selectionEnd;
  
  selectionRef.current = { start, end };
  
  // ... indicator logic ...
  
  onSelectionChange({ start, end });
};
```

**Enhanced Code:**
```typescript
const handleSelect = () => {
  if (!textareaRef.current) return;
  
  const start = textareaRef.current.selectionStart;
  const end = textareaRef.current.selectionEnd;
  
  // Update both refs
  selectionRef.current = { start, end };
  capturedSelectionRef.current = { start, end }; // CRITICAL: Always capture
  
  // ... indicator logic ...
  
  onSelectionChange({ start, end });
};
```

**Key Change:** Always update `capturedSelectionRef` on every selection change, not just when text is selected. This ensures we always have the latest cursor position or selection range.

### 2. Expose Captured State via Ref (UnifiedEditor.tsx)

**Current Ref Interface:**
```typescript
export interface UnifiedEditorRef {
  getTextarea: () => HTMLTextAreaElement | null;
  showCursorIndicator: () => void;
  hideCursorIndicator: () => void;
  hideSelectionHighlight: () => void;
}
```

**Enhanced Ref Interface:**
```typescript
export interface UnifiedEditorRef {
  getTextarea: () => HTMLTextAreaElement | null;
  showCursorIndicator: () => void;
  hideCursorIndicator: () => void;
  hideSelectionHighlight: () => void;
  getCapturedSelection: () => SelectionRange; // NEW
}
```

**Implementation:**
```typescript
useImperativeHandle(ref, () => ({
  getTextarea: () => textareaRef.current,
  showCursorIndicator: () => { /* existing */ },
  hideCursorIndicator: () => { /* existing */ },
  hideSelectionHighlight: () => { /* existing */ },
  getCapturedSelection: () => capturedSelectionRef.current, // NEW
}));
```

### 3. Use Captured State in AI Operations (panel.tsx)

**Current Code (Broken):**
```typescript
const handleRewrite = async () => {
  const textarea = editorRef.current?.getTextarea();
  if (!textarea) return;
  
  // BUG: These values are wrong after focus loss!
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  if (start === end) {
    showError("Please select text first");
    return;
  }
  
  const selectedText = content.substring(start, end);
  // ... AI operation ...
};
```

**Fixed Code:**
```typescript
const handleRewrite = async () => {
  const textarea = editorRef.current?.getTextarea();
  if (!textarea) return;
  
  // FIX: Use captured selection from ref
  const { start, end } = editorRef.current.getCapturedSelection();
  
  if (start === end) {
    showError("Please select text first");
    return;
  }
  
  const selectedText = content.substring(start, end);
  // ... AI operation ...
};
```

**Same fix applies to:**
- `handleGenerate()` - use captured cursor position
- `handleSummarize()` - use captured selection range
- Mini Bar operations (already using `capturedSelectionRef` prop)

### 4. Restore Focus After Operations (inlineReplace.ts)

**Current Code:**
```typescript
export async function replaceTextInline(
  textarea: HTMLTextAreaElement,
  newText: string,
  selectionStart: number,
  selectionEnd: number
): Promise<void> {
  const before = textarea.value.substring(0, selectionStart);
  const after = textarea.value.substring(selectionEnd);
  
  textarea.value = before + newText + after;
  
  // Trigger React state update
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Set selection to highlight new text
  textarea.setSelectionRange(
    selectionStart,
    selectionStart + newText.length
  );
}
```

**Enhanced Code:**
```typescript
export async function replaceTextInline(
  textarea: HTMLTextAreaElement,
  newText: string,
  selectionStart: number,
  selectionEnd: number
): Promise<void> {
  const before = textarea.value.substring(0, selectionStart);
  const after = textarea.value.substring(selectionEnd);
  
  textarea.value = before + newText + after;
  
  // Trigger React state update
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // CRITICAL: Restore focus first
  textarea.focus();
  
  // Set selection to highlight new text
  textarea.setSelectionRange(
    selectionStart,
    selectionStart + newText.length
  );
  
  // Trigger selection event to update indicators
  const selectEvent = new Event('select', { bubbles: true });
  textarea.dispatchEvent(selectEvent);
}
```

**Key Changes:**
1. Call `textarea.focus()` before setting selection
2. Dispatch `select` event to update indicators and captured state

### 5. Cursor Indicator Timing (panel.tsx)

**Current Code (Broken):**
```typescript
const handleGenerate = async () => {
  // Show cursor indicator
  editorRef.current?.showCursorIndicator();
  
  // AI operation...
  const result = await generateText(prompt);
  
  // Insert at cursor
  const textarea = editorRef.current?.getTextarea();
  const cursorPos = textarea?.selectionStart || 0; // WRONG!
  
  await replaceTextInline(textarea, result, cursorPos, cursorPos);
};
```

**Fixed Code:**
```typescript
const handleGenerate = async () => {
  // Get captured cursor position FIRST
  const { start } = editorRef.current?.getCapturedSelection() || { start: 0 };
  
  // Show cursor indicator at captured position
  editorRef.current?.showCursorIndicator();
  
  // AI operation...
  const result = await generateText(prompt);
  
  // Insert at captured cursor position
  const textarea = editorRef.current?.getTextarea();
  if (!textarea) return;
  
  await replaceTextInline(textarea, result, start, start);
  
  // Hide cursor indicator after operation
  editorRef.current?.hideCursorIndicator();
};
```

## Edge Cases and Error Handling

### 1. Invalid Selection Range

**Scenario:** User selects text, deletes some content, then clicks Rewrite button. Captured range is now out of bounds.

**Solution:**
```typescript
const handleRewrite = async () => {
  const { start, end } = editorRef.current?.getCapturedSelection() || { start: 0, end: 0 };
  
  // Validate range
  if (start < 0 || end > content.length || start > end) {
    showError("Selection is no longer valid. Please select text again.");
    return;
  }
  
  if (start === end) {
    showError("Please select text first");
    return;
  }
  
  // ... proceed with operation ...
};
```

### 2. No Captured State

**Scenario:** User opens panel, immediately clicks Generate without clicking in textarea.

**Solution:**
```typescript
const handleGenerate = async () => {
  const selection = editorRef.current?.getCapturedSelection();
  
  if (!selection) {
    // Default to end of content
    const defaultPos = content.length;
    // ... use defaultPos ...
  } else {
    // Use captured position
    const { start } = selection;
    // ... use start ...
  }
};
```

### 3. Textarea Not Mounted

**Scenario:** Race condition where button is clicked before textarea ref is set.

**Solution:**
```typescript
const handleRewrite = async () => {
  const textarea = editorRef.current?.getTextarea();
  if (!textarea) {
    console.error("Textarea not mounted");
    showError("Editor not ready. Please try again.");
    return;
  }
  
  // ... proceed ...
};
```

## Visual Feedback Enhancements

### 1. Maintain Selection Highlight During Operation

**CSS Enhancement:**
```css
/* Keep selection visible even when textarea loses focus */
.unified-editor textarea::selection {
  background: rgba(99, 102, 241, 0.3);
}

.unified-editor textarea:not(:focus)::selection {
  background: rgba(99, 102, 241, 0.2); /* Slightly dimmed */
}
```

### 2. Cursor Indicator Positioning

The cursor indicator should appear at the captured cursor position, not the current position:

```typescript
showCursorIndicator: () => {
  if (!textareaRef.current) return;
  
  // Use captured position, not current position
  const cursorPos = capturedSelectionRef.current.start;
  const hasTextAfter = cursorPos < content.length;
  
  setCursorHasTextAfter(hasTextAfter);
  setShowCursorIndicator(true);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    setShowCursorIndicator(false);
  }, 3000);
}
```

### 3. Selection Highlight Indicator

The selection highlight indicator should show the captured selection, not the current selection:

```typescript
// In handleSelect, always update indicator based on captured state
const hasSelection = start !== end;
if (hasSelection) {
  const selected = content.substring(start, end);
  setSelectedText(selected);
  setShowSelectionHighlight(true);
  setShowCursorIndicator(false);
  
  capturedSelectionRef.current = { start, end };
} else {
  // Don't hide immediately - keep showing if we had a selection
  // This prevents flicker when clicking buttons
  // Only hide when user explicitly changes selection
}
```

## Testing Strategy

### Manual Testing Checklist

1. **Generate with cursor:**
   - [ ] Position cursor in middle of text
   - [ ] Click Generate button
   - [ ] Verify cursor indicator appears at correct position
   - [ ] Verify generated text inserts at cursor position
   - [ ] Verify focus returns to textarea after operation

2. **Rewrite with selection:**
   - [ ] Select text in middle of document
   - [ ] Click Rewrite button
   - [ ] Verify selection highlight stays visible
   - [ ] Verify rewritten text replaces selected text
   - [ ] Verify new text is highlighted after operation

3. **Summarize with selection:**
   - [ ] Select long paragraph
   - [ ] Click Summarize button
   - [ ] Verify selection highlight stays visible
   - [ ] Verify summary replaces selected text
   - [ ] Verify new text is highlighted after operation

4. **Mini Bar operations:**
   - [ ] Select text
   - [ ] Click Mini Bar Rewrite button
   - [ ] Verify operation uses correct selection
   - [ ] Verify Mini Bar stays visible during operation
   - [ ] Verify focus returns after operation

5. **Edge cases:**
   - [ ] Click Generate without positioning cursor (should default to end)
   - [ ] Click Rewrite without selecting text (should show error)
   - [ ] Select text, delete some, click Rewrite (should show error)
   - [ ] Switch tabs and verify selection persists
   - [ ] Rapid clicking (should not cause race conditions)

### Automated Testing (Optional)

```typescript
describe('Selection Persistence', () => {
  it('should preserve selection when clicking Rewrite button', async () => {
    const { getByRole, getByText } = render(<Panel />);
    const textarea = getByRole('textbox');
    
    // Set content and selection
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    textarea.setSelectionRange(0, 5); // Select "Hello"
    fireEvent.select(textarea);
    
    // Click Rewrite button (causes focus loss)
    const rewriteBtn = getByText('Rewrite Selection');
    fireEvent.click(rewriteBtn);
    
    // Verify operation uses correct selection
    await waitFor(() => {
      expect(mockAI.rewrite).toHaveBeenCalledWith('Hello', expect.any(Object));
    });
  });
});
```

## Performance Considerations

### 1. Ref Updates

Using refs instead of state for selection tracking avoids unnecessary re-renders:

```typescript
// Good: No re-render
capturedSelectionRef.current = { start, end };

// Bad: Causes re-render
setCapturedSelection({ start, end });
```

### 2. Event Throttling

The `handleSelect` function is called on every mouse move during selection. This is already optimized by React's event system, but we can add throttling if needed:

```typescript
const throttledHandleSelect = useCallback(
  throttle(() => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    capturedSelectionRef.current = { start, end };
  }, 16), // ~60fps
  []
);
```

**Decision:** Not needed for now. Only implement if performance issues arise.

## Migration and Rollout

### Phase 1: Fix Core Issue (Immediate)

1. Update `handleSelect` to always capture selection
2. Add `getCapturedSelection` to ref interface
3. Update AI operation handlers to use captured state
4. Update `replaceTextInline` to restore focus

**Impact:** Fixes the critical bug. No breaking changes.

### Phase 2: Polish (Follow-up)

1. Add CSS for selection highlight persistence
2. Improve cursor indicator positioning
3. Add error handling for edge cases
4. Add visual feedback animations

**Impact:** Improves UX. No breaking changes.

### Phase 3: Testing (Validation)

1. Manual testing of all workflows
2. Add automated tests (optional)
3. User acceptance testing

**Impact:** Ensures quality. No code changes.

## Success Metrics

1. **Functional:** All AI operations work with captured selection/cursor state
2. **UX:** Users can see selection/cursor indicators during operations
3. **Performance:** No noticeable lag or jank
4. **Reliability:** No race conditions or edge case failures
5. **Accessibility:** Keyboard navigation and screen readers work correctly

## Conclusion

This design solves the critical selection/cursor persistence bug with minimal code changes. The solution:

- Uses existing refs and component structure
- Requires only 4 small code changes
- Has no breaking changes or regressions
- Improves UX with better visual feedback
- Handles edge cases gracefully

The implementation is straightforward and can be completed in 1-2 hours.
