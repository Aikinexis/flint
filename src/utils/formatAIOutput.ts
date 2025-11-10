/**
 * Format AI Output
 * Post-processes AI-generated text to improve formatting
 */

/**
 * Fixes common formatting issues in AI-generated text
 * - Adds newlines after structural markers like (Verse 1), (Chorus), etc.
 * - Adds newlines after lines ending with punctuation in poetry/songs
 * @param text - AI-generated text
 * @returns Formatted text with improved structure
 */
export function formatAIOutput(text: string): string {
  if (!text) return text;

  let formatted = text;

  // Fix 1: Add newline BEFORE structural markers when preceded by period
  // Pattern: period + optional space + (Marker) -> period + newline + (Marker)
  formatted = formatted.replace(/\.\s*(\([A-Za-z][^)]*\))/g, '.\n$1');
  formatted = formatted.replace(/\.\s*(\[[A-Za-z][^\]]*\])/g, '.\n$1');

  // Fix 2: Add newline AFTER structural markers like (Verse 1), (Chorus), [Intro], etc.
  // Pattern: (Word) or [Word] followed by a letter (with or without space)
  formatted = formatted.replace(/(\([A-Za-z][^)]*\))\s*([A-Z])/g, '$1\n$2');
  formatted = formatted.replace(/(\[[A-Za-z][^\]]*\])\s*([A-Z])/g, '$1\n$2');

  // Fix 3: Add newlines after lines in poetry/songs
  // Pattern: lowercase letter followed by comma, then uppercase letter (likely new line)
  // Example: "sway,Chasing" -> "sway,\nChasing"
  formatted = formatted.replace(/([a-z]),([A-Z])/g, '$1,\n$2');
  
  // Fix 4: Add newlines after lines ending with period in poetry
  // Pattern: period followed by uppercase letter (no space, to avoid double-processing)
  // Example: "away.Hopeful" -> "away.\nHopeful"
  formatted = formatted.replace(/([a-z])\.([A-Z])/g, '$1.\n$2');

  return formatted;
}

/**
 * Detects if text appears to be structured content (poetry, song, list, etc.)
 * @param text - Text to analyze
 * @returns True if text appears to be structured content
 */
export function isStructuredContent(text: string): boolean {
  if (!text) return false;

  // Check for common structural markers
  const hasStructuralMarkers = /\((?:Verse|Chorus|Bridge|Intro|Outro|Refrain)\s*\d*\)/i.test(text);
  const hasBracketMarkers = /\[(?:Verse|Chorus|Bridge|Intro|Outro|Refrain)\s*\d*\]/i.test(text);
  
  // Check for poetry-like structure (short lines with punctuation)
  const lines = text.split('\n');
  const hasShortLines = lines.length > 2 && lines.some(line => line.length < 60 && line.length > 10);
  
  return hasStructuralMarkers || hasBracketMarkers || hasShortLines;
}
