# AI Model Warm-Up Optimization

## Problem
Chrome's built-in AI has two performance issues:
1. **First download**: Needs to download Gemini Nano model (1-2 minutes, one-time)
2. **Cold start**: After reopening the app, the first AI operation is slow (~5-10 seconds) because the model needs to be loaded into memory

This caused:
- Long wait times with no feedback
- Users thinking the app was frozen
- Poor experience after every app restart

## Solution

### 1. Model Warm-Up on Startup
Added `prewarmModels()` function that:
- **Actually creates AI sessions** on app initialization (not just checks availability)
- Loads models into memory in the background
- Destroys sessions immediately after creation (just needed to trigger load)
- Eliminates the slow "cold start" on first use
- Provides console feedback about warm-up status

### 2. Download Progress Monitoring
Added progress tracking using Chrome's `monitor` callback:
- Tracks download progress (0-100%)
- Updates UI in real-time
- Works for Summarizer, Rewriter, and Writer APIs

### 3. Visual Progress Indicator
Added a floating progress bar that shows:
- Download icon and status message
- Progress bar with percentage
- Estimated time (1-2 minutes)
- Auto-hides when complete

### 4. Better User Communication
- Console logs explain what's happening
- Progress indicator sets expectations
- First-use message explains the delay

## Implementation Details

### AIService Updates
```typescript
// New methods
static setDownloadProgressCallback(callback: DownloadProgressCallback | null)
static async prewarmModels(): Promise<AIAvailability>

// Monitor callback added to all API create() calls
monitor(m: any) {
  m.addEventListener('downloadprogress', (e: any) => {
    const progress = e.loaded || 0;
    console.log(`[AI] Download progress: ${Math.round(progress * 100)}%`);
    if (AIService.downloadProgressCallback) {
      AIService.downloadProgressCallback(progress);
    }
  });
}
```

### Panel Integration
- Pre-warms models on initialization
- Shows progress indicator during download
- Positions indicator to not overlap with save status

## User Experience

**Before:**
- Open app → Click AI button → 5-10 second wait → no feedback → confusion
- Every time you reopen the app, first use is slow

**After:**
- Open app → Models warm up in background (2-3 seconds)
- Click AI button → Instant response!
- Console shows: "✓ Pre-warming complete! Warmed up: Summarizer, Rewriter, Writer"
- All subsequent uses are instant
- No more cold starts!

## Technical Notes

1. **Download vs Load** - Two separate steps:
   - Download: One-time, happens when model not cached (1-2 min)
   - Load: Every app restart, loads model into memory (2-3 sec)
   
2. **Warm-up strategy** - Creates and immediately destroys sessions:
   - `Summarizer.create()` → loads model into memory → `destroy()`
   - Session is destroyed but model stays in memory
   - Next real use is instant
   
3. **Background execution** - Happens during app initialization:
   - Doesn't block UI
   - User can start typing immediately
   - Models ready by the time they click AI buttons
   
4. **Memory management** - Chrome keeps models in memory:
   - Stays loaded until extension unloads
   - Survives tab switches and panel closes
   - Only needs re-warming after full extension reload
   
5. **Graceful degradation** - If warm-up fails:
   - Logs warning but doesn't crash
   - First real use will still work (just slower)
   - Subsequent uses are still fast

## Files Modified
- `src/services/ai.ts` - Added pre-warming and progress monitoring
- `src/panel/panel.tsx` - Added progress UI and initialization

## Future Improvements
- Could add a "Download AI Models" button in settings for manual pre-download
- Could show estimated download size (varies by model)
- Could cache availability status longer to reduce checks
