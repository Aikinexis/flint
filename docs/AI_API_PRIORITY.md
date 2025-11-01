# Chrome Built-in AI API Priority Order

This document explains the fallback order for Chrome's built-in AI APIs in Flint.

## Rewrite Function

**Priority Order (Specialized → Generic):**

1. **Rewriter API** (for preset tones like "more-formal", "more-casual")
   - Most specialized for text rewriting
   - Best for tone adjustments without custom instructions
   - Only used when NO custom prompt is provided

2. **Writer API** (for custom prompts)
   - Second most specialized
   - Best for custom editing instructions
   - Only used when custom prompt IS provided

3. **Prompt API** (final fallback)
   - Most generic, works for any text task
   - Used when specialized APIs fail or unavailable
   - Less optimized for rewriting tasks

4. **Mock Provider** (when all APIs unavailable)
   - Simple text transformations
   - Used for demo/testing when AI not enabled

## Summarize Function

**Priority Order:**

1. **Summarizer API** (specialized for summaries)
   - Optimized for key-points, headlines, teasers
   - Supports different modes and lengths

2. **Mock Provider** (fallback)
   - Simple sentence extraction
   - Used when Summarizer unavailable

## Generate Function

**Priority Order:**

1. **Writer API** (specialized for content generation)
   - Optimized for creating new text
   - Supports tone, format, and length options

2. **Prompt API** (fallback)
   - Generic text generation
   - Used when Writer API fails or unavailable

3. **Mock Provider** (when all APIs unavailable)
   - Template-based responses
   - Used for demo/testing

## Why This Order?

**Specialized APIs First:**
- Rewriter, Writer, and Summarizer are purpose-built for specific tasks
- They provide better quality output for their intended use cases
- They have optimized parameters (tone, format, length)

**Prompt API as Fallback:**
- Generic API that can handle any text task
- Less optimized but more flexible
- Works when specialized APIs are unavailable or fail

**Mock Provider Last:**
- Simple fallback for testing and demos
- Provides basic functionality when AI is disabled
- Shows users what features would do with real AI

## Implementation Notes

- All API calls require user activation (click/keypress)
- Availability is checked before each operation
- Download progress is tracked for model downloads
- Errors trigger automatic fallback to next priority level
- Logging shows which API was used for debugging

## Extension Context Limitations

**Important:** The Prompt API (`window.ai`) may not be available in Chrome extension contexts (side panels, popups) even when enabled in `chrome://flags`. This is a known Chrome limitation.

**Workaround:** Flint prioritizes Rewriter, Writer, and Summarizer APIs which ARE available in extension contexts and work reliably in side panels.
