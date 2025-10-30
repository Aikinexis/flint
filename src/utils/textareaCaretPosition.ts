/**
 * Get the pixel position of the caret/selection in a textarea
 * Uses a mirror div technique to accurately measure text position
 */
export function getTextareaCaretPosition(
  textarea: HTMLTextAreaElement
): { x: number; y: number } | null {
  const { selectionStart } = textarea;

  // Create a temporary mirror element
  const mirrorDiv = document.createElement('div');
  document.body.appendChild(mirrorDiv);

  // Copy all styles from textarea to mirrorDiv
  const computedStyle = window.getComputedStyle(textarea);
  for (const prop of computedStyle) {
    try {
      (mirrorDiv.style as any)[prop] = computedStyle.getPropertyValue(prop);
    } catch (e) {
      // Some properties are read-only, skip them
    }
  }

  // Override specific styles for the mirror
  mirrorDiv.style.position = 'absolute';
  mirrorDiv.style.visibility = 'hidden';
  mirrorDiv.style.whiteSpace = 'pre-wrap'; // Important for wrapping
  mirrorDiv.style.wordWrap = 'break-word'; // Important for wrapping
  mirrorDiv.style.overflow = 'auto'; // Match textarea overflow
  mirrorDiv.style.height = computedStyle.height; // Match textarea height
  mirrorDiv.style.pointerEvents = 'none';
  mirrorDiv.style.top = '0';
  mirrorDiv.style.left = '0';

  // Get text before caret
  const textBeforeCaret = textarea.value.substring(0, selectionStart);

  // Populate mirrorDiv with text and a span for caret marker
  mirrorDiv.textContent = textBeforeCaret;
  const caretMarker = document.createElement('span');
  caretMarker.id = 'caret-marker';
  caretMarker.textContent = '|'; // Use a visible character for measurement
  mirrorDiv.appendChild(caretMarker);

  // Match the textarea's scroll position
  mirrorDiv.scrollTop = textarea.scrollTop;
  mirrorDiv.scrollLeft = textarea.scrollLeft;

  // Measure the caret marker position
  const caretRect = caretMarker.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();

  const position = {
    x: caretRect.left - textareaRect.left,
    y: caretRect.top - textareaRect.top,
  };

  // Clean up
  document.body.removeChild(mirrorDiv);

  return position;
}
