# Smart Selection for Rewrite & Summarize

## Overview

Rewrite and Summarize tools use a smart selection system to prevent accidental processing of entire documents while providing a smooth user experience.

## How It Works

### Scenario 1: No Text Selected

When you click **Rewrite** or **Summarize** without any text selected:

1. **First Click:** All text in the editor is automatically selected
   - You'll see the entire document highlighted
   - This gives you visual feedback of what will be processed
   - No AI operation runs yet

2. **Second Click:** The AI operation runs on the selected text
   - The selected text is processed
   - Result replaces the selection

### Scenario 2: Text Already Selected

When you click **Rewrite** or **Summarize** with text already selected:

1. **First Click:** The AI operation runs immediately
   - No need for a second click
   - The selected text is processed right away

## Benefits

✅ **Visual Confirmation:** See what will be processed before it happens

✅ **Prevents Accidents:** No surprise processing of entire documents

✅ **Flexible:** Works with manual selection or auto-select-all

✅ **Intuitive:** Natural two-step flow for whole-document operations

## Examples

### Example 1: Rewrite Entire Document

```
1. Type your document
2. Click "Rewrite" → All text selected (highlighted)
3. Click "Rewrite" again → AI rewrites the entire document
```

### Example 2: Rewrite Specific Paragraph

```
1. Select a paragraph manually
2. Click "Rewrite" → AI rewrites just that paragraph immediately
```

### Example 3: Summarize Long Article

```
1. Paste a long article
2. Click "Summarize" → All text selected (highlighted)
3. Review the selection
4. Click "Summarize" again → AI creates a summary
```

## Tips

💡 **Want to process everything?** Just click the button twice

💡 **Want to process a specific part?** Select it first, then click once

💡 **Changed your mind?** Click elsewhere to deselect, or press Escape

💡 **Made a mistake?** Use Cmd+Z (Mac) or Ctrl+Z (Windows) to undo

## Keyboard Shortcuts

While this feature is designed for button clicks, you can also:

- **Cmd+A / Ctrl+A:** Select all text manually
- **Cmd+Z / Ctrl+Z:** Undo any operation
- **Cmd+Shift+Z / Ctrl+Y:** Redo

## Technical Details

The smart selection system:
- Checks if text is selected before running AI operations
- Automatically selects all text if nothing is selected
- Updates the editor's internal selection state
- Focuses the textarea for immediate visual feedback
- Preserves selection state for the second click
