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
 * Adds spaces if needed before/after the replacement
 */
export function ensureSpacing(
  originalText: string,
  replacementText: string,
  start: number,
  end: number
): string {
  let result = replacementText;

  // Check if we need space before
  const charBefore = start > 0 ? originalText[start - 1] : '';
  const firstChar = result[0] || '';
  const needsSpaceBefore =
    charBefore && !/\s/.test(charBefore) && firstChar && !/\s/.test(firstChar);

  // Check if we need space after
  const charAfter = end < originalText.length ? originalText[end] : '';
  const lastChar = result[result.length - 1] || '';
  const needsSpaceAfter = charAfter && !/\s/.test(charAfter) && lastChar && !/\s/.test(lastChar);

  if (needsSpaceBefore) {
    result = ' ' + result;
  }

  if (needsSpaceAfter) {
    result = result + ' ';
  }

  return result;
}
