/**
 * Text After Insertion Fixer
 * Fixes capitalization of existing text after AI insertion
 */

/**
 * Checks if text ends with sentence-ending punctuation
 */
function endsWithSentence(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmed = text.trimEnd();
  const lastChar = trimmed[trimmed.length - 1];
  return lastChar === '.' || lastChar === '!' || lastChar === '?';
}

/**
 * Capitalizes the first letter of text
 */
function capitalizeFirst(text: string): string {
  if (!text) return text;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char && /[a-z]/i.test(char)) {
      return text.slice(0, i) + char.toUpperCase() + text.slice(i + 1);
    }
  }

  return text;
}

/**
 * Lowercases the first letter of text
 */
function lowercaseFirst(text: string): string {
  if (!text) return text;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char && /[A-Z]/i.test(char)) {
      return text.slice(0, i) + char.toLowerCase() + text.slice(i + 1);
    }
  }

  return text;
}

/**
 * Fixes the capitalization of text that comes after an insertion
 * If the inserted text ends with a sentence, capitalize the next text
 * If the inserted text doesn't end with a sentence, lowercase the next text
 * 
 * @param afterText - Text that comes after the insertion point
 * @param insertedText - Text that was just inserted
 * @returns Fixed text with correct capitalization
 */
export function fixTextAfterInsertion(afterText: string, insertedText: string): string {
  if (!afterText || !afterText.trim()) {
    return afterText;
  }

  // Check if inserted text ends with sentence-ending punctuation
  const insertsNewSentence = endsWithSentence(insertedText);

  if (insertsNewSentence) {
    // Inserted text ends with period/exclamation/question
    // So the text after should start with capital letter
    return capitalizeFirst(afterText);
  } else {
    // Inserted text doesn't end with sentence punctuation
    // So the text after should start with lowercase (continuation)
    return lowercaseFirst(afterText);
  }
}
