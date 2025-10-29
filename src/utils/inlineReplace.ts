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
 * @returns Promise that resolves when replacement and animation are complete
 */
export async function replaceTextInline(
  textarea: HTMLTextAreaElement,
  newText: string,
  start: number,
  end: number
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
  
  // Set new selection to highlight replaced text
  const newSelectionStart = start;
  const newSelectionEnd = start + newText.length;
  textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
  
  // Trigger select event to update indicators and captured state
  const selectEvent = new Event('select', { bubbles: true });
  textarea.dispatchEvent(selectEvent);
  
  // Add brief highlight animation
  textarea.classList.add('inline-replace-highlight');
  
  // Remove highlight class after animation completes
  return new Promise((resolve) => {
    setTimeout(() => {
      textarea.classList.remove('inline-replace-highlight');
      resolve();
    }, 600); // Match CSS animation duration
  });
}
