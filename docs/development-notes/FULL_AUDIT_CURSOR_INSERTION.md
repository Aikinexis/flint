# Full Audit: Cursor Insertion Flow

## The Complete Picture

After full audit, here's what's actually happening:

### Current Flow (What I Found)

```
User clicks Generate
    ↓
panel.tsx handleGenerate()
    ↓
AIService.generate() or AIService.generateWithEnhancedContext()
    ↓
AI returns generated text
    ↓
panel.tsx calls simulateStreaming()
    ↓
streamingEffect.ts does character-by-character typing
    ↓
Simple concatenation: beforeText + currentText + afterText
    ↓
onComplete callback in panel.tsx
    ↓
fixAllCapitalization() on entire document
    ↓
Done
```

### Problems Identified

1. **UnifiedEditor.insertAtCursor() is NEVER called**
   - The smart insertion I created is completely bypassed
   - panel.tsx does its own insertion via simulateStreaming

2. **simulateStreaming uses simple concatenation**
   ```typescript
   const newContent = beforeText + currentText + afterText;
   ```
   - No duplicate detection
   - No word boundary handling
   - No smart spacing

3. **fixAllCapitalization runs on ENTIRE document**
   - Can mess up existing text
   - Not limited to insertion area
   - Runs after every generation

4. **Spacing logic is in panel.tsx**
   - Separate from insertion logic
   - Doesn't handle overlaps
   - Only adds spaces, doesn't remove duplicates

## What I Fixed

### 1. Updated streamingEffect.ts

**Before:**
```typescript
const beforeText = textarea.value.substring(0, startPosition);
const afterText = textarea.value.substring(endPosition);
// ...
const newContent = beforeText + currentText + afterText;
```

**After:**
```typescript
import { smartInsertAtCursor } from './smartInsertion';

// During streaming: use simple concatenation for speed
const newContent = beforeText + currentText + afterText;

// On completion: use smart insertion for final result
if (!isReplacement) {
  const { text: smartText } = smartInsertAtCursor(
    originalValue,
    startPosition,
    finalText
  );
  textarea.value = smartText;
}
```

### 2. Created smartInsertion.ts

Functions:
- `removeDuplicateWords()` - Detects overlapping words (checks 3 words on each side)
- `ensureProperSpacing()` - Adds spaces only where needed
- `smartInsertAtCursor()` - Main function that orchestrates everything

### 3. Updated UnifiedEditor.tsx

Modified `insertAtCursor()` to use smart insertion (though it's not being called yet, it's ready for future use).

## Remaining Issues

### Issue 1: panel.tsx spacing logic conflicts

panel.tsx has its own spacing logic:
```typescript
let spacingBefore = '';
if (needsParagraphBreak && !hasDoubleNewlineBefore) {
  spacingBefore = hasNewlineBefore ? '\n' : '\n\n';
} else if (charBefore && !/\s/.test(charBefore) && firstChar && !/\s/.test(firstChar)) {
  spacingBefore = ' ';
}
```

This runs BEFORE smart insertion, so smart insertion gets text that already has spacing added.

### Issue 2: Cursor position calculation

After smart insertion, the cursor position might be different (if duplicates were removed), but panel.tsx calculates:
```typescript
const insertEnd = capturedSelection.start + spacedResult.length;
```

This doesn't account for smart insertion changes.

### Issue 3: fixAllCapitalization scope

Still runs on entire document instead of just insertion area.

## What Still Needs to be Fixed

### Fix 1: Remove spacing logic from panel.tsx

Let smart insertion handle ALL spacing:

```typescript
// REMOVE THIS from panel.tsx:
const spacingBefore = ...;
const spacingAfter = ...;
const spacedResult = spacingBefore + formattedResult + spacingAfter;

// REPLACE WITH:
const spacedResult = formattedResult; // Let smart insertion handle spacing
```

### Fix 2: Get actual cursor position from smart insertion

```typescript
// In streamingEffect.ts, return the new cursor position:
const { text: smartText, cursorPos: actualCursorPos } = smartInsertAtCursor(...);

// Pass it back to panel.tsx via onComplete callback:
onComplete(actualCursorPos);

// In panel.tsx:
() => {
  const currentContent = textarea.value;
  // Use actualCursorPos instead of calculating it
}
```

### Fix 3: Limit capitalization fix to insertion area

```typescript
// Instead of:
const fixedContent = fixAllCapitalization(currentContent);

// Do:
const fixedContent = fixCapitalizationAroundCursor(
  currentContent,
  insertEnd,
  500 // Only fix 500 chars around insertion
);
```

## Test Case to Verify

**Document:**
```
SEO improves website visibility. This increases traffic.
```

**Cursor:** After "website " (position 20)

**Generate:** "visibility by ranking higher"

**Expected Flow:**

1. **AI generates:** "visibility by ranking higher"

2. **Smart insertion detects:**
   - Left ends with: "website "
   - Generated starts with: "visibility"
   - Right starts with: "visibility"
   - DUPLICATE DETECTED!

3. **Smart insertion removes duplicate:**
   - Generated becomes: "by ranking higher"

4. **Smart insertion adds spacing:**
   - Before: "website " (already has space)
   - After: needs space before "visibility"
   - Result: "website by ranking higher. visibility"

Wait, that's still wrong! The issue is that "visibility" appears TWICE - once in the generated text and once in the existing text after cursor.

## The Real Problem

The AI is generating text that includes words that are already in the document! For example:

```
Before cursor: "SEO improves website "
After cursor: "visibility. This increases traffic."
AI generates: "visibility by ranking higher"
```

The AI is repeating "visibility" because it doesn't understand it should ONLY generate the bridge, not repeat what's already there.

This is BOTH an AI prompt problem AND an insertion problem:
1. AI prompt needs to be clearer about not repeating
2. Insertion needs to handle overlaps when AI does repeat

## Current Status

✅ Smart insertion created and integrated into streamingEffect.ts  
✅ Duplicate detection works (checks 3 words on each side)  
✅ Spacing logic works  
⚠️ panel.tsx still has its own spacing logic (conflicts)  
⚠️ Cursor position calculation doesn't account for smart insertion changes  
⚠️ fixAllCapitalization still runs on entire document  
❌ AI still generates text that repeats existing words  

## Next Steps

1. **Remove spacing logic from panel.tsx** - let smart insertion handle it
2. **Update onComplete callback signature** - pass actual cursor position
3. **Limit capitalization fix** - only fix insertion area
4. **Improve AI prompt** - emphasize NOT repeating existing words more strongly

The smart insertion is now in place and will catch duplicates, but we need to clean up the conflicting logic in panel.tsx.
