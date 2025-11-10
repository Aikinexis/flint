import { smartInsertAtCursor } from './smartInsertion';

/**
 * Simulates a streaming effect by typing out text character by character
 * Updates the textarea progressively and calls a callback on each update
 * Uses smart insertion to handle overlaps and word boundaries
 */
export async function simulateStreaming(
  textarea: HTMLTextAreaElement,
  finalText: string,
  startPosition: number,
  endPosition: number,
  onUpdate: (currentText: string, currentLength: number) => void,
  onComplete: (actualInsertEnd?: number) => void
): Promise<void> {
  const originalValue = textarea.value;
  
  // For selection replacement, we can use simple logic
  // For cursor insertion, use smart insertion
  const isReplacement = startPosition !== endPosition;
  
  let beforeText: string;
  let afterText: string;
  
  if (isReplacement) {
    // Simple replacement - just remove the selection
    beforeText = originalValue.substring(0, startPosition);
    afterText = originalValue.substring(endPosition);
  } else {
    // Cursor insertion - will use smart insertion for final result
    beforeText = originalValue.substring(0, startPosition);
    afterText = originalValue.substring(startPosition);
  }

  // Preserve original scroll position
  const originalScrollTop = textarea.scrollTop;
  const originalScrollLeft = textarea.scrollLeft;

  // Calculate delay based on text length (faster for longer text)
  const baseDelay = 15; // milliseconds per character
  const minDelay = 5;
  const delay = Math.max(minDelay, baseDelay - Math.floor(finalText.length / 100));

  let currentIndex = 0;

  return new Promise((resolve) => {
    const typeNextChunk = () => {
      if (currentIndex >= finalText.length) {
        // On completion, use smart insertion for the final result
        let actualInsertEnd: number | undefined;
        
        if (!isReplacement) {
          console.log('[streamingEffect] Using smart insertion for final result');
          const { text: smartText, cursorPos } = smartInsertAtCursor(
            originalValue,
            startPosition,
            finalText
          );
          textarea.value = smartText;
          actualInsertEnd = cursorPos;
          
          // Dispatch events
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            composed: true,
          });
          textarea.dispatchEvent(inputEvent);
          
          const changeEvent = new Event('change', { bubbles: true });
          textarea.dispatchEvent(changeEvent);
        } else {
          // For replacements, calculate normally
          actualInsertEnd = startPosition + finalText.length;
        }
        
        onComplete(actualInsertEnd);
        resolve();
        return;
      }

      // Type multiple characters at once for smoother effect
      const chunkSize = Math.min(3, finalText.length - currentIndex);
      currentIndex += chunkSize;

      const currentText = finalText.substring(0, currentIndex);
      
      // During streaming, use simple concatenation for speed
      // Smart insertion will fix it at the end
      const newContent = beforeText + currentText + afterText;

      // Update textarea
      textarea.value = newContent;

      // Dispatch input event for React (use InputEvent for better compatibility)
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      textarea.dispatchEvent(inputEvent);

      // Also dispatch change event as backup
      const changeEvent = new Event('change', { bubbles: true });
      textarea.dispatchEvent(changeEvent);

      // Update selection to show typing cursor at end of current text
      const cursorPos = startPosition + currentIndex;
      textarea.setSelectionRange(cursorPos, cursorPos);

      // Restore original scroll position to prevent auto-scrolling
      textarea.scrollTop = originalScrollTop;
      textarea.scrollLeft = originalScrollLeft;

      // Call update callback
      onUpdate(currentText, currentIndex);

      // Schedule next chunk
      setTimeout(typeNextChunk, delay);
    };

    typeNextChunk();
  });
}
