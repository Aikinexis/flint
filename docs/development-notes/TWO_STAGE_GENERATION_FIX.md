# Two-Stage Generation: The Final Solution

## The Problem

Chrome's built-in AI models (Writer, Prompt API) are trained for **continuation**, not **infilling**. They can't generate text that properly connects to what comes AFTER the cursor, even with explicit instructions.

## The Solution: Two-Stage Process

### Stage 1: Generate (Continuation)
Use Writer API to generate text based on what comes BEFORE the cursor.
- Fast and natural
- Matches tone and topic
- But doesn't connect to what follows

### Stage 2: Rewrite (Smoothing)
Use Rewriter API to smooth the generated text with BOTH left and right context.
- Rewriter can see both sides
- Adjusts wording for seamless flow
- Fixes transitions

## Implementation

```typescript
// STAGE 1: Generate continuation from left context
const result = await writer.write(prompt);

// STAGE 2: If there's text after cursor, smooth with Rewriter
const textAfterCursor = fullDocument.substring(cursorPos).trim();
if (textAfterCursor && rewriterAPI available) {
  const contextBefore = fullDocument.substring(cursorPos - 200, cursorPos);
  const contextAfter = fullDocument.substring(cursorPos, cursorPos + 200);
  
  const smoothed = await rewriteWithContext(
    result,
    fullDocument,
    cursorPos,
    {
      customPrompt: `Smooth this text so it flows naturally from "${contextBefore}" into "${contextAfter}". Keep the meaning but adjust wording for seamless flow.`
    }
  );
  
  return smoothed;
}

return result;
```

## How It Works

### Example

**Document:**
```
SEO improves website visibility. [CURSOR] This increases traffic.
```

**User prompt:** "explain how"

**Stage 1 (Writer API):**
```
Generated: "by optimizing content and ranking higher in search results"
```
- ✅ Good continuation from left
- ❌ Doesn't connect to "This increases traffic"

**Stage 2 (Rewriter API):**
```
Input: "by optimizing content and ranking higher in search results"
Context before: "SEO improves website visibility."
Context after: "This increases traffic."

Rewriter smooths to: "by ranking higher in search results, which"
```
- ✅ Connects "which" to "increases traffic"
- ✅ Maintains meaning
- ✅ Seamless flow

**Final result:**
```
SEO improves website visibility by ranking higher in search results, which increases traffic.
```

## Why This Works

### Writer API Strengths
- ✅ Fast generation
- ✅ Natural continuation
- ✅ Matches tone and style
- ❌ Can't do infilling

### Rewriter API Strengths
- ✅ Can see both sides of text
- ✅ Adjusts wording for flow
- ✅ Maintains meaning
- ✅ Smooths transitions

### Combined
- ✅ Fast initial generation (Stage 1)
- ✅ Smooth transitions (Stage 2)
- ✅ Works around model limitations
- ✅ Best of both worlds

## When Stage 2 Runs

Stage 2 only runs when:
1. There's text after the cursor (`textAfterCursor.trim()` is not empty)
2. Rewriter API is available
3. Stage 1 completed successfully

If any condition fails, it returns Stage 1 result.

## Performance

- **Stage 1:** ~1-2 seconds (generation)
- **Stage 2:** ~1-2 seconds (rewriting)
- **Total:** ~2-4 seconds for mid-document insertion
- **End of document:** ~1-2 seconds (Stage 2 skipped)

## Error Handling

```typescript
try {
  const smoothed = await rewriteWithContext(...);
  return smoothed;
} catch (error) {
  console.warn('[AI] Stage 2 rewrite failed, using Stage 1 result:', error);
  return result; // Fallback to Stage 1
}
```

If Stage 2 fails, the user still gets the Stage 1 result.

## Logging

```
[AI] Stage 2: Using Rewriter to smooth transitions with right context
[AI] Stage 2 complete: Text smoothed for better flow
```

Or if it fails:
```
[AI] Stage 2 rewrite failed, using Stage 1 result: [error]
```

## Benefits

1. **Works around model limitations** - Uses each model for what it's good at
2. **Better flow** - Stage 2 ensures smooth transitions
3. **Maintains meaning** - Rewriter preserves the generated content
4. **Graceful degradation** - Falls back to Stage 1 if Stage 2 fails
5. **Automatic** - User doesn't need to do anything special

## Trade-offs

### Pros
- ✅ Much better flow and transitions
- ✅ Connects to text after cursor
- ✅ Uses model strengths
- ✅ Automatic fallback

### Cons
- ⚠️ Takes 2x as long (two API calls)
- ⚠️ Requires both Writer and Rewriter APIs
- ⚠️ More complex logic

## Alternative: Skip Stage 2 for Short Text

Could optimize by skipping Stage 2 when:
- Generated text is very short (< 20 words)
- Text after cursor is far away (> 500 chars)
- User is at end of document

```typescript
const shouldSmooth = 
  textAfterCursor.length > 0 &&
  textAfterCursor.length < 500 &&
  result.split(/\s+/).length > 20;

if (shouldSmooth && availability.rewriterAPI === 'available') {
  // Run Stage 2
}
```

## Files Modified

**src/services/ai.ts**
- `generateWithEnhancedContext()` - Added two-stage process
- Stage 1: Writer API generates continuation
- Stage 2: Rewriter API smooths with bidirectional context
- Automatic fallback if Stage 2 fails

## Testing

To verify this works, check console logs:

```
[AI] Enhanced context assembled: ...
[AI] Formatted context for prompt: ...
[AI] Final prompt being sent: ...
[AI] Stage 2: Using Rewriter to smooth transitions with right context
[AI] Stage 2 complete: Text smoothed for better flow
```

If you see "Stage 2 complete", the two-stage process ran successfully.

## Conclusion

This two-stage approach is the optimal solution given the model limitations:
1. **Stage 1** generates natural continuation (what models are good at)
2. **Stage 2** smooths transitions (what Rewriter is good at)
3. **Result** is text that flows naturally in both directions

This is a clever workaround that uses each model's strengths to achieve true bidirectional context awareness, even though no single model can do it alone.
