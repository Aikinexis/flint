# Context Awareness Analysis - Flint Chrome Extension

## Overview
This document explains how context-aware each tool is and the logic flow for context handling.

## ✨ NEW: Enhanced Context Engine (Lightweight)

Flint now includes a **lightweight context engine** that provides better document understanding without external dependencies or network calls. This engine uses:

1. **Local Context Window** - Extracts 1500 chars around cursor (up from 1000)
2. **Semantic Relevance Scoring** - Finds related sections using keyword overlap (Jaccard similarity)
3. **Deduplication** - Removes near-duplicate sections to avoid redundancy
4. **Compression** - Extracts key sentences from long sections to fit token limits
5. **Document Structure Awareness** - Detects headings and sections for better context

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Extract Local Context (1500 chars around cursor)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Split Document into Sections (paragraphs, code blocks)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Score Sections by Keyword Overlap with Local Context     │
│    (Uses Jaccard similarity - fast & deterministic)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Select Top 3 Most Relevant Sections                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Remove Duplicates (first 60 chars fingerprint)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Compress Sections (extract key sentences, max 250 chars) │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Format for AI Prompt with Local + Related Sections       │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

✅ **No external dependencies** - Pure JavaScript, runs entirely in browser
✅ **Fast** - Processes documents in milliseconds
✅ **Deterministic** - Same input always produces same output
✅ **Privacy-preserving** - No data leaves your device
✅ **Token-efficient** - Compresses context to fit within AI limits
✅ **Better coherence** - AI sees relevant sections from entire document

---

## 🎯 Generate Tool - **HIGHLY CONTEXT-AWARE** (Enhanced!)

### Context Sources:
1. **Local context** (1500 chars around cursor) - INCREASED from 1000
2. **Related sections** (3 most relevant sections from entire document) - NEW!
3. **Nearest heading** (current section title) - NEW!
4. **Pinned notes** (audience/tone guidance)
5. **User prompt** (custom instructions)

### Logic Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS GENERATE                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Get cursor position from editor                              │
│ capturedSelection.start = cursor position                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Check if context awareness is enabled in settings           │
│ (default: TRUE)                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────┴───────────┐
         │                       │
    YES  │                       │  NO
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Extract Context  │    │ Skip context     │
│                  │    │ extraction       │
│ Before cursor:   │    └────────┬─────────┘
│ - Last 1000 chars│             │
│                  │             │
│ After cursor:    │             │
│ - Next 1000 chars│             │
└────────┬─────────┘             │
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Build AI Prompt with Context                                 │
│                                                              │
│ "You are a writing assistant..."                            │
│                                                              │
│ CONTEXT BEFORE CURSOR:                                      │
│ [last 500 chars of text before]                             │
│                                                              │
│ CONTEXT AFTER CURSOR:                                       │
│ [first 500 chars of text after]                             │
│                                                              │
│ USER'S INSTRUCTION: [user prompt]                           │
│                                                              │
│ CRITICAL RULES:                                             │
│ - Generate ONLY new text at cursor                          │
│ - Do NOT repeat context                                     │
│ - Match writing style                                       │
│ - Flow naturally with before/after                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Add Pinned Notes (if any)                                    │
│ "Audience and tone guidance: [notes]"                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Send to Chrome Writer API                                    │
│ - Uses sharedContext for pinned notes                       │
│ - Uses fullPrompt with before/after context                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Insert generated text at cursor position                     │
│ - Adds smart spacing                                         │
│ - Preserves surrounding text                                │
└─────────────────────────────────────────────────────────────┘
```

### Context Limits (Enhanced):
- **Local context**: 1500 chars around cursor (750 before + 750 after)
- **Related sections**: Up to 3 sections × 250 chars = 750 chars
- **Total context**: ~2250 chars of relevant text from entire document
- **Document structure**: Detects and includes nearest heading

### Improvements:
✅ **Sees 2250 chars total** - 125% more context than before
✅ **Document-level understanding** - Includes relevant sections from anywhere in document
✅ **Smart selection** - Uses keyword overlap to find most relevant sections
✅ **Deduplication** - Avoids repeating similar content
✅ **Heading awareness** - Knows which section you're writing in

---

## ✏️ Rewrite Tool - **NOW CONTEXT-AWARE!** (Enhanced!)

### Context Sources:
1. **Selected text** (the text you highlight)
2. **Surrounding context** (500 chars before + 500 chars after) - NEW!
3. **Pinned notes** (audience/tone guidance)
4. **Rewrite preset/prompt** (tone instructions)

### Logic Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ USER SELECTS TEXT AND CLICKS REWRITE                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Get selected text from editor                                │
│ textToRewrite = content[start:end]                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Build AI Prompt                                              │
│                                                              │
│ "Rewrite the following text: [preset/custom prompt]"        │
│                                                              │
│ TEXT TO REWRITE:                                            │
│ [selected text]                                             │
│                                                              │
│ RULES:                                                      │
│ - Output ONLY the rewritten text                           │
│ - Match the requested tone                                  │
│ - Keep similar length                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Add Pinned Notes (if any)                                    │
│ "Audience and tone guidance: [notes]"                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Send to Chrome Rewriter API                                  │
│ - Uses sharedContext for pinned notes                       │
│ - Uses customPrompt for tone/style                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Replace selected text with rewritten version                 │
│ - Preserves surrounding text                                │
│ - Highlights the replacement                                │
└─────────────────────────────────────────────────────────────┘
```

### Context Limits (Enhanced):
- **Surrounding context**: 500 chars before + 500 chars after selection
- **Total context**: Selected text + 1000 chars of surrounding text
- **Style matching**: AI can now see and match surrounding writing style

### Improvements:
✅ **Context-aware rewriting** - Sees what comes before and after
✅ **Better flow** - Rewritten text flows naturally with surrounding paragraphs
✅ **Style matching** - Matches the style of the rest of your document
✅ **Consistency** - Maintains tone and terminology from context

---

## 📝 Summarize Tool - **NOT CONTEXT-AWARE**

### Context Sources:
1. **Selected text ONLY** (the text you highlight)
2. **Pinned notes** (audience/tone guidance)
3. **Summary mode** (bullets/paragraph/brief)
4. **Reading level** (simple/moderate/detailed/complex)

### Logic Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ USER SELECTS TEXT AND CLICKS SUMMARIZE                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Get selected text from editor                                │
│ textToSummarize = content[start:end]                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Build AI Prompt with Summary Instructions                    │
│                                                              │
│ Mode: bullets → "key-points"                                │
│ Mode: paragraph → "teaser"                                  │
│ Mode: brief → "headline"                                    │
│                                                              │
│ Length guidance:                                            │
│ - Short: ~25 words                                          │
│ - Medium: ~50 words                                         │
│ - Long: ~200 words                                          │
│                                                              │
│ Bullet guidance (if bullets mode):                          │
│ "Each bullet must be 3-5 words maximum"                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Add Pinned Notes (if any)                                    │
│ "Audience and tone guidance: [notes]"                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Send to Chrome Summarizer API                                │
│ - Uses sharedContext for pinned notes + guidance            │
│ - Uses type (key-points/teaser/headline)                    │
│ - Uses length (short/medium/long)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Replace selected text with summary                           │
│ - Converts markdown bullets to • bullets                    │
│ - Highlights the replacement                                │
└─────────────────────────────────────────────────────────────┘
```

### Context Limits:
- **ZERO surrounding context** - Only sees the selected text
- **No document awareness** - Doesn't know this is part of a larger document
- **Isolated summarization** - Summarizes text as if it's standalone

### Why it might feel limited:
❌ **No broader context** - Can't reference earlier parts of the document
❌ **May miss connections** - Doesn't understand how this section relates to others
❌ **Standalone summaries** - Treats each selection as independent

---

## 🔍 Comparison Table (Updated!)

| Feature | Generate (Enhanced) | Rewrite (Enhanced) | Summarize |
|---------|---------------------|-------------------|-----------|
| **Sees surrounding text** | ✅ Yes (1500 chars) | ✅ Yes (1000 chars) | ❌ No |
| **Sees before cursor** | ✅ Yes (750 chars) | ✅ Yes (500 chars) | ❌ No |
| **Sees after cursor** | ✅ Yes (750 chars) | ✅ Yes (500 chars) | ❌ No |
| **Related sections** | ✅ Yes (3 sections) | ❌ No | ❌ No |
| **Nearest heading** | ✅ Yes | ❌ No | ❌ No |
| **Uses pinned notes** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Document-level awareness** | ✅ Yes (NEW!) | ⚠️ Partial | ❌ No |
| **Style matching** | ✅ Yes | ✅ Yes (NEW!) | ❌ No |
| **Total context** | 2250 chars | 1000 chars | 0 chars |

---

## ✅ Implemented Improvements

### ✨ Enhanced Context Engine (DONE!)
The lightweight context engine is now implemented and provides:

1. **Smart Section Selection** - Uses keyword overlap to find relevant sections
2. **Deduplication** - Removes near-duplicate content automatically
3. **Compression** - Extracts key sentences to fit token limits
4. **Document Structure** - Detects headings and sections
5. **Increased Context Window** - 1500 chars around cursor (up from 1000)

### 🎯 Generate Tool Enhancements (DONE!)
- ✅ Uses `AIService.generateWithEnhancedContext()`
- ✅ Includes 3 most relevant sections from entire document
- ✅ Detects and includes nearest heading
- ✅ Total context: 2250 chars (up from 1000)

### ✏️ Rewrite Tool Enhancements (DONE!)
- ✅ Uses `AIService.rewriteWithContext()`
- ✅ Includes 500 chars before and after selection
- ✅ Matches writing style from surrounding text
- ✅ Total context: 1000 chars (up from 0)

## 💡 Future Improvements (Optional)

### Option 1: Add Context to Summarize
Pass document context to summarize:
```typescript
const documentContext = `This is part of a larger document about [topic]. Summarize this section: ${textToSummarize}`;
```

### Option 2: Increase Related Sections
Adjust context engine to include more sections:
```typescript
maxRelatedSections: 5, // Up from 3
```

### Option 3: Adaptive Context Window
Adjust context window based on document size:
```typescript
const contextWindow = Math.min(3000, Math.floor(fullDocument.length * 0.1));
```

---

## 🎯 Current Limitations

1. **Fixed character limits** - 1000 chars is ~150 words, not enough for long documents
2. **No semantic understanding** - Doesn't understand document structure
3. **No cross-section awareness** - Can't reference earlier sections
4. **API token limits** - Chrome AI APIs have input size limits
5. **Rewrite/Summarize are isolated** - No surrounding context at all

---

## 📊 Visual Context Window (Before vs After)

### BEFORE (Old System)
```
Your 5000-word document:
├─ Introduction (500 words)
├─ Section 1 (1000 words)
├─ Section 2 (1500 words)
│  ├─ Subsection A (500 words)
│  ├─ [CURSOR HERE] ← Generate sees only this area
│  │   └─ 500 chars before ←─┐
│  │   └─ 500 chars after  ←─┤ Total: 1000 chars (~150 words)
│  └─ Subsection B (500 words)
├─ Section 3 (1000 words)
└─ Conclusion (500 words)

❌ Generate CANNOT see:
- Introduction
- Section 1
- Most of Section 2
- Section 3
- Conclusion

✅ Generate CAN see:
- ~75 words before cursor
- ~75 words after cursor
```

### AFTER (Enhanced Context Engine)
```
Your 5000-word document:
├─ Introduction (500 words) ←────────┐
├─ Section 1 (1000 words)            │ Related Section 1
├─ Section 2 (1500 words) ←──────────┤ (if relevant)
│  ├─ Subsection A (500 words) ←─────┤ Related Section 2
│  ├─ [CURSOR HERE] ← Generate sees: │
│  │   └─ 750 chars before ←─────────┤ Local Context
│  │   └─ 750 chars after  ←─────────┤ (1500 chars)
│  │   └─ Nearest heading: "Section 2"
│  └─ Subsection B (500 words)       │
├─ Section 3 (1000 words) ←──────────┤ Related Section 3
└─ Conclusion (500 words)            │ (if relevant)
                                     └─ Total: ~2250 chars

✅ Generate CAN NOW see:
- ~110 words before cursor (local)
- ~110 words after cursor (local)
- ~110 words from 3 most relevant sections (anywhere in doc)
- Current section heading
- Total: ~330 words of context (2.2x improvement!)

🎯 Smart Selection:
- Automatically finds sections with similar keywords
- Removes duplicate content
- Compresses long sections to key sentences
```

The enhanced context engine gives the AI much better understanding of your document's structure and content!
