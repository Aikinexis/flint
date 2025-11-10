/**
 * Smart Capitalization Utility
 * Context-aware capitalization for AI-generated and transcribed text
 */

/**
 * Checks if text ends with sentence-ending punctuation
 * @param text - Text to check
 * @returns True if ends with . ! ? or is empty/whitespace
 */
function endsWithSentence(text: string): boolean {
  if (!text || !text.trim()) {
    return true; // Start of document = capitalize
  }

  const trimmed = text.trimEnd();
  const lastChar = trimmed[trimmed.length - 1];

  // Sentence-ending punctuation
  return lastChar === '.' || lastChar === '!' || lastChar === '?';
}

/**
 * Checks if text ends with punctuation that suggests continuation
 * @param text - Text to check
 * @returns True if ends with , : ; - etc.
 */
function endsWithContinuation(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmed = text.trimEnd();
  const lastChar = trimmed[trimmed.length - 1];

  // Continuation punctuation
  return lastChar === ',' || lastChar === ':' || lastChar === ';' || lastChar === '-';
}

/**
 * Capitalizes the first letter of text
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 */
function capitalizeFirst(text: string): string {
  if (!text) return text;

  // Find first letter (skip whitespace and punctuation)
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
 * @param text - Text to lowercase
 * @returns Text with first letter lowercased
 */
function lowercaseFirst(text: string): string {
  if (!text) return text;

  // Find first letter (skip whitespace and punctuation)
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char && /[A-Z]/i.test(char)) {
      return text.slice(0, i) + char.toLowerCase() + text.slice(i + 1);
    }
  }

  return text;
}

/**
 * Applies smart capitalization based on context
 * @param generatedText - Text that was generated/transcribed
 * @param beforeText - Text before the insertion point
 * @returns Text with appropriate capitalization
 */
export function applySmartCapitalization(generatedText: string, beforeText: string): string {
  if (!generatedText) return generatedText;

  // Check context before insertion point
  const shouldCapitalize = endsWithSentence(beforeText);

  if (shouldCapitalize) {
    // After sentence ending or at start of document
    return capitalizeFirst(generatedText);
  } else {
    // Mid-sentence - keep lowercase
    return lowercaseFirst(generatedText);
  }
}

/**
 * Adds appropriate spacing before generated text
 * @param beforeText - Text before the insertion point
 * @returns Space string to prepend ('' or ' ')
 */
export function getSmartSpacing(beforeText: string): string {
  if (!beforeText || !beforeText.trim()) {
    return ''; // Start of document - no space
  }

  const trimmed = beforeText.trimEnd();
  if (trimmed.length === 0) {
    return ''; // Only whitespace before - no additional space
  }

  const lastChar = trimmed[trimmed.length - 1];

  // No space after opening brackets/quotes
  if (lastChar === '(' || lastChar === '[' || lastChar === '{' || lastChar === '"' || lastChar === "'") {
    return '';
  }

  // Check if there's already whitespace at the end
  if (beforeText !== trimmed) {
    return ''; // Already has trailing whitespace
  }

  // Add space
  return ' ';
}

/**
 * Formats generated text with smart capitalization and spacing
 * @param generatedText - Text that was generated/transcribed
 * @param beforeText - Text before the insertion point
 * @param afterText - Text after the insertion point (optional, for future use)
 * @returns Formatted text ready for insertion
 */
export function formatGeneratedText(
  generatedText: string,
  beforeText: string,
  _afterText?: string
): string {
  if (!generatedText) return generatedText;

  // Apply smart capitalization
  let formatted = applySmartCapitalization(generatedText, beforeText);

  // Add smart spacing
  const spacing = getSmartSpacing(beforeText);
  formatted = spacing + formatted;

  return formatted;
}

/**
 * Analyzes context to provide formatting hints
 * @param beforeText - Text before insertion point
 * @param afterText - Text after insertion point
 * @returns Context analysis
 */
export function analyzeContext(
  beforeText: string,
  afterText: string
): {
  shouldCapitalize: boolean;
  needsSpaceBefore: boolean;
  needsSpaceAfter: boolean;
  isStartOfDocument: boolean;
  isEndOfDocument: boolean;
  isStartOfSentence: boolean;
  isMidSentence: boolean;
} {
  const isStartOfDocument = !beforeText || !beforeText.trim();
  const isEndOfDocument = !afterText || !afterText.trim();
  const isStartOfSentence = endsWithSentence(beforeText);
  const isMidSentence = !isStartOfSentence && !endsWithContinuation(beforeText);

  return {
    shouldCapitalize: isStartOfSentence || isStartOfDocument,
    needsSpaceBefore: getSmartSpacing(beforeText) !== '',
    needsSpaceAfter: !!(afterText && afterText.trim() && !afterText.startsWith(' ')),
    isStartOfDocument,
    isEndOfDocument,
    isStartOfSentence,
    isMidSentence,
  };
}

/**
 * Formats text for mid-sentence insertion
 * Ensures lowercase start and proper spacing
 * @param text - Text to format
 * @returns Formatted text
 */
export function formatMidSentenceText(text: string): string {
  if (!text) return text;

  // Lowercase first letter
  let formatted = lowercaseFirst(text);

  // Ensure it starts with a space if it doesn't
  if (formatted && !formatted.startsWith(' ')) {
    formatted = ' ' + formatted;
  }

  return formatted;
}

/**
 * Formats text for sentence start insertion
 * Ensures capitalized start and proper spacing
 * @param text - Text to format
 * @returns Formatted text
 */
export function formatSentenceStartText(text: string): string {
  if (!text) return text;

  // Capitalize first letter
  let formatted = capitalizeFirst(text);

  // Ensure it starts with a space if needed
  if (formatted && !formatted.startsWith(' ')) {
    formatted = ' ' + formatted;
  }

  return formatted;
}

/**
 * Example usage for voice transcription
 */
export function formatTranscription(
  transcribedText: string,
  documentText: string,
  cursorPosition: number
): string {
  const beforeText = documentText.slice(0, cursorPosition);
  return formatGeneratedText(transcribedText, beforeText);
}

/**
 * Post-processes AI-generated text to fix capitalization
 * Forces correct capitalization regardless of what the AI produced
 * @param text - AI-generated text
 * @param beforeText - Context before insertion
 * @returns Text with corrected capitalization
 */
export function fixAICapitalization(text: string, beforeText: string = ''): string {
  if (!text) return text;

  // Check if we're starting mid-sentence (after comma, colon, etc.)
  const isMidSentence = beforeText && !endsWithSentence(beforeText);

  // Split into sentences while preserving the delimiters
  const sentences = text.split(/([.!?]\s+)/);
  
  let result = '';
  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if (!part) continue;

    // If this is a sentence delimiter, just add it
    if (/^[.!?]\s+$/.test(part)) {
      result += part;
      continue;
    }

    // Determine if this part should be capitalized
    if (i === 0) {
      // First part: lowercase if mid-sentence, capitalize if new sentence
      if (isMidSentence) {
        result += lowercaseFirst(part);
      } else {
        result += capitalizeFirst(part);
      }
    } else if (i > 0 && /^[.!?]\s+$/.test(sentences[i - 1] || '')) {
      // After a sentence delimiter: always capitalize
      result += capitalizeFirst(part);
    } else {
      // Everything else: keep as-is (shouldn't happen with our split)
      result += part;
    }
  }

  return result;
}

/**
 * Example usage for AI generation
 */
export function formatAIGeneration(
  generatedText: string,
  documentText: string,
  cursorPosition: number
): string {
  const beforeText = documentText.slice(0, cursorPosition);
  
  // Fix AI capitalization based on context
  const fixedText = fixAICapitalization(generatedText, beforeText);
  
  // Add spacing if needed
  const spacing = beforeText && !beforeText.endsWith(' ') && !beforeText.endsWith('\n') ? ' ' : '';
  return spacing + fixedText;
}
