/**
 * Lightweight Context Engine for Flint
 * Provides intelligent context extraction and relevance scoring without external dependencies
 * Optimized for Chrome's built-in AI APIs (Gemini Nano)
 */

/**
 * Context chunk with relevance score
 */
export interface ContextChunk {
  text: string;
  score: number;
  position: number;
}

/**
 * Assembled context for AI prompts
 */
export interface AssembledContext {
  localContext: string;
  cursorOffset: number; // Position of cursor within localContext
  relatedSections: string[];
  totalChars: number;
}

/**
 * Context engine options
 */
export interface ContextEngineOptions {
  localWindow?: number; // Characters to extract around cursor (default: 1500)
  maxRelatedSections?: number; // Max number of related sections (default: 3)
  enableRelevanceScoring?: boolean; // Enable semantic relevance (default: true)
  enableDeduplication?: boolean; // Remove duplicate sections (default: true)
}

/**
 * Extracts local context window around cursor position
 * @param text - Full document text
 * @param cursor - Cursor position
 * @param window - Characters to extract in each direction (default: 800)
 * @returns Object with local context and cursor position within that context
 */
export function getLocalContext(
  text: string,
  cursor: number,
  window = 800
): { text: string; cursorOffset: number } {
  const start = Math.max(0, cursor - window);
  const end = Math.min(text.length, cursor + window);
  const contextText = text.slice(start, end);
  const cursorOffset = cursor - start; // Position of cursor within the extracted context
  return { text: contextText, cursorOffset };
}

/**
 * Calculates keyword overlap score between two text segments
 * Uses Jaccard similarity coefficient for fast, deterministic scoring
 * @param a - First text segment
 * @param b - Second text segment
 * @returns Similarity score (0-1)
 */
export function keywordOverlapScore(a: string, b: string): number {
  // Normalize and tokenize
  const aWords = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  ); // Filter out short words
  const bWords = new Set(
    b
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );

  if (aWords.size === 0 || bWords.size === 0) return 0;

  // Calculate intersection
  let overlap = 0;
  for (const w of aWords) {
    if (bWords.has(w)) overlap++;
  }

  // Jaccard similarity: intersection / union
  const union = aWords.size + bWords.size - overlap;
  return overlap / union;
}

/**
 * Splits text into semantic sections (paragraphs, code blocks, lists)
 * @param text - Full document text
 * @returns Array of text sections
 */
export function splitIntoSections(text: string): string[] {
  // Split on double newlines (paragraphs) or major structural breaks
  const sections = text.split(/\n{2,}/);

  // Further split very long sections (over 1000 chars)
  const refined: string[] = [];
  for (const section of sections) {
    if (section.length > 1000) {
      // Split long sections on single newlines
      const subsections = section.split(/\n/).filter((s) => s.trim().length > 0);
      refined.push(...subsections);
    } else if (section.trim().length > 0) {
      refined.push(section);
    }
  }

  return refined;
}

/**
 * Gets relevant sections from document based on query text
 * Uses lightweight keyword overlap scoring instead of embeddings
 * @param text - Full document text
 * @param query - Query text (usually local context around cursor)
 * @param maxSections - Maximum number of sections to return (default: 3)
 * @returns Array of relevant text sections
 */
export function getRelevantSections(
  text: string,
  query: string,
  maxSections = 3
): ContextChunk[] {
  const sections = splitIntoSections(text);

  // Score each section
  const scored = sections.map((section, index) => ({
    text: section,
    score: keywordOverlapScore(section, query),
    position: index,
  }));

  // Sort by score (descending) and return top N
  return scored
    .filter((s) => s.score > 0.05) // Filter out very low scores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSections);
}

/**
 * Removes near-duplicate sections using simple prefix matching
 * @param chunks - Array of context chunks
 * @returns Deduplicated array
 */
export function removeDuplicates(chunks: ContextChunk[]): ContextChunk[] {
  const unique: ContextChunk[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    // Use first 60 chars as fingerprint
    const key = chunk.text.slice(0, 60).toLowerCase().trim();
    if (!seen.has(key) && key.length > 10) {
      seen.add(key);
      unique.push(chunk);
    }
  }

  return unique;
}

/**
 * Compresses context chunks by extracting key sentences
 * Uses simple heuristics: first sentence + sentences with keywords
 * @param chunks - Array of context chunks
 * @param maxCharsPerChunk - Max characters per chunk (default: 200)
 * @returns Compressed text array
 */
export function compressChunks(chunks: ContextChunk[], maxCharsPerChunk = 200): string[] {
  return chunks.map((chunk) => {
    const sentences = chunk.text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length === 0) return chunk.text.slice(0, maxCharsPerChunk);

    // Always include first sentence
    let compressed = sentences[0]?.trim() || '';

    // Add more sentences until we hit the limit
    for (let i = 1; i < sentences.length && compressed.length < maxCharsPerChunk; i++) {
      const sentence = sentences[i]?.trim();
      if (sentence && compressed.length + sentence.length + 2 < maxCharsPerChunk) {
        compressed += '. ' + sentence;
      }
    }

    return compressed + (compressed.endsWith('.') ? '' : '.');
  });
}

/**
 * Assembles context for AI prompt with intelligent section selection
 * @param fullText - Complete document text
 * @param cursorPos - Current cursor position
 * @param options - Context engine options
 * @returns Assembled context object
 */
export function assembleContext(
  fullText: string,
  cursorPos: number,
  options: ContextEngineOptions = {}
): AssembledContext {
  const {
    localWindow = 1500, // Increased from 800 to 1500 for better context
    maxRelatedSections = 3,
    enableRelevanceScoring = true,
    enableDeduplication = true,
  } = options;

  // 1. Extract local context (immediate surroundings) with cursor position
  const { text: localContextText, cursorOffset } = getLocalContext(
    fullText,
    cursorPos,
    localWindow
  );

  // 2. Get relevant sections from rest of document
  let relatedSections: string[] = [];

  if (enableRelevanceScoring && fullText.length > localWindow * 2) {
    // Only do relevance scoring if document is large enough
    const relevantChunks = getRelevantSections(fullText, localContextText, maxRelatedSections * 2);

    // 3. Remove duplicates
    const uniqueChunks = enableDeduplication
      ? removeDuplicates(relevantChunks)
      : relevantChunks;

    // 4. Compress chunks to fit within token limits
    relatedSections = compressChunks(uniqueChunks.slice(0, maxRelatedSections), 250);
  }

  // Calculate total characters
  const totalChars =
    localContextText.length + relatedSections.reduce((sum, s) => sum + s.length, 0);

  return {
    localContext: localContextText,
    cursorOffset,
    relatedSections,
    totalChars,
  };
}

/**
 * Formats assembled context into a structured prompt section
 * @param context - Assembled context
 * @param includeRelated - Whether to include related sections (default: true)
 * @returns Formatted context string for AI prompt
 */
export function formatContextForPrompt(
  context: AssembledContext,
  includeRelated = true
): string {
  let formatted = '';

  // Add local context (always included)
  if (context.localContext.trim()) {
    // Split at the ACTUAL cursor position, not midpoint
    const before = context.localContext.slice(0, context.cursorOffset);
    const after = context.localContext.slice(context.cursorOffset);

    // Get last few words before cursor and first few words after for emphasis
    const lastWords = before.trim().split(/\s+/).slice(-5).join(' ');
    const nextWords = after.trim().split(/\s+/).slice(0, 5).join(' ');

    // Always show both before and after, even if one is empty
    formatted += `CONTEXT BEFORE CURSOR:\n${before || '[Start of document]'}\n\n`;
    formatted += `CONTEXT AFTER CURSOR:\n${after || '[End of document]'}\n\n`;
    
    // Provide algorithmic steps for cursor insertion
    if (lastWords && nextWords) {
      formatted += `\nNote: The cursor is at a sentence boundary. Generate new sentences that continue naturally from the context above.\n\n`;
    } else if (lastWords) {
      formatted += `⚠️ CURSOR AT END: Your text will continue after "...${lastWords}"\n\n`;
    } else if (nextWords) {
      formatted += `⚠️ CURSOR AT START: Your text will come before "${nextWords}..."\n\n`;
    }
  }

  // Add related sections if enabled and available
  if (includeRelated && context.relatedSections.length > 0) {
    formatted += `RELATED SECTIONS FROM DOCUMENT (for context and consistency):\n`;
    context.relatedSections.forEach((section, i) => {
      formatted += `${i + 1}. ${section.trim()}\n\n`;
    });
  }

  return formatted.trim();
}

/**
 * Extracts document structure (headings, sections) for better context
 * @param text - Full document text
 * @returns Array of heading/section titles
 */
export function extractDocumentStructure(text: string): string[] {
  const headings: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Markdown headings
    if (/^#{1,6}\s+.+/.test(trimmed)) {
      headings.push(trimmed.replace(/^#+\s*/, ''));
    }
    // ALL CAPS headings (at least 3 words)
    else if (/^[A-Z][A-Z\s]{10,}$/.test(trimmed)) {
      headings.push(trimmed);
    }
    // Email subject lines
    else if (/^Subject:\s*.+/i.test(trimmed)) {
      headings.push(trimmed.replace(/^Subject:\s*/i, ''));
    }
  }

  return headings;
}

/**
 * Gets the nearest heading before cursor position
 * @param text - Full document text
 * @param cursorPos - Cursor position
 * @returns Nearest heading or null
 */
export function getNearestHeading(text: string, cursorPos: number): string | null {
  const textBeforeCursor = text.slice(0, cursorPos);
  const lines = textBeforeCursor.split('\n');

  // Search backwards for a heading
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Markdown heading
    if (/^#{1,6}\s+.+/.test(line)) {
      return line.replace(/^#+\s*/, '');
    }
    // ALL CAPS heading
    if (/^[A-Z][A-Z\s]{10,}$/.test(line)) {
      return line;
    }
  }

  return null;
}
