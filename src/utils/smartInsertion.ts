/**
 * Smart text insertion utilities for cursor-based generation
 * Handles word boundaries, overlaps, and smooth blending
 */

/**
 * Removes duplicate words at the join point between generated text and existing text
 * Preserves trailing/leading whitespace (including double spaces for paragraphs)
 * @param left - Text before insertion point
 * @param generated - Generated text to insert
 * @param right - Text after insertion point
 * @returns Object with cleaned left, generated, and right text
 */
export function removeDuplicateWords(
  left: string,
  generated: string,
  right: string
): { left: string; generated: string; right: string } {
  // Preserve trailing/leading whitespace
  const leftTrailingSpace = left.match(/\s*$/)?.[0] || '';
  const rightLeadingSpace = right.match(/^\s*/)?.[0] || '';
  
  // Get last few words from left (trim only for comparison)
  const leftWords = left.trim().split(/\s+/);
  const lastLeftWords = leftWords.slice(-10); // Check last 10 words (increased from 3)

  // Get first few words from generated
  const generatedWords = generated.trim().split(/\s+/);
  const firstGeneratedWords = generatedWords.slice(0, 20); // Check first 20 words (increased from 3)

  // Get first few words from right (trim only for comparison)
  const rightWords = right.trim().split(/\s+/);
  const firstRightWords = rightWords.slice(0, 20); // Check first 20 words (increased from 3)

  let cleanedGenerated = generated.trim();

  // Check for overlap between left and generated (remove from generated)
  for (let i = lastLeftWords.length; i > 0; i--) {
    const leftSuffix = lastLeftWords.slice(-i).join(' ');
    const generatedPrefix = firstGeneratedWords.slice(0, i).join(' ');

    if (leftSuffix.toLowerCase() === generatedPrefix.toLowerCase()) {
      // Found overlap - remove from generated
      cleanedGenerated = generatedWords.slice(i).join(' ');
      console.log('[smartInsertion] Removed overlap from generated start:', leftSuffix);
      break;
    }
  }

  // Check for overlap between generated and right (remove from generated)
  // This is critical for mid-document insertion where AI might repeat upcoming text
  const updatedGeneratedWords = cleanedGenerated.split(/\s+/);
  
  // Check for longer overlaps first (up to 20 words)
  let foundOverlap = false;
  for (let i = Math.min(updatedGeneratedWords.length, 20); i > 0; i--) {
    const generatedPrefix = updatedGeneratedWords.slice(0, i).join(' ');
    const rightPrefix = firstRightWords.slice(0, i).join(' ');

    if (generatedPrefix.toLowerCase() === rightPrefix.toLowerCase()) {
      // Found overlap at start of generated with start of right - remove from generated
      cleanedGenerated = updatedGeneratedWords.slice(i).join(' ');
      console.log('[smartInsertion] Removed overlap with right context from generated start:', generatedPrefix);
      foundOverlap = true;
      break;
    }
  }

  // Also check for overlap at end of generated with start of right
  if (!foundOverlap) {
    const updatedWords = cleanedGenerated.split(/\s+/);
    const updatedLastGenerated = updatedWords.slice(-10); // Check last 10 words

    for (let i = updatedLastGenerated.length; i > 0; i--) {
      const generatedSuffix = updatedLastGenerated.slice(-i).join(' ');
      const rightPrefix = firstRightWords.slice(0, i).join(' ');

      if (generatedSuffix.toLowerCase() === rightPrefix.toLowerCase()) {
        // Found overlap - remove from generated
        cleanedGenerated = updatedWords.slice(0, -i).join(' ');
        console.log('[smartInsertion] Removed overlap from generated end:', generatedSuffix);
        break;
      }
    }
  }

  // Return with preserved whitespace
  return {
    left: left.trimEnd() + leftTrailingSpace,
    generated: cleanedGenerated,
    right: rightLeadingSpace + right.trimStart(),
  };
}

/**
 * Ensures proper spacing around inserted text (max 2 spaces)
 * @param left - Text before insertion
 * @param generated - Generated text
 * @param right - Text after insertion
 * @returns Object with properly spaced text parts
 */
export function ensureProperSpacing(
  left: string,
  generated: string,
  right: string
): { left: string; generated: string; right: string } {
  const spacedLeft = left;
  let spacedGenerated = generated;
  const spacedRight = right;

  // Add space before generated if needed (but max 2 spaces total)
  if (left && generated) {
    const leftEndsWithSpace = /\s$/.test(left);
    const leftEndsWithTwoSpaces = /\s{2,}$/.test(left);
    const generatedStartsWithSpace = /^\s/.test(generated);

    // Only add space if:
    // 1. Neither left ends with space nor generated starts with space
    // 2. We don't already have 2+ spaces at the end of left
    if (!leftEndsWithSpace && !generatedStartsWithSpace) {
      spacedGenerated = ' ' + generated;
    } else if (leftEndsWithSpace && !leftEndsWithTwoSpaces && !generatedStartsWithSpace) {
      // Left has 1 space, generated has no space - this is fine, don't add more
    } else if (leftEndsWithTwoSpaces) {
      // Already have 2+ spaces, don't add any more
      // Remove leading space from generated if it has one
      if (generatedStartsWithSpace) {
        spacedGenerated = generated.trimStart();
      }
    }
  }

  // Add space after generated if needed (but max 2 spaces total)
  if (generated && right) {
    const generatedEndsWithSpace = /\s$/.test(spacedGenerated);
    const generatedEndsWithTwoSpaces = /\s{2,}$/.test(spacedGenerated);
    const rightStartsWithSpace = /^\s/.test(right);
    const rightStartsWithTwoSpaces = /^\s{2,}/.test(right);
    const generatedEndsWithPunctuation = /[.!?,;:]$/.test(spacedGenerated.trim());

    // Only add space if:
    // 1. Generated doesn't end with space and right doesn't start with space
    // 2. Generated doesn't end with punctuation
    // 3. We don't already have 2+ spaces
    if (!generatedEndsWithSpace && !rightStartsWithSpace && !generatedEndsWithPunctuation) {
      spacedGenerated = spacedGenerated + ' ';
    } else if (generatedEndsWithTwoSpaces || rightStartsWithTwoSpaces) {
      // Already have 2+ spaces, don't add any more
      // Trim excess spaces from generated end
      if (generatedEndsWithTwoSpaces) {
        spacedGenerated = spacedGenerated.replace(/\s{3,}$/, '  '); // Max 2 spaces
      }
    }
  }

  return {
    left: spacedLeft,
    generated: spacedGenerated,
    right: spacedRight,
  };
}

/**
 * Intelligently inserts generated text at cursor position
 * Handles word boundaries, overlaps, and spacing
 * @param fullText - Complete document text
 * @param cursorPos - Cursor position
 * @param generatedText - Text generated by AI
 * @returns Object with new text and cursor position
 */
export function smartInsertAtCursor(
  fullText: string,
  cursorPos: number,
  generatedText: string
): { text: string; cursorPos: number } {
  console.log('[smartInsertion] Starting smart insertion at position:', cursorPos);
  console.log('[smartInsertion] Generated text:', generatedText.substring(0, 100));

  // Split text at cursor
  const left = fullText.substring(0, cursorPos);
  const right = fullText.substring(cursorPos);

  console.log('[smartInsertion] Left ends with:', left.slice(-50));
  console.log('[smartInsertion] Right starts with:', right.slice(0, 50));

  // Remove duplicate words at join points
  const { left: cleanLeft, generated: cleanGenerated, right: cleanRight } = removeDuplicateWords(
    left,
    generatedText,
    right
  );

  // Ensure proper spacing
  const { left: spacedLeft, generated: spacedGenerated, right: spacedRight } = ensureProperSpacing(
    cleanLeft,
    cleanGenerated,
    cleanRight
  );

  // Combine
  const newText = spacedLeft + spacedGenerated + spacedRight;
  const newCursorPos = spacedLeft.length + spacedGenerated.length;

  console.log('[smartInsertion] Final text length:', newText.length);
  console.log('[smartInsertion] New cursor position:', newCursorPos);
  console.log('[smartInsertion] Result preview:', newText.substring(Math.max(0, cursorPos - 50), cursorPos + 150));

  return {
    text: newText,
    cursorPos: newCursorPos,
  };
}

/**
 * Checks if text at position is in the middle of a word
 * @param text - Full text
 * @param pos - Position to check
 * @returns True if position is mid-word
 */
export function isMidWord(text: string, pos: number): boolean {
  if (pos === 0 || pos >= text.length) return false;

  const charBefore = text[pos - 1];
  const charAfter = text[pos];

  // Both characters are word characters (not whitespace or punctuation)
  return /\w/.test(charBefore || '') && /\w/.test(charAfter || '');
}

/**
 * Finds the nearest word boundary before or at the given position
 * @param text - Full text
 * @param pos - Starting position
 * @returns Position of word boundary
 */
export function findWordBoundaryBefore(text: string, pos: number): number {
  let i = pos;
  while (i > 0 && /\w/.test(text[i - 1] || '')) {
    i--;
  }
  return i;
}

/**
 * Finds the nearest word boundary after or at the given position
 * @param text - Full text
 * @param pos - Starting position
 * @returns Position of word boundary
 */
export function findWordBoundaryAfter(text: string, pos: number): number {
  let i = pos;
  while (i < text.length && /\w/.test(text[i] || '')) {
    i++;
  }
  return i;
}
