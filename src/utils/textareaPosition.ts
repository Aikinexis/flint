/**
 * Calculate the pixel position of a character index in a textarea
 * Returns coordinates relative to the textarea element
 *
 * Uses native browser selection API for pixel-perfect positioning
 */
export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  // Save current selection
  const originalStart = textarea.selectionStart;
  const originalEnd = textarea.selectionEnd;
  const hadFocus = document.activeElement === textarea;

  // Temporarily set selection to the position we want to measure
  textarea.setSelectionRange(position, position);
  textarea.focus();

  // Get the textarea's bounding rect
  const textareaRect = textarea.getBoundingClientRect();

  // Try to get selection rect using native API
  const selection = window.getSelection();
  let top = 0;
  let left = 0;
  let height = 20; // Default height

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();

    if (rects.length > 0) {
      const rect = rects[0];
      if (rect) {
        // Calculate position relative to textarea
        top = rect.top - textareaRect.top;
        left = rect.left - textareaRect.left;
        height = rect.height;
      }
    }
  }

  // If native selection didn't work, fall back to mirror div approach
  if (top === 0 && left === 0) {
    const result = getCaretCoordinatesFallback(textarea, position);
    top = result.top;
    left = result.left;
    height = result.height;
  }

  // Restore original selection
  textarea.setSelectionRange(originalStart, originalEnd);
  if (!hadFocus) {
    textarea.blur();
  }

  return { top, left, height };
}

/**
 * Fallback method using mirror div when native selection API doesn't work
 */
function getCaretCoordinatesFallback(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  const computed = window.getComputedStyle(textarea);

  // Create mirror div
  const div = document.createElement('div');

  // Copy essential styles
  const stylesToCopy = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'lineHeight',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'padding',
    'border',
    'boxSizing',
    'whiteSpace',
    'wordWrap',
    'overflowWrap',
  ];

  stylesToCopy.forEach((prop) => {
    const value = computed[prop as any];
    if (value) {
      div.style[prop as any] = value;
    }
  });

  // Position and size
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.top = '0';
  div.style.left = '-9999px';
  div.style.width = `${textarea.clientWidth}px`;
  div.style.height = 'auto';
  div.style.overflow = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';

  document.body.appendChild(div);

  // Add text and cursor marker
  const textBefore = textarea.value.substring(0, position);
  div.textContent = textBefore;

  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);

  const top = span.offsetTop;
  const left = span.offsetLeft;
  const height = span.offsetHeight;

  document.body.removeChild(div);

  return { top, left, height };
}
