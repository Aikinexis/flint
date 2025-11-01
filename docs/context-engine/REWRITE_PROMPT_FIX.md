# Rewrite Prompt Fix

## Problem Identified

The rewrite tool was ignoring custom prompts because:

1. **Rewriter API Limitation**: Chrome's Rewriter API doesn't always respect custom instructions passed via `sharedContext`
2. **Wrong API Priority**: The code was trying Rewriter API first, even when user provided custom prompts
3. **Fallback Issues**: Prompt API fallback wasn't being used effectively

## Root Cause

The Rewriter API is designed for preset tone adjustments (formal, casual, etc.) and doesn't reliably follow custom rewrite instructions. When users provided custom prompts like "Make this more technical" or "Simplify for beginners", the Rewriter API would often ignore these instructions.

## Solution Implemented

### Changed API Priority

**Before:**
```typescript
// Always tried Rewriter API first
if (availability.rewriterAPI === 'available') {
  // Use Rewriter with custom prompt in sharedContext
  // ❌ Often ignored custom prompts
}
```

**After:**
```typescript
// Use Prompt API for custom prompts
if (options.customPrompt && availability.promptAPI === 'available') {
  // Use Prompt API with explicit instruction
  // ✅ Reliably follows custom prompts
}

// Use Rewriter API only for preset tones (no custom prompt)
if (availability.rewriterAPI === 'available') {
  // Use Rewriter for tone adjustments
}
```

### Improved Prompt Structure

Added clear instructions to ensure AI follows user's intent:

```typescript
const prompt = `${sharedContext}

User's rewrite instruction: ${options.customPrompt}

Text to rewrite:
${text}

IMPORTANT: Follow the user's instruction exactly. Output ONLY the rewritten text, no explanations.`;
```

## Changes Made

### 1. `AIService.rewrite()` Method
- Prioritizes Prompt API when custom prompt is provided
- Uses Rewriter API only for preset tones
- Better fallback handling

### 2. `AIService.rewriteWithContext()` Method
- Same priority fix applied
- Includes surrounding context for style matching
- Explicit instruction formatting

## Testing

### Before Fix
```
User prompt: "Make this more technical"
Result: Text rewritten with generic improvements, ignoring "technical" instruction
```

### After Fix
```
User prompt: "Make this more technical"
Result: Text rewritten with technical terminology and formal style as requested
```

## API Usage Strategy

### Prompt API (window.ai)
- **Use for**: Custom rewrite instructions
- **Pros**: Follows instructions reliably, flexible
- **Cons**: May not be available in all extension contexts
- **When**: User provides custom prompt

### Rewriter API (self.Rewriter)
- **Use for**: Preset tone adjustments (formal, casual)
- **Pros**: Fast, works in extension contexts
- **Cons**: Limited to preset tones, ignores custom instructions
- **When**: No custom prompt, just tone adjustment

### Summarizer API (self.Summarizer)
- **Use for**: Summarization
- **Pros**: Respects sharedContext well, multiple modes
- **Cons**: Limited to summarization tasks
- **Status**: Working correctly, no changes needed

## Impact

### Rewrite Tool
- ✅ Now respects custom prompts
- ✅ Better instruction following
- ✅ More predictable results
- ✅ Maintains context awareness

### Summarize Tool
- ✅ Already working correctly
- ✅ No changes needed
- ✅ Respects mode and reading level options

## User Experience

### What Users Will Notice
1. **Custom rewrite prompts now work** - "Make this funnier", "Add more details", etc.
2. **Better instruction following** - AI does what you ask
3. **More consistent results** - Same prompt produces similar results

### What Stays the Same
- Summarize tool continues to work as before
- Generate tool unaffected
- Context awareness still active
- All existing features preserved

## Technical Notes

### API Availability
- Prompt API may not be available in all contexts
- Fallback chain ensures something always works:
  1. Prompt API (for custom prompts)
  2. Rewriter API (for preset tones)
  3. Prompt API (final fallback)
  4. Error message (if nothing available)

### Context Awareness
Both rewrite methods maintain context awareness:
- `rewrite()` - Basic rewrite without surrounding context
- `rewriteWithContext()` - Enhanced with 500 chars before/after

### Backward Compatibility
- ✅ No breaking changes
- ✅ Existing code continues to work
- ✅ Better results with same API

## Conclusion

The fix ensures that custom rewrite prompts are now properly respected by using the Prompt API (which follows instructions reliably) instead of the Rewriter API (which is designed for preset tones only). This provides a much better user experience while maintaining all existing functionality.
