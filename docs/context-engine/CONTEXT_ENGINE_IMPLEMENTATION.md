# Lightweight Context Engine Implementation

## Overview

Flint now includes an enhanced context awareness system that provides better document understanding without external dependencies, network calls, or complex ML models. This implementation is based on the "Lightweight Context Engine" approach optimized for Chrome's built-in AI (Gemini Nano).

## Key Features

### 1. Local Context Window
- Extracts **1500 characters** around the cursor (750 before + 750 after)
- Increased from previous 1000 chars for better understanding
- Fast extraction using simple string slicing

### 2. Semantic Relevance Scoring
- Uses **Jaccard similarity** (keyword overlap) to find related sections
- No embeddings or ML models required
- Deterministic and fast (processes documents in milliseconds)
- Filters out very low relevance scores (< 0.05)

### 3. Intelligent Section Selection
- Splits document into semantic sections (paragraphs, code blocks)
- Scores each section against local context
- Selects top 3 most relevant sections from entire document
- Provides document-level awareness without sending entire document

### 4. Deduplication
- Removes near-duplicate sections using first 60 chars as fingerprint
- Prevents redundant context from being sent to AI
- Keeps only unique, valuable information

### 5. Compression
- Extracts key sentences from long sections
- Limits each section to ~250 chars
- Ensures context fits within AI token limits
- Preserves most important information

### 6. Document Structure Awareness
- Detects markdown headings (`# Title`)
- Detects ALL CAPS headings
- Detects email subject lines
- Finds nearest heading before cursor position

## Implementation Details

### Core Module: `src/utils/contextEngine.ts`

```typescript
// Main function to assemble context
export function assembleContext(
  fullText: string,
  cursorPos: number,
  options: ContextEngineOptions = {}
): AssembledContext

// Key helper functions
export function getLocalContext(text: string, cursor: number, window: number): string
export function keywordOverlapScore(a: string, b: string): number
export function getRelevantSections(text: string, query: string, maxSections: number): ContextChunk[]
export function removeDuplicates(chunks: ContextChunk[]): ContextChunk[]
export function compressChunks(chunks: ContextChunk[], maxCharsPerChunk: number): string[]
export function formatContextForPrompt(context: AssembledContext, includeRelated: boolean): string
```

### Enhanced AI Service Methods

#### `AIService.generateWithEnhancedContext()`
- Uses context engine to assemble intelligent context
- Includes local context + 3 related sections + nearest heading
- Total context: ~2250 chars (up from 1000)
- Automatically enabled when context awareness is on

#### `AIService.rewriteWithContext()`
- Includes 500 chars before and after selection
- Helps AI match writing style from surrounding text
- Total context: ~1000 chars (up from 0)
- Improves flow and consistency

### Integration in `ToolControlsContainer.tsx`

```typescript
// Generate with enhanced context
if (settings.contextAwarenessEnabled && content.trim()) {
  result = await AIService.generateWithEnhancedContext(
    prompt,
    content,
    cursorPos,
    options,
    {
      localWindow: 1500,
      maxRelatedSections: 3,
      enableRelevanceScoring: true,
      enableDeduplication: true,
    }
  );
}

// Rewrite with context
if (settings.contextAwarenessEnabled) {
  result = await AIService.rewriteWithContext(
    textToRewrite,
    content,
    selectionStart,
    options
  );
}
```

## Performance Characteristics

### Speed
- Context assembly: < 10ms for typical documents (< 10,000 words)
- Keyword overlap scoring: O(n) where n = number of sections
- No network calls or external API dependencies

### Memory
- Minimal memory footprint
- No caching of embeddings or models
- Processes documents on-demand

### Accuracy
- Jaccard similarity provides good relevance scoring for most use cases
- Works well for documents with consistent terminology
- May miss semantic relationships that embeddings would catch, but fast enough to compensate

## Testing

Comprehensive test suite in `src/utils/contextEngine.test.ts`:
- 27 tests covering all core functions
- Tests for edge cases (empty documents, cursor at boundaries)
- Tests for deduplication and compression
- All tests passing ✅

Run tests:
```bash
npm test -- contextEngine.test.ts
```

## Configuration Options

### Context Engine Options
```typescript
interface ContextEngineOptions {
  localWindow?: number;           // Default: 1500
  maxRelatedSections?: number;    // Default: 3
  enableRelevanceScoring?: boolean; // Default: true
  enableDeduplication?: boolean;   // Default: true
}
```

### Adjusting Context Window
To increase context window for longer documents:
```typescript
const context = assembleContext(fullText, cursorPos, {
  localWindow: 2000,        // Increase to 2000 chars
  maxRelatedSections: 5,    // Include 5 sections instead of 3
});
```

## Benefits Over Previous System

### Before (Old System)
- ❌ Only 1000 chars of local context
- ❌ No document-level awareness
- ❌ Rewrite had zero context
- ❌ Fixed window regardless of document structure
- ❌ No deduplication or compression

### After (Enhanced System)
- ✅ 1500 chars of local context (50% increase)
- ✅ 3 relevant sections from entire document
- ✅ Rewrite includes 1000 chars of surrounding context
- ✅ Smart section selection based on relevance
- ✅ Automatic deduplication and compression
- ✅ Document structure awareness (headings)
- ✅ Total context: 2250 chars (125% increase)

## Future Enhancements

### Potential Improvements
1. **Adaptive context window** - Adjust based on document size
2. **Section caching** - Cache section splits for large documents
3. **TF-IDF scoring** - More sophisticated relevance scoring
4. **Summarize with context** - Add context awareness to summarize tool
5. **User-configurable weights** - Let users adjust relevance scoring

### Advanced Features (Optional)
1. **Hierarchical context** - Understand document outline structure
2. **Cross-reference detection** - Find sections that reference each other
3. **Temporal awareness** - Understand document flow and progression
4. **Multi-document context** - Include context from related documents

## Compatibility

- ✅ Works with all Chrome built-in AI APIs (Summarizer, Rewriter, Writer, Prompt)
- ✅ No external dependencies
- ✅ No network calls
- ✅ Privacy-preserving (all processing local)
- ✅ Fast enough for real-time use
- ✅ Compatible with Chrome's token limits

## Conclusion

The lightweight context engine provides a significant improvement in context awareness without sacrificing performance or privacy. By using simple but effective techniques like keyword overlap scoring and intelligent section selection, Flint can now understand documents much better while remaining fast and local-first.

The implementation is production-ready, well-tested, and provides immediate benefits to users writing longer documents.
