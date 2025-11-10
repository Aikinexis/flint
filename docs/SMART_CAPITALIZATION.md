# Smart Capitalization - Context-Aware Text Formatting

## Overview

Smart capitalization automatically formats generated and transcribed text based on the surrounding context. It ensures proper capitalization and spacing without manual editing.

## The Problem

**Before Smart Capitalization:**
```
User types: "This is a sentence."
AI generates: "Hello world"
Result: "This is a sentence.Hello world" ❌
```

Issues:
- No space before generated text
- Always capitalized (even mid-sentence)
- Doesn't respect context

## The Solution

**After Smart Capitalization:**
```
User types: "This is a sentence."
AI generates: "hello world"
Result: "This is a sentence. Hello world" ✅
```

Benefits:
- Automatic spacing
- Context-aware capitalization
- Natural text flow

## How It Works

### 1. Context Detection

The system analyzes text before the insertion point:

```typescript
const beforeText = "This is a sentence.";
const context = analyzeContext(beforeText, afterText);

// Result:
{
  shouldCapitalize: true,      // After period
  needsSpaceBefore: true,      // No trailing space
  isStartOfSentence: true,     // After sentence-ending punctuation
  isMidSentence: false         // Not in middle of sentence
}
```

### 2. Smart Capitalization Rules

| Context | Capitalization | Example |
|---------|---------------|---------|
| After `.` `!` `?` | Capitalize | "End. **H**ello" |
| After `,` `:` `;` | Lowercase | "First, **s**econd" |
| Mid-sentence | Lowercase | "This is **a** test" |
| Start of document | Capitalize | "**H**ello world" |
| After `(` `[` `"` | Lowercase | "Hello (**w**orld)" |

### 3. Smart Spacing Rules

| Context | Spacing | Example |
|---------|---------|---------|
| After word | Add space | "Hello **·**world" |
| After space | No space | "Hello · world" |
| After `(` `[` `"` | No space | "Hello (**world)" |
| Start of document | No space | "**H**ello" |

## Implementation

### Core Function

```typescript
import { formatGeneratedText } from '../utils/smartCapitalization';

// Get context
const beforeText = document.value.slice(0, cursorPos);

// Format text
const formatted = formatGeneratedText(generatedText, beforeText);

// Insert
document.value = beforeText + formatted + afterText;
```

### Integration Points

**1. AI Generation** (`src/content/caret.ts`)
```typescript
async insertAtCaret(text: string): Promise<InsertionResult> {
  // Get context
  const context = this.getCursorContext(1000);
  const beforeText = context?.before || '';

  // Apply smart capitalization
  const formattedText = formatGeneratedText(text, beforeText);

  // Insert formatted text
  return this.insertInTextarea(element, formattedText);
}
```

**2. Voice Transcription** (`src/components/VoiceRecorder.tsx`)
```typescript
// When transcription completes
const formatted = formatTranscription(
  transcript,
  documentText,
  cursorPosition
);

await messagingService.insertText(formatted);
```

## Examples

### Example 1: After Sentence
```typescript
const before = "This is a sentence.";
const generated = "hello world";
const result = formatGeneratedText(generated, before);
// Result: " Hello world"
```

### Example 2: Mid-Sentence
```typescript
const before = "This is a";
const generated = "Hello world";
const result = formatGeneratedText(generated, before);
// Result: " hello world"
```

### Example 3: After Comma
```typescript
const before = "First,";
const generated = "Second part";
const result = formatGeneratedText(generated, before);
// Result: " second part"
```

### Example 4: Start of Document
```typescript
const before = "";
const generated = "hello world";
const result = formatGeneratedText(generated, before);
// Result: "Hello world"
```

### Example 5: After Opening Parenthesis
```typescript
const before = "This is important (";
const generated = "Very important";
const result = formatGeneratedText(generated, before);
// Result: "very important"
```

### Example 6: After Quote
```typescript
const before = 'He said "';
const generated = "Hello there";
const result = formatGeneratedText(generated, before);
// Result: "hello there"
```

## Real-World Scenarios

### Email Writing
```
User types: "Dear John,"
AI generates: "I hope this email finds you well"
Result: "Dear John, i hope this email finds you well" ✅
```

### List Creation
```
User types: "1. First item\n2."
AI generates: "Second item"
Result: "1. First item\n2. second item" ✅
```

### Paragraph Continuation
```
User types: "First paragraph."
AI generates: "second paragraph starts here"
Result: "First paragraph. Second paragraph starts here" ✅
```

### Parenthetical Insertion
```
User types: "This is important ("
AI generates: "Very important"
Result: "This is important (very important" ✅
```

## API Reference

### `formatGeneratedText()`
Main function for formatting text with context awareness.

```typescript
function formatGeneratedText(
  generatedText: string,
  beforeText: string,
  afterText?: string
): string
```

**Parameters:**
- `generatedText` - Text to format (from AI or transcription)
- `beforeText` - Text before insertion point
- `afterText` - Text after insertion point (optional)

**Returns:** Formatted text with proper capitalization and spacing

### `applySmartCapitalization()`
Applies capitalization based on context.

```typescript
function applySmartCapitalization(
  generatedText: string,
  beforeText: string
): string
```

### `getSmartSpacing()`
Determines spacing needed before text.

```typescript
function getSmartSpacing(beforeText: string): string
```

**Returns:** `' '` (space) or `''` (no space)

### `analyzeContext()`
Analyzes surrounding context for formatting decisions.

```typescript
function analyzeContext(
  beforeText: string,
  afterText: string
): ContextAnalysis
```

**Returns:**
```typescript
{
  shouldCapitalize: boolean;
  needsSpaceBefore: boolean;
  needsSpaceAfter: boolean;
  isStartOfDocument: boolean;
  isEndOfDocument: boolean;
  isStartOfSentence: boolean;
  isMidSentence: boolean;
}
```

## Testing

Run the test suite:

```bash
npm test src/utils/__tests__/smartCapitalization.test.ts
```

Tests cover:
- Capitalization after sentence endings
- Lowercase mid-sentence
- Spacing logic
- Edge cases (parentheses, quotes, etc.)
- Real-world scenarios

## Configuration

Currently, smart capitalization is always enabled. To disable for specific cases:

```typescript
// Skip smart capitalization
const rawText = text; // Use original text
await messagingService.insertText(rawText);
```

## Limitations

1. **Language-specific**: Optimized for English
2. **Punctuation-based**: Relies on standard punctuation
3. **No semantic understanding**: Doesn't understand proper nouns
4. **Simple rules**: May not handle complex edge cases

## Future Enhancements

1. **Proper noun detection**: Capitalize names automatically
2. **Language support**: Rules for other languages
3. **User preferences**: Toggle capitalization behavior
4. **Smart quotes**: Handle different quote styles
5. **Markdown awareness**: Respect markdown syntax

## Troubleshooting

### Issue: Text always capitalized
**Cause**: Context detection not working  
**Fix**: Ensure `getCursorContext()` returns valid `before` text

### Issue: No spacing added
**Cause**: `beforeText` already has trailing space  
**Fix**: Working as intended - prevents double spaces

### Issue: Wrong capitalization in lists
**Cause**: List numbers treated as sentence endings  
**Fix**: Add special handling for numbered lists (future enhancement)

## Summary

Smart capitalization provides:
- ✅ Context-aware capitalization
- ✅ Automatic spacing
- ✅ Natural text flow
- ✅ Works for AI generation and voice transcription
- ✅ Zero configuration required

**Files:**
- `src/utils/smartCapitalization.ts` - Core logic
- `src/utils/__tests__/smartCapitalization.test.ts` - Tests
- `src/content/caret.ts` - Integration point

**Status**: ✅ Implemented and integrated
