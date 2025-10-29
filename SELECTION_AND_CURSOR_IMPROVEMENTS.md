# Selection and Cursor Improvements

## Overview

This document describes the improvements made to handle text selection highlighting and cursor-based text generation in Flint.

## Problems Solved

### 1. Selection Disappearing on Button Click
**Problem:** When users highlighted text and clicked "Rewrite" or "Summarize" buttons in the mini bar, the selection would disappear, leaving users unsure which text would be processed.

**Solution:** Implemented selection preservation and restoration:
- Added `preserveSelection()`, `restoreSelection()`, and `clearPreservedSelection()` methods to `SelectionHandler`
- Selection is preserved before opening panel tabs
- Selection is restored after a short delay to ensure it remains visible
- Selection is cleared when mini bar is closed

### 2. Cursor-Based Generation
**Problem:** The Generate tool needed to be cursor-based (not selection-based) and show users where generated text will appear.

**Solution:** Implemented cursor context extraction:
- Added `getCursorContext()` method to `CaretHandler` that extracts text before and after cursor
- Default context limit: 500 characters (configurable)
- Works with both `<textarea>` and `contenteditable` elements
- Returns `CursorContext` object with `before`, `after`, `fullText`, and `cursorPosition`

### 3. Visual Feedback
**Problem:** Users needed clear visual indicators for:
- Which text is selected for Rewrite/Summarize
- Where generated text will appear for Generate

**Solution:** Created two new components:
- `CursorIndicator` - Shows animated arrow at cursor position
- `SelectionHighlight` - Shows word count and selection status

## Technical Implementation

### Modified Files

#### `src/content/selection.ts`
Added selection preservation methods:
```typescript
interface SelectionHandler {
  // ... existing methods
  preserveSelection(): void;
  restoreSelection(): void;
  clearPreservedSelection(): void;
}
```

Implementation stores a cloned `Range` object and restores it when needed.

#### `src/content/caret.ts`
Added cursor context extraction:
```typescript
interface CursorContext {
  before: string;        // Text before cursor (limited by maxLength)
  after: string;         // Text after cursor (limited by maxLength)
  fullText: string;      // Total text in element
  cursorPosition: number; // Cursor position in full text
}

interface CaretHandler {
  // ... existing methods
  getCursorContext(maxContextLength?: number): CursorContext | null;
}
```

The implementation:
- Extracts up to 500 characters before and after cursor (configurable)
- Works with `<textarea>`, `<input>`, and `contenteditable` elements
- Handles text offset calculation for contenteditable elements

#### `src/content/contentScript.ts`
Updated mini bar callbacks:
- **Summarize/Rewrite buttons:** Preserve selection → Send message → Restore selection
- **Generate button:** Get cursor context → Send context to panel
- Added `GET_CURSOR_CONTEXT` message handler

### New Components

#### `src/components/CursorIndicator.tsx`
Visual indicator for cursor position during generation:
- Shows animated arrow(s) indicating generation direction
- Two modes:
  - `forward`: Single arrow pointing right (text after cursor)
  - `bidirectional`: Two arrows pointing left and right (text on both sides)
- Pulsing animation for visibility
- Accessible with ARIA labels

#### `src/components/SelectionHighlight.tsx`
Visual indicator for selected text:
- Shows word count of selection
- Checkmark icon for confirmation
- Fade-in animation
- Accessible with ARIA labels

## Usage Examples

### For Panel Components

#### Using Selection Preservation (Rewrite/Summarize)
```typescript
// In RewritePanel or SummaryPanel
import { SelectionHighlight } from './SelectionHighlight';

function RewritePanel() {
  const [selectedText, setSelectedText] = useState('');
  
  return (
    <div>
      <SelectionHighlight 
        show={!!selectedText} 
        selectedText={selectedText} 
      />
      {/* Rest of panel */}
    </div>
  );
}
```

#### Using Cursor Context (Generate)
```typescript
// In GeneratePanel
import { CursorIndicator } from './CursorIndicator';

function GeneratePanel() {
  const [showCursorIndicator, setShowCursorIndicator] = useState(false);
  const [cursorContext, setCursorContext] = useState(null);
  
  // Get cursor context from content script
  const getCursorContext = async () => {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_CURSOR_CONTEXT',
      payload: { maxLength: 500 }
    });
    
    if (response.success) {
      setCursorContext(response.data);
      setShowCursorIndicator(true);
    }
  };
  
  return (
    <div>
      <CursorIndicator 
        show={showCursorIndicator}
        direction={cursorContext?.after ? 'bidirectional' : 'forward'}
      />
      {/* Rest of panel */}
    </div>
  );
}
```

## Context Limits

The cursor context extraction uses a **500-character limit** by default to prevent:
- Performance issues with very long documents
- Excessive token usage in AI API calls
- Memory overhead

This limit can be adjusted by passing `maxContextLength` parameter:
```typescript
const context = caretHandler.getCursorContext(1000); // 1000 chars
```

## Message Types

### New Message: `GET_CURSOR_CONTEXT`
Request cursor context from content script:
```typescript
chrome.tabs.sendMessage(tabId, {
  type: 'GET_CURSOR_CONTEXT',
  payload: { maxLength: 500 } // optional
});

// Response:
{
  success: true,
  data: {
    before: "text before cursor...",
    after: "text after cursor...",
    fullText: "complete text...",
    cursorPosition: 123
  }
}
```

### Updated Messages
- `OPEN_GENERATE_TAB`: Now includes `context` in payload
- `OPEN_SUMMARY_TAB`: Selection is preserved/restored automatically
- `OPEN_REWRITE_TAB`: Selection is preserved/restored automatically

## Accessibility

All new components include proper ARIA attributes:
- `role="status"` for dynamic content
- `aria-label` for screen reader descriptions
- Semantic HTML structure

## Browser Compatibility

All features use standard Web APIs:
- `window.getSelection()` - Widely supported
- `Range.cloneRange()` - Widely supported
- `document.activeElement` - Widely supported
- Works in Chrome, Edge, and other Chromium-based browsers

## Future Enhancements

Potential improvements:
1. **Visual highlight overlay** - Draw actual highlight over selected text in page
2. **Cursor position indicator** - Show cursor position in page with animated marker
3. **Context preview** - Show extracted context in panel before generation
4. **Smart context extraction** - Use sentence/paragraph boundaries instead of character limits
5. **Multi-cursor support** - Handle multiple cursor positions (advanced editors)

## Testing Checklist

- [ ] Select text → Click Rewrite → Selection stays visible
- [ ] Select text → Click Summarize → Selection stays visible
- [ ] Place cursor in text → Click Generate → Context extracted correctly
- [ ] Cursor at start of text → Only "after" context extracted
- [ ] Cursor at end of text → Only "before" context extracted
- [ ] Cursor in middle → Both "before" and "after" context extracted
- [ ] Works in `<textarea>` elements
- [ ] Works in `contenteditable` elements
- [ ] Context limit respected (500 chars default)
- [ ] Components render with proper animations
- [ ] ARIA labels present and correct
