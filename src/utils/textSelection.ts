/**
 * Expands a selection to word boundaries
 * If selection starts or ends in the middle of a word, expand to include the whole word
 * Trims leading and trailing whitespace from the expanded selection
 */
export function expandToWordBoundaries(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  // If no selection, return as is
  if (start === end) {
    return { start, end };
  }

  let newStart = start;
  let newEnd = end;

  // Expand start to previous word boundary (space, newline, or start of text)
  while (newStart > 0) {
    const char = text[newStart - 1];
    if (!char || /\s/.test(char)) break;
    newStart--;
  }

  // Expand end to next word boundary (space, newline, or end of text)
  while (newEnd < text.length) {
    const char = text[newEnd];
    if (!char || /\s/.test(char)) break;
    newEnd++;
  }

  // Trim leading whitespace
  while (newStart < newEnd) {
    const char = text[newStart];
    if (!char || !/\s/.test(char)) break;
    newStart++;
  }

  // Trim trailing whitespace
  while (newEnd > newStart) {
    const char = text[newEnd - 1];
    if (!char || !/\s/.test(char)) break;
    newEnd--;
  }

  return { start: newStart, end: newEnd };
}

/**
 * Ensures proper spacing around replaced text
 * Adds spaces if needed before/after the replacement (max 2 spaces total)
 */
export function ensureSpacing(
  originalText: string,
  replacementText: string,
  start: number,
  end: number
): string {
  let result = replacementText;

  // Check characters before and after
  const charBefore = start > 0 ? originalText[start - 1] || '' : '';
  const char2Before = start > 1 ? originalText[start - 2] || '' : '';
  const firstChar = result[0] || '';
  
  const charAfter = end < originalText.length ? originalText[end] || '' : '';
  const char2After = end < originalText.length - 1 ? originalText[end + 1] || '' : '';
  const lastChar = result[result.length - 1] || '';

  // Add space before only if:
  // 1. There's a non-whitespace char before
  // 2. First char of result is non-whitespace
  // 3. We don't already have 2+ spaces before
  const hasSpaceBefore = charBefore && /\s/.test(charBefore);
  const hasTwoSpacesBefore = hasSpaceBefore && char2Before && /\s/.test(char2Before);
  const needsSpaceBefore =
    charBefore && 
    !/\s/.test(charBefore) && 
    firstChar && 
    !/\s/.test(firstChar);

  // Add space after only if:
  // 1. There's a non-whitespace char after
  // 2. Last char of result is non-whitespace
  // 3. We don't already have 2+ spaces after
  const hasSpaceAfter = charAfter && /\s/.test(charAfter);
  const hasTwoSpacesAfter = hasSpaceAfter && char2After && /\s/.test(char2After);
  const needsSpaceAfter = 
    charAfter && 
    !/\s/.test(charAfter) && 
    lastChar && 
    !/\s/.test(lastChar);

  // Only add space before if we won't exceed 2 spaces
  if (needsSpaceBefore && !hasTwoSpacesBefore) {
    result = ' ' + result;
  }

  // Only add space after if we won't exceed 2 spaces
  if (needsSpaceAfter && !hasTwoSpacesAfter) {
    result = result + ' ';
  }

  return result;
}
