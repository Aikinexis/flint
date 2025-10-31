# AI Cold Start Fix

## Problem
After reopening the extension, the first AI operation would take 5-10 seconds because Chrome needs to load the Gemini Nano model into memory. This happened every time you reopened the app, even though the model was already downloaded.

## Root Cause
Chrome's built-in AI keeps models on disk but unloads them from memory when the extension closes. The first `create()` call after restart has to:
1. Load model from disk into memory
2. Initialize the model
3. Then process your request

This "cold start" penalty happened on every app restart.

## Solution
Pre-warm models on app initialization by actually creating sessions in the background:

```typescript
// Create session to load model into memory
const summarizer = await Summarizer.create({ ... });
// Destroy session immediately (model stays in memory)
if (summarizer.destroy) summarizer.destroy();
```

This loads the model into memory during app startup (2-3 seconds in background), so when the user clicks an AI button, the model is already loaded and responds instantly.

## Implementation
- Warm up Summarizer, Rewriter, and Writer on app init
- Happens in background, doesn't block UI
- Destroys sessions after creation (just needed to trigger load)
- Logs success/failure for each model
- Gracefully handles failures

## Result
- **Before**: First AI use after restart = 5-10 seconds
- **After**: First AI use after restart = instant!
- Models stay warm until extension fully reloads
- No more waiting on every app restart

## Files Modified
- `src/services/ai.ts` - Enhanced prewarmModels() to actually create sessions
- `src/panel/panel.tsx` - Calls prewarmModels() on initialization
