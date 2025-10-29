# Implementation Plan

This plan fixes the critical selection/cursor persistence bug in the Unified Editor. Tasks are minimal and focused on the core issue.

## Core Fixes

- [x] 1. Update UnifiedEditor to always capture selection state
  - Modify `handleSelect` in `src/components/UnifiedEditor.tsx`
  - Ensure `capturedSelectionRef.current` is updated on every selection change (not just when text is selected)
  - Update both `selectionRef` and `capturedSelectionRef` consistently
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Expose captured selection via UnifiedEditor ref
  - Add `getCapturedSelection()` method to `UnifiedEditorRef` interface
  - Implement method in `useImperativeHandle` to return `capturedSelectionRef.current`
  - Export updated interface type
  - _Requirements: 7.1, 7.2_

- [x] 3. Update AI operation handlers to use captured selection
  - Modify Generate handler in `src/panel/panel.tsx` to call `editorRef.current?.getCapturedSelection()`
  - Modify Rewrite handler to use captured selection instead of `textarea.selectionStart/End`
  - Modify Summarize handler to use captured selection instead of `textarea.selectionStart/End`
  - Add validation for selection range (check bounds, check if empty when required)
  - _Requirements: 1.3, 2.3, 5.1, 5.2, 5.3, 6.1_

- [x] 4. Restore focus after inline replacement
  - Modify `replaceTextInline` in `src/utils/inlineReplace.ts`
  - Call `textarea.focus()` before setting selection range
  - Dispatch `select` event after setting selection to update indicators
  - Ensure new text is highlighted after replacement
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Fix cursor indicator to use captured position
  - Modify `showCursorIndicator` in `src/components/UnifiedEditor.tsx`
  - Use `capturedSelectionRef.current.start` instead of `textareaRef.current.selectionStart`
  - Ensure indicator shows at correct position even after focus loss
  - _Requirements: 2.4, 6.2_

- [x] 6. Add error handling for invalid selection state
  - Add validation in Rewrite handler for empty selection
  - Add validation for out-of-bounds selection ranges
  - Show user-friendly error messages when validation fails
  - Add fallback to end of content for Generate when no cursor position captured
  - _Requirements: 5.3, 8.1, 8.2, 8.3_

## Testing and Validation

- [x] 7. Manual testing of all workflows
  - Test Generate with cursor at different positions
  - Test Rewrite with text selection
  - Test Summarize with text selection
  - Test Mini Bar operations with selection
  - Test edge cases (no selection, invalid range, rapid clicking)
  - Verify focus restoration after each operation
  - Verify indicators show at correct positions
  - _Requirements: 3.5, 4.5, 9.1, 9.2, 9.3, 9.4_

## Summary

This implementation plan contains 7 tasks:
- **Tasks 1-6**: Core fixes (required)
- **Task 7**: Manual testing (optional but recommended)

**Estimated Time:** 1-2 hours for core fixes

**Key Changes:**
1. Always capture selection in `handleSelect`
2. Expose captured selection via ref
3. Use captured selection in AI handlers
4. Restore focus after operations
5. Fix cursor indicator positioning
6. Add error handling

**No UI Changes:** All changes are internal logic fixes. The UI will look identical but will actually work correctly.
