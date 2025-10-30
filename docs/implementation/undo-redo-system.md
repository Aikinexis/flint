# Undo/Redo System Implementation

## Overview

Flint implements a custom undo/redo system that works seamlessly with both manual text editing and AI-generated content changes. This is necessary because the native browser undo/redo stack is broken when content is programmatically changed (which happens during AI operations).

## Architecture

### Core Hook: `useUndoRedo`

Location: `src/hooks/useUndoRedo.ts`

The hook maintains a history stack of editor states, where each state includes:
- `content`: The full text content
- `selectionStart`: Cursor/selection start position
- `selectionEnd`: Cursor/selection end position

**Key Features:**
- Maximum history size (default: 100 states)
- Debounced state pushing to avoid excessive history entries during typing
- Automatic redo history clearing when new edits are made after undo
- Selection state preservation

### Integration: `UnifiedEditor`

Location: `src/components/UnifiedEditor.tsx`

The editor component integrates the undo/redo system with:

1. **Keyboard Shortcuts:**
   - `Cmd+Z` / `Ctrl+Z`: Undo
   - `Cmd+Shift+Z` / `Ctrl+Y`: Redo

2. **State Tracking:**
   - Manual typing: Debounced (300ms) to group rapid keystrokes
   - AI operations: Immediate state push after completion
   - Selection changes: Tracked and restored during undo/redo

3. **Exposed API:**
   ```typescript
   interface UnifiedEditorRef {
     undo: () => void;
     redo: () => void;
     canUndo: () => boolean;
     canRedo: () => boolean;
     // ... other methods
   }
   ```

## Implementation Details

### State Pushing Strategy

1. **Manual Typing:**
   - Debounced by 300ms to group consecutive keystrokes
   - Prevents creating a new history entry for every character
   - Balances granularity with usability

2. **AI Operations:**
   - Immediate state push after `insertAtCursor` completes
   - Ensures AI-generated content can be undone as a single operation
   - Preserves selection state for operations that select inserted text

3. **Undo/Redo Operations:**
   - Flagged with `isUndoRedoOperationRef` to prevent recursive state pushing
   - Content change triggered by undo/redo doesn't create new history entry

### Selection Restoration

When undoing or redoing:
1. Content is restored via `onContentChange`
2. Textarea selection is restored via `setSelectionRange`
3. Focus is returned to the textarea
4. Captured selection refs are updated for consistency

### History Management

- **Undo:** Moves backward in history stack
- **Redo:** Moves forward in history stack
- **New Edit After Undo:** Clears all redo history (standard behavior)
- **Max Size:** Oldest states are removed when limit is reached

## Usage Example

```typescript
// In a component using UnifiedEditor
const editorRef = useRef<UnifiedEditorRef>(null);

// Programmatic undo/redo
const handleUndo = () => {
  if (editorRef.current?.canUndo()) {
    editorRef.current.undo();
  }
};

const handleRedo = () => {
  if (editorRef.current?.canRedo()) {
    editorRef.current.redo();
  }
};

// Keyboard shortcuts are handled automatically by UnifiedEditor
```

## Testing

Manual test suite available at: `tests/manual-tests/test-undo-redo.html`

Test scenarios:
1. Manual typing undo/redo
2. AI operation undo/redo (Generate, Rewrite, Summarize)
3. Multiple undo/redo steps
4. Redo history clearing after new edit
5. Selection state restoration

## Benefits

1. **Consistent Behavior:** Undo/redo works the same for manual and AI-generated changes
2. **Selection Preservation:** Cursor position and text selection are restored
3. **Intuitive UX:** Standard keyboard shortcuts work as expected
4. **Granular Control:** Debouncing provides good balance between granularity and usability
5. **No Native Stack Conflicts:** Custom system avoids browser undo/redo limitations

## Future Enhancements

Potential improvements:
- Configurable debounce delay
- Configurable max history size
- History persistence across sessions
- Visual undo/redo history viewer
- Undo/redo buttons in UI
- Grouped operations (e.g., "Undo Rewrite" vs "Undo Character")
