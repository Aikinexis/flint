/**
 * Fixes spacing issues in text
 * - Removes double spaces
 * - Ensures single space after punctuation
 * - Fixes spacing around punctuation
 */

/**
 * Fixes spacing issues in text
 * @param text - Text to fix
 * @returns Fixed text with proper spacing
 */
export function fixSpacing(text: string): string {
  let fixed = text;
  
  // Fix double spaces (replace with single space)
  fixed = fixed.replace(/  +/g, ' ');
  
  // Ensure single space after sentence-ending punctuation
  fixed = fixed.replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // Remove space before punctuation
  fixed = fixed.replace(/\s+([.!?,;:])/g, '$1');
  
  // Ensure space after comma (if followed by letter)
  fixed = fixed.replace(/,([A-Za-z])/g, ', $1');
  
  return fixed;
}

/**
 * Fixes spacing around a specific position in text
 * More efficient than fixing the entire document
 * @param text - Full text
 * @param position - Position around which to fix spacing
 * @param window - Number of characters to check on each side (default: 500)
 * @returns Fixed text
 */
export function fixSpacingAroundPosition(
  text: string,
  position: number,
  window: number = 500
): string {
  // Extract window around position
  const start = Math.max(0, position - window);
  const end = Math.min(text.length, position + window);
  
  const before = text.substring(0, start);
  const middle = text.substring(start, end);
  const after = text.substring(end);
  
  // Fix spacing in the middle section only
  const fixedMiddle = fixSpacing(middle);
  
  return before + fixedMiddle + after;
}
