# AI Prompt Leakage - Issue & Fix

## The Problem

Internal AI prompts contained instruction-heavy language like:
- "CRITICAL RULE:"
- "DO NOT"
- "ABSOLUTELY NO"
- "Your ONLY job is"
- "RULES:"

Sometimes the AI would include these instructions in its output, making it visible to users.

### Example of Leakage

**User asks**: "Write an introduction"

**AI might output**:
```
CRITICAL: Output ONLY the text. Do NOT include explanations.

Here's an introduction to the topic...
```

The user sees the internal instructions! ❌

## The Solution

### Option 1: Clean Prompts (Recommended)

I've created `src/services/aiPrompts.ts` with cleaner, more natural prompts:

**Before**:
```typescript
const prompt = `CRITICAL RULE: NEVER USE SQUARE BRACKETS [] FOR PLACEHOLDERS. 
NO [Name], [Date], [Company]...

ORIGINAL TEXT (do NOT change anything except what the instruction asks):
${text}

EDIT INSTRUCTION:
${instruction}

CRITICAL: Output ONLY the edited version...`;
```

**After**:
```typescript
const prompt = `Edit this text: ${instruction}

${text}`;
```

Much cleaner, less likely to leak!

### Option 2: Post-Processing Filter

Add a filter to remove leaked instructions from AI output:

```typescript
function cleanAIOutput(text: string): string {
  // Remove common instruction patterns
  const patterns = [
    /^(CRITICAL|RULE|INSTRUCTION|NOTE):.*?\n/gim,
    /^(Do NOT|NEVER|ABSOLUTELY).*?\n/gim,
    /^RULES:\s*\n(\d+\..*?\n)+/gim,
    /^Output ONLY.*?\n/gim,
    /^Here's (the|your).*?:\s*\n/gim,
    /^Based on.*?:\s*\n/gim,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}
```

### Option 3: System Messages (Future)

When Chrome AI supports system messages (like ChatGPT), move instructions there:

```typescript
// Future API (not yet available)
const session = await ai.createTextSession({
  systemMessage: "You are a writing assistant. Output only the requested text."
});
```

## Implementation Status

✅ **Created**: `src/services/aiPrompts.ts` with clean prompt templates  
⏳ **Pending**: Integration into `src/services/ai.ts`  
⏳ **Pending**: Post-processing filter (optional safety net)

## How to Integrate

### Step 1: Import Clean Prompts

```typescript
// src/services/ai.ts
import {
  buildRewritePrompt,
  buildGeneratePromptWithContext,
  buildGeneratePromptStandalone
} from './aiPrompts';
```

### Step 2: Replace Existing Prompts

**For Rewrite**:
```typescript
// Before
const writerPrompt = `You are a text editor. Your ONLY job...`;

// After
const writerPrompt = buildRewritePrompt(text, options.customPrompt);
```

**For Generate**:
```typescript
// Before
fullPrompt = `CRITICAL RULE: NEVER USE SQUARE BRACKETS...`;

// After
fullPrompt = buildGeneratePromptWithContext(
  prompt,
  beforeContext,
  afterContext,
  dateTimeContext,
  options.projectTitle,
  options.pinnedNotes,
  options.smartInstructions
);
```

### Step 3: Add Safety Filter (Optional)

```typescript
// After getting AI result
const result = await writer.write(writerPrompt);
const cleaned = cleanAIOutput(result);
return cleaned;
```

## Testing

### Before Fix
1. Ask AI to "Write an email"
2. Check if output contains "CRITICAL:", "DO NOT", etc.
3. If yes → leakage detected ❌

### After Fix
1. Ask AI to "Write an email"
2. Check output for instruction text
3. Should be clean ✅

## Why This Happens

AI models are trained to follow instructions, but sometimes they:
1. Echo the instructions back
2. Include meta-commentary
3. Add explanations before the actual output

Clean, natural prompts reduce this behavior significantly.

## Best Practices

### ✅ Do
- Use natural language prompts
- Keep instructions minimal
- Put user content first
- Use examples instead of rules

### ❌ Don't
- Use ALL CAPS for emphasis
- Repeat instructions multiple times
- Use threatening language ("NEVER", "ABSOLUTELY")
- Include numbered rule lists

## Example Comparison

### Bad Prompt (Instruction-Heavy)
```
CRITICAL RULE: Output ONLY the text. DO NOT include explanations.
NEVER use placeholders like [Name] or [Date].
ABSOLUTELY NO meta-commentary.

RULES:
1. Start with the text
2. Do NOT add greetings
3. Do NOT add signatures

User's text: ${text}
User's instruction: ${instruction}

Output ONLY the edited text below:
```

### Good Prompt (Natural)
```
${instruction}

${text}
```

The good prompt is:
- 95% shorter
- More natural
- Less likely to leak
- Easier to maintain

## Monitoring

Add logging to detect leakage:

```typescript
function detectLeakage(output: string): boolean {
  const leakagePatterns = [
    /CRITICAL/i,
    /DO NOT/i,
    /RULES:/i,
    /Output ONLY/i,
    /ABSOLUTELY/i,
  ];

  return leakagePatterns.some(pattern => pattern.test(output));
}

// After AI call
if (detectLeakage(result)) {
  console.warn('[AI] Potential instruction leakage detected:', result.slice(0, 100));
  // Optionally: apply cleaning filter
  result = cleanAIOutput(result);
}
```

## Summary

**Problem**: Internal AI instructions sometimes appear in user-facing output  
**Cause**: Instruction-heavy prompts with ALL CAPS and repeated rules  
**Solution**: Clean, natural prompts + optional post-processing filter  
**Status**: Clean prompts created, ready to integrate  
**Impact**: Better user experience, more professional output  

Next step: Integrate clean prompts into `src/services/ai.ts`
