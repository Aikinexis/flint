# Undo/Redo Flow Diagram

## State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   Manual Typing   │   AI Operation    │
        └───────────────────────────────────────┘
                │                       │
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │  Debounced   │        │  Immediate   │
        │   (300ms)    │        │              │
        └──────────────┘        └──────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌───────────────────────┐
                │  Push State to Stack  │
                │  - content            │
                │  - selectionStart     │
                │  - selectionEnd       │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   History Stack       │
                │  [State 0]            │
                │  [State 1]            │
                │  [State 2] ← current  │
                └───────────────────────┘
```

## Undo Flow

```
User presses Cmd+Z / Ctrl+Z
        │
        ▼
┌──────────────────┐
│  Check canUndo() │
│  (index > 0?)    │
└──────────────────┘
        │
        ▼ Yes
┌──────────────────┐
│ Move index back  │
│ index--          │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Get prev state   │
│ from stack       │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Restore content  │
│ & selection      │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Focus editor     │
└──────────────────┘
```

## Redo Flow

```
User presses Cmd+Shift+Z / Ctrl+Y
        │
        ▼
┌──────────────────┐
│  Check canRedo() │
│  (index < max?)  │
└──────────────────┘
        │
        ▼ Yes
┌──────────────────┐
│ Move index fwd   │
│ index++          │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Get next state   │
│ from stack       │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Restore content  │
│ & selection      │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Focus editor     │
└──────────────────┘
```

## New Edit After Undo

```
History Stack:
[State 0]
[State 1]
[State 2] ← current (after undo)
[State 3] ← redo available
[State 4] ← redo available

User types new text
        │
        ▼
┌──────────────────┐
│ Clear redo stack │
│ (slice at index) │
└──────────────────┘
        │
        ▼
History Stack:
[State 0]
[State 1]
[State 2]
[State 5] ← new state (redo history cleared)
```

## Key Implementation Details

### Debouncing Strategy
```typescript
// Manual typing - debounced
handleChange() {
  onContentChange(newContent);
  
  clearTimeout(pushStateTimeout);
  pushStateTimeout = setTimeout(() => {
    undoRedo.pushState({
      content,
      selectionStart,
      selectionEnd
    });
  }, 300); // Group rapid keystrokes
}
```

### AI Operation - Immediate
```typescript
// AI operation complete
insertAtCursor(text) {
  onContentChange(newContent);
  
  // Immediate push (no debounce)
  undoRedo.pushState({
    content: newContent,
    selectionStart,
    selectionEnd
  });
}
```

### Preventing Recursive State Push
```typescript
// Flag to prevent undo/redo from creating new history
const isUndoRedoOperationRef = useRef(false);

undo() {
  isUndoRedoOperationRef.current = true;
  onContentChange(prevState.content); // Won't push to history
  // ... restore selection
  isUndoRedoOperationRef.current = false;
}
```

## History Stack Management

```
Max Size: 100 states

When stack is full:
┌─────────────────────────────────────┐
│ [State 0] ← oldest, will be removed │
│ [State 1]                           │
│ [State 2]                           │
│ ...                                 │
│ [State 99] ← current                │
└─────────────────────────────────────┘
                │
                ▼ New state added
┌─────────────────────────────────────┐
│ [State 1] ← now oldest              │
│ [State 2]                           │
│ [State 3]                           │
│ ...                                 │
│ [State 100] ← new current           │
└─────────────────────────────────────┘
```

## Integration Points

### UnifiedEditor Component
- Handles keyboard shortcuts
- Manages debounce timer
- Calls undo/redo methods
- Restores selection state

### useUndoRedo Hook
- Maintains history stack
- Tracks current index
- Provides undo/redo/canUndo/canRedo methods
- Handles stack size limits

### Parent Component (Panel)
- Receives content changes via `onContentChange`
- No awareness of undo/redo system
- Just updates state normally
