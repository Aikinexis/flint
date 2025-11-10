/**
 * Sentence boundary detection utilities
 * Finds the nearest sentence ending to snap cursor for generation
 */

/**
 * Finds the nearest sentence boundary (period, exclamation, question mark) to the cursor
 * @param text - Full document text
 * @param cursorPos - Current cursor position
 * @returns Position of nearest sentence boundary (after the punctuation)
 */
export function findNearestSentenceBoundary(text: string, cursorPos: number): number {
  // Sentence ending punctuation
  const sentenceEnders = /[.!?]/g;
  
  // Find all sentence boundaries
  const boundaries: number[] = [];
  let match;
  
  while ((match = sentenceEnders.exec(text)) !== null) {
    // Position after the punctuation (and any following whitespace)
    let pos = match.index + 1;
    
    // Skip whitespace after punctuation
    while (pos < text.length && /\s/.test(text[pos] || '')) {
      pos++;
    }
    
    boundaries.push(pos);
  }
  
  // If no boundaries found, return cursor position
  if (boundaries.length === 0) {
    return cursorPos;
  }
  
  // Find the closest boundary
  let closest = boundaries[0]!;
  let minDistance = Math.abs(boundaries[0]! - cursorPos);
  
  for (const boundary of boundaries) {
    const distance = Math.abs(boundary - cursorPos);
    if (distance < minDistance) {
      minDistance = distance;
      closest = boundary;
    }
  }
  
  return closest;
}

/**
 * Finds the next sentence boundary after the cursor
 * @param text - Full document text
 * @param cursorPos - Current cursor position
 * @returns Position after the next sentence ending, or end of text if none found
 */
export function findNextSentenceBoundary(text: string, cursorPos: number): number {
  const sentenceEnders = /[.!?]/g;
  sentenceEnders.lastIndex = cursorPos;
  
  const match = sentenceEnders.exec(text);
  if (!match) {
    return text.length; // End of document
  }
  
  // Position after the punctuation
  let pos = match.index + 1;
  
  // Skip whitespace
  while (pos < text.length && /\s/.test(text[pos] || '')) {
    pos++;
  }
  
  return pos;
}

/**
 * Finds the previous sentence boundary before the cursor
 * @param text - Full document text
 * @param cursorPos - Current cursor position
 * @returns Position after the previous sentence ending, or 0 if none found
 */
export function findPreviousSentenceBoundary(text: string, cursorPos: number): number {
  const textBefore = text.substring(0, cursorPos);
  const sentenceEnders = /[.!?]/g;
  
  let lastMatch = null;
  let match;
  
  while ((match = sentenceEnders.exec(textBefore)) !== null) {
    lastMatch = match;
  }
  
  if (!lastMatch) {
    return 0; // Start of document
  }
  
  // Position after the punctuation
  let pos = lastMatch.index + 1;
  
  // Skip whitespace
  while (pos < text.length && /\s/.test(text[pos] || '')) {
    pos++;
  }
  
  return pos;
}

/**
 * Checks if cursor is mid-sentence (not at a sentence boundary)
 * @param text - Full document text
 * @param cursorPos - Current cursor position
 * @returns True if cursor is in the middle of a sentence
 */
export function isMidSentence(text: string, cursorPos: number): boolean {
  // Check if we're at start or end
  if (cursorPos === 0 || cursorPos >= text.length) {
    return false;
  }
  
  // Check if there's a sentence ender right before cursor
  const charBefore = text[cursorPos - 1];
  if (charBefore && /[.!?]/.test(charBefore)) {
    return false;
  }
  
  // Check if we're at the start of a sentence (after whitespace following punctuation)
  let pos = cursorPos - 1;
  while (pos >= 0 && /\s/.test(text[pos] || '')) {
    pos--;
  }
  
  if (pos >= 0 && /[.!?]/.test(text[pos] || '')) {
    return false; // We're at sentence start
  }
  
  // We're mid-sentence
  return true;
}
