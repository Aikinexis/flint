# Smart Copy and Undo History Improvements

## 1. Smart Copy Button

### Problem
The copy button always copied all text, even when the user had text selected. This wasn't intuitive - users expected it to copy their selection.

### Solution
Made the copy button context-aware:
- **With selection**: Copies only the selected text
- **Without selection**: Copies all content

### Implementation
- Checks `getCapturedSelection()` from editor ref
- If selection exists (start !== end), copies substring
- Otherwise copies full content
- Updated tooltip to reflect behavior

### User Experience
- Select text → Click copy → Only selection copied
- No selection → Click copy → All content copied
- More intuitive and matches standard editor behavior

---

## 2. Configurable Undo History Limit

### Problem
The undo history was limited to only a few steps, making it hard to recover from mistakes or explore different writing directions.

### Solution
Added a configurable undo history limit setting:
- **Default**: 50 undo steps
- **Range**: 5-200 steps
- **Location**: Settings → Appearance section
- **Memory consideration**: Higher values use more memory

### Implementation

#### Storage
- Added `undoHistoryLimit` to Settings interface
- Default value: 50 steps
- Stored in chrome.storage.local

#### Hook
- `useUndoRedo` hook already supported `maxHistorySize` parameter
- Now receives value from settings instead of hardcoded 100

#### UI
- Number input in Settings (5-200 range)
- "Reset to 50" button for quick default
- Help text explains memory trade-off

#### Integration
- UnifiedEditor receives `undoHistoryLimit` prop
- Passes setting value to `useUndoRedo(limit)`
- Updates dynamically when setting changes

### User Experience
**Default users (50 steps)**:
- Good balance of history and memory
- Covers most editing scenarios
- ~50 undo/redo operations available

**Power users (100-200 steps)**:
- More extensive history for complex edits
- Can explore multiple writing directions
- Undo further back in editing session
- Uses more memory (acceptable on modern machines)

**Memory-conscious users (5-20 steps)**:
- Minimal memory footprint
- Still have basic undo capability
- Good for slower machines

### Technical Details
- History stored in memory (not persisted)
- Each state stores: content, selectionStart, selectionEnd
- Old states removed when limit exceeded (FIFO)
- Redo history cleared when new edit made

## Files Modified
- `src/panel/panel.tsx` - Smart copy logic, pass undo limit to editor
- `src/components/UnifiedEditor.tsx` - Accept and use undoHistoryLimit prop
- `src/services/storage.ts` - Add undoHistoryLimit to Settings interface
- `src/components/Settings.tsx` - Add undo history limit UI control
- `src/hooks/useUndoRedo.ts` - Already supported maxHistorySize parameter

## Benefits
1. **Smart Copy**: More intuitive, matches user expectations
2. **Flexible Undo**: Users can choose their own history depth
3. **Performance Control**: Users can balance features vs memory
4. **Better Recovery**: More undo steps = better mistake recovery
5. **Exploration**: Can try different approaches and undo further back
