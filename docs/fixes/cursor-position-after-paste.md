# Cursor Position After AI Text Insertion

## Problem
When AI operations (summarize, rewrite, voice transcription) inserted text into the editor, the inserted text would be selected/highlighted. This meant if you tried to paste or type more text, it would replace what was just inserted instead of appending after it.

## Solution
Changed all text insertion operations to move the cursor to the end of the inserted text instead of selecting it. This allows users to immediately continue typing or pasting after the AI-generated content.

## Changes Made

### 1. Updated `inlineReplace.ts`
- Changed `setSelectionRange` to place cursor at end of inserted text instead of selecting it
- Cursor position: `start + newText.length` (collapsed selection)
- Added scroll to ensure cursor is visible

### 2. Updated `ToolControlsContainer.tsx`
- Voice transcription insertions now use `selectAfterInsert = false`
- Both replace and insert operations move cursor to end

### 3. Updated `panel.tsx`
- Summary and Rewrite tab insertions now use `selectAfterInsert = false`
- Cursor moves to end of inserted content

## Behavior
After any AI operation:
- ✅ Cursor positioned at end of inserted text
- ✅ Can immediately type or paste more content
- ✅ New content appends after AI-generated text
- ✅ Visual highlight still shows briefly for feedback
- ❌ No text selection that could be accidentally replaced

## Files Modified
- `src/utils/inlineReplace.ts` - Cursor positioning for inline replacements
- `src/components/ToolControlsContainer.tsx` - Voice recorder insertions
- `src/panel/panel.tsx` - Summary and Rewrite tab insertions
