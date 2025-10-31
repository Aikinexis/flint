/**
 * Inline text replacement utility for AI operations
 * Replaces text in a textarea and provides visual feedback
 */

/**
 * Replaces text in a textarea between the specified range and highlights the result
 *
 * @param textarea - The textarea element to modify
 * @param newText - The new text to insert
 * @param start - Start position of the selection range
 * @param end - End position of the selection range
 * @param selectAfterReplace - Whether to select the replaced text (default: true for mini bar)
 * @returns Promise that resolves when replacement and animation are complete
 */
export async function replaceTextInline(
  textarea: HTMLTextAreaElement,
  newText: string,
  start: number,
  end: number,
  selectAfterReplace: boolean = true
): Promise<void> {
  // Get current textarea value
  const currentValue = textarea.value;

  // Replace text between selection range
  const beforeSelection = currentValue.substring(0, start);
  const afterSelection = currentValue.substring(end);
  const newValue = beforeSelection + newText + afterSelection;

  // Update textarea value
  textarea.value = newValue;

  // Trigger input event for React state update
  const inputEvent = new Event('input', { bubbles: true });
  textarea.dispatchEvent(inputEvent);

  // CRITICAL: Restore focus BEFORE setting selection
  textarea.focus();

  if (selectAfterReplace) {
    // Select the newly inserted text
    const selectionStart = start;
    const selectionEnd = start + newText.length;
    textarea.setSelectionRange(selectionStart, selectionEnd);
    console.log('[inlineReplace] Selected text:', selectionStart, '-', selectionEnd);
  } else {
    // Just move cursor to the end of the newly inserted text
    const cursorPosition = start + newText.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    console.log('[inlineReplace] Cursor at:', cursorPosition);
  }

  // Scroll to cursor position if needed
  textarea.scrollTop = textarea.scrollHeight;

  // Trigger select event to update indicators and captured state
  const selectEvent = new Event('select', { bubbles: true });
  textarea.dispatchEvent(selectEvent);

  // Force selection to stay (sometimes it gets cleared)
  if (selectAfterReplace) {
    setTimeout(() => {
      const selectionStart = start;
      const selectionEnd = start + newText.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
      console.log('[inlineReplace] Re-selected text after timeout');
    }, 10);
  }

  // Add brief highlight animation (visual feedback without selection)
  textarea.classList.add('inline-replace-highlight');

  // Remove highlight class after animation completes
  return new Promise((resolve) => {
    setTimeout(() => {
      textarea.classList.remove('inline-replace-highlight');
      resolve();
    }, 600); // Match CSS animation duration
  });
}
