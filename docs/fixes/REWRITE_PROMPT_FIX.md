# Rewrite Prompt API Fix - Selected Text Context

## Problem

When using the Rewrite feature with custom prompts (e.g., "change the date to November 11"), the Prompt API wasn't properly understanding what text was selected. The AI would:
- Hallucinate and add text that wasn't in the original
- Ignore the selected text boundaries
- Generate completely new text instead of modifying the selected text
- Example: Selected "Tuesday, 4 November" → Asked to "change to November 11" → AI outputs "I'll be there on Tuesday, November 11" (adding "I'll be there" which wasn't in the original)

## Root Cause

The Prompt API (`window.ai.createTextSession()`) doesn't have a built-in `sharedContext` parameter like the Rewriter API does. When we fall back to the Prompt API for custom prompts, we need to explicitly include the selected text in the prompt string itself, and make it crystal clear what the selected text is versus what the instruction is.

The previous prompt structure was:
```
User's rewrite instruction: change the date to November 5
Text to rewrite:
November 1, 2025
```

This wasn't clear enough for the AI to understand that "November 1, 2025" was the text it needed to rewrite.

## Solution

### 1. Much More Forceful Prompt Structure

Changed all rewrite prompts to use CRITICAL instructions with explicit examples of what NOT to do:

```
=== CRITICAL REWRITE INSTRUCTIONS ===

You are rewriting EXACTLY this text (and ONLY this text):

"Tuesday, 4 November"

User's modification request: change to November 11

RULES YOU MUST FOLLOW:
1. Take the EXACT text shown in quotes above
2. Apply ONLY the user's requested modification to it
3. Keep everything else from the original text unchanged
4. Output ONLY the modified version - no explanations, no extra text, no quotes
5. Do NOT add any text that wasn't in the original
6. Do NOT remove any text unless the user specifically asked to

Example:
Original: "Meeting on Tuesday, November 4"
Request: "change to November 11"
Correct output: Meeting on Tuesday, November 11
Wrong output: I'll be there on Tuesday, November 11 (WRONG - added extra text)

Now rewrite the text shown above:
```

### 2. Added Debug Logging

Added console logging to help debug issues:
- Logs the full prompt being sent to the Prompt API (first 500 chars)
- Logs selected text length and instruction for each rewrite operation

### 3. Changes Made

Updated 4 locations in `src/services/ai.ts`:

1. **`rewrite()` method - custom prompt path** (line ~508)
   - Uses Prompt API when custom prompt is provided
   - Now includes clear delimiters around selected text

2. **`rewrite()` method - fallback path** (line ~560)
   - Final fallback when Rewriter API fails
   - Same clear delimiter structure

3. **`rewriteWithContext()` method - custom prompt path** (line ~927)
   - Context-aware rewriting with custom prompts
   - Includes surrounding context + clear selected text delimiters

4. **`rewriteWithContext()` method - fallback path** (line ~977)
   - Final fallback for context-aware rewriting
   - Same clear delimiter structure

5. **`prompt()` method** (line ~365)
   - Added debug logging to see exactly what's being sent to the AI

## Testing

To verify the fix works:

1. Open Flint extension
2. Type: "I'll be in next Tuesday, 4 November."
3. Select ONLY: "Tuesday, 4 November"
4. Click Rewrite and enter: "change to November 11"
5. Check browser console for logs showing:
   - The exact selected text
   - The full prompt being sent
6. Verify the AI outputs ONLY: "Tuesday, 11 November"
   - NOT: "I'll be in next Tuesday, 11 November" (wrong - added extra text)
   - NOT: "Tuesday, November 11th" (wrong - changed format)
   - CORRECT: "Tuesday, 11 November" (only changed the date)

## Expected Console Output

```
[AI] Rewrite - Selected text: Tuesday, 4 November Custom prompt: change to November 11
[AI] Prompt API - Full prompt being sent: Current date: Saturday, November 1, 2025 at 2:45 PM

=== CRITICAL REWRITE INSTRUCTIONS ===

You are rewriting EXACTLY this text (and ONLY this text):

"Tuesday, 4 November"

User's modification request: change to November 11

RULES YOU MUST FOLLOW:
1. Take the EXACT text shown in quotes above
2. Apply ONLY the user's requested modification to it
...
```

## Key Improvements

✅ **CRITICAL Instructions Header**: Makes it clear this is a high-priority task

✅ **Quoted Text**: Selected text is shown in quotes to clearly mark boundaries

✅ **Numbered Rules**: 6-7 explicit rules the AI MUST follow

✅ **Explicit Examples**: Shows correct vs. wrong output to prevent hallucination

✅ **Anti-Hallucination Rules**: 
   - "Do NOT add any text that wasn't in the original"
   - "Do NOT remove any text unless the user specifically asked to"
   - "Keep everything else from the original text unchanged"

✅ **Context Separation**: When surrounding context is provided, explicitly states "for style reference only - do NOT copy from it"

✅ **Better Debug Logging**: Console now logs the actual selected text (not just length) for easier debugging

✅ **Consistent Structure**: All 4 rewrite paths use the same forceful prompt structure

## Files Modified

- `src/services/ai.ts` - Updated all rewrite prompt structures and added debug logging

## Impact

- Users can now successfully use custom rewrite instructions like "change the date to X"
- The AI understands exactly what text to rewrite vs. what the instruction is
- Better debugging capability with console logs
- More reliable rewrite behavior across all code paths
