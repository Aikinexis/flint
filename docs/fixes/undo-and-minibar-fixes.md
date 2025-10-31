# Undo and Mini Bar Fixes

## Issues Fixed

### 1. Undo History Default Changed to 10
**Problem**: Default of 50 steps was too high for most users.

**Solution**: 
- Changed default from 50 to 10 steps
- Updated all references (storage, settings UI, editor)
- More reasonable default that balances features and memory

### 2. Settings Input Validation Improved
**Problem**: Custom undo limit values would reset unexpectedly.

**Solution**:
- Added `isNaN()` check before validation
- Added `onBlur` handler to enforce valid range (5-200)
- If invalid on blur, clamps to nearest valid value
- Prevents empty or invalid values from breaking the setting

### 3. Mini Bar Text Selection Restored
**Problem**: Text from mini bar (rewrite/summarize) wasn't being highlighted after insertion.

**Solution**:
- Added `selectAfterReplace` parameter to `replaceTextInline()`
- Defaults to `true` (select text) for mini bar operations
- Can be set to `false` for other operations that want cursor at end
- Restores the visual feedback users expect

## Changes Made

### `src/services/storage.ts`
- Changed `undoHistoryLimit` default from 50 to 10

### `src/components/Settings.tsx`
- Updated default value display from 50 to 10
- Added `isNaN()` check in onChange
- Added `onBlur` handler for validation
- Changed "Reset to 50" button to "Reset to 10"

### `src/components/UnifiedEditor.tsx`
- Changed default prop value from 50 to 10
- Updated fallback value from 50 to 10

### `src/panel/panel.tsx`
- Updated fallback value from 50 to 10

### `src/utils/inlineReplace.ts`
- Added `selectAfterReplace` parameter (default: true)
- Conditionally selects text or moves cursor based on parameter
- Mini bar operations use default (true) to select text

## User Experience

**Undo History**:
- Default 10 steps is more reasonable
- Users can still increase to 200 if needed
- Settings input properly validates and clamps values
- No more unexpected resets

**Mini Bar**:
- Rewrite/Summarize results are highlighted again
- Clear visual feedback of what was changed
- Matches expected behavior from before

## Testing Notes
- Test undo with default 10 steps
- Test changing undo limit to custom values (5, 20, 100, 200)
- Test invalid inputs (empty, negative, > 200)
- Test mini bar rewrite - text should be selected
- Test mini bar summarize - text should be selected
