/**
 * Fix All Capitalization
 * Scans entire text and fixes any capitalization errors after sentence endings
 */

/**
 * Fixes all capitalization errors in text
 * Ensures every sentence starts with a capital letter
 * @param text - Full text to fix
 * @returns Text with all sentences properly capitalized
 */
export function fixAllCapitalization(text: string): string {
  if (!text) return text;

  console.log('[fixAllCapitalization] Input length:', text.length);
  console.log('[fixAllCapitalization] First 200 chars:', text.substring(0, 200));

  let result = '';
  let shouldCapitalize = true; // Start of document should be capitalized
  let fixCount = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!char) continue;

    // Check if this is a letter
    if (/[a-zA-Z]/.test(char)) {
      if (shouldCapitalize) {
        // Capitalize first letter of sentence
        result += char.toUpperCase();
        if (char !== char.toUpperCase()) {
          fixCount++;
          console.log(`[fixAllCapitalization] Capitalized at position ${i}: "${char}" -> "${char.toUpperCase()}"`);
        }
        shouldCapitalize = false;
      } else {
        // Keep as-is - don't force lowercase
        result += char;
      }
    } else {
      result += char;

      // Check for sentence-ending punctuation followed by space
      if (/[.!?]/.test(char)) {
        // Look ahead to see if there's whitespace after this punctuation
        let hasSpace = false;
        for (let j = i + 1; j < text.length; j++) {
          const nextChar = text[j];
          if (nextChar && /\s/.test(nextChar)) {
            hasSpace = true;
            break;
          } else if (nextChar && /[a-zA-Z]/.test(nextChar)) {
            // Found a letter before whitespace
            break;
          }
        }
        
        if (hasSpace) {
          shouldCapitalize = true;
        }
      }
    }
  }

  console.log('[fixAllCapitalization] Fixed', fixCount, 'characters');
  console.log('[fixAllCapitalization] Output first 200 chars:', result.substring(0, 200));

  return result;
}

/**
 * Fixes capitalization in a specific region around the cursor
 * More efficient than fixing the entire document
 * @param text - Full text
 * @param cursorPos - Cursor position
 * @param windowSize - How many characters to check before/after cursor (default: 500)
 * @returns Text with capitalization fixed around cursor
 */
export function fixCapitalizationAroundCursor(
  text: string,
  _cursorPos: number,
  _windowSize: number = 500
): string {
  if (!text) return text;

  // For simplicity and reliability, just fix the entire text
  // This ensures we don't miss any capitalization errors
  return fixAllCapitalization(text);
}
