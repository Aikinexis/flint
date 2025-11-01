# Generate Tool - Automatic Modification Detection

## Problem

When users selected text and used the Generate tool with instructions like "change the date to November 11", the tool would generate completely new text instead of modifying the selected text. This happened because:

1. Generate is designed to create NEW content at cursor position
2. The enhanced context prompt explicitly says "Generate ONLY new text" and "Do NOT repeat any of the context text"
3. The AI would hallucinate and create entirely new content, ignoring the selected text boundaries

## Root Cause

The `generateWithEnhancedContext()` method has rules that tell the AI:
- "Generate ONLY new text that fits at the cursor position"
- "Do NOT repeat any of the context text shown above - add NEW information only"

This is correct for actual generation (adding new content), but wrong when the user wants to modify existing selected text.

## Solution

Added **automatic detection** of modification requests in the Generate tool. When the user:
1. Has text selected (not just cursor position)
2. Uses keywords like "change", "modify", "update", "replace", "edit", "fix", "correct", "adjust", "revise", or "alter"

The Generate tool automatically switches to using `rewriteWithContext()` instead of `generateWithEnhancedContext()`.

### Implementation

In `src/components/ToolControlsContainer.tsx` (handleGenerate method):

```typescript
// Check if user has selected text and wants to modify it
const hasSelection = capturedSelection && capturedSelection.start !== capturedSelection.end;
const selectedText = hasSelection ? content.substring(capturedSelection.start, capturedSelection.end) : '';

// Detect modification keywords in prompt
const modificationKeywords = /\b(change|modify|update|replace|edit|fix|correct|adjust|revise|alter)\b/i;
const isModificationRequest = hasSelection && modificationKeywords.test(effectivePrompt);

let result: string;

// If user selected text and prompt suggests modification, use rewrite instead
if (isModificationRequest) {
  console.log('[Generate] Detected modification request on selection, using rewrite logic');
  result = await AIService.rewriteWithContext(
    selectedText,
    content,
    capturedSelection!.start,
    {
      customPrompt: effectivePrompt,
      pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
    }
  );
}
// Otherwise use normal generation logic
else if (capturedSelection && settings.contextAwarenessEnabled && content.trim()) {
  // ... enhanced context generation
}
```

## Modification Keywords Detected

The following keywords trigger modification mode:
- change
- modify
- update
- replace
- edit
- fix
- correct
- adjust
- revise
- alter

## Examples

### Before Fix:
**User action:**
1. Selects: "Tuesday, November 4"
2. Generate prompt: "change to November 11"
3. Result: "I'll be there on Tuesday, November 11" ❌ (hallucinated new text)

### After Fix:
**User action:**
1. Selects: "Tuesday, November 4"
2. Generate prompt: "change to November 11"
3. Console: `[Generate] Detected modification request on selection, using rewrite logic`
4. Result: "Tuesday, November 11" ✅ (only modified the selected text)

## Benefits

✅ **Intuitive UX**: Users don't need to know the difference between Generate and Rewrite tools

✅ **Smart Detection**: Automatically uses the right tool based on user intent

✅ **Preserves Selection**: Modification requests respect the selected text boundaries

✅ **No Breaking Changes**: Normal generation still works as expected when no modification keywords are used

✅ **Better Context**: Uses `rewriteWithContext()` which includes surrounding text for style matching

## Testing

1. **Modification Request (should use rewrite):**
   - Select: "Meeting on Tuesday, November 4"
   - Generate: "change to November 11"
   - Expected: "Meeting on Tuesday, November 11"
   - Console should show: `[Generate] Detected modification request on selection, using rewrite logic`

2. **Normal Generation (should use generate):**
   - Select: "Meeting on Tuesday, November 4"
   - Generate: "add a time"
   - Expected: New text generated (e.g., "at 2:00 PM")
   - Console should show: `[Generate] Using enhanced context engine`

3. **No Selection (should use generate):**
   - No selection, cursor at end
   - Generate: "change the date"
   - Expected: New text generated
   - Console should show: `[Generate] Using enhanced context engine` or `[Generate] Using basic generation`

## Files Modified

- `src/components/ToolControlsContainer.tsx` - Added modification detection logic in handleGenerate()

## Impact

- Users can now use Generate tool for both generation AND modification
- Reduces confusion about when to use Generate vs. Rewrite
- Prevents AI hallucination when modifying selected text
- Makes the tool more intelligent and user-friendly
