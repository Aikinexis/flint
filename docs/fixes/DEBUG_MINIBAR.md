# Debug Mini Bar Issue

## Current Code Analysis

The code logic appears correct:

### Message Flow:
1. **Content Script** (`contentScript.ts` line 93):
   - Sends `PING_PANEL` with `source: 'content-script'` every 2 seconds
   
2. **Background Script** (`background.ts` line 270):
   - Receives message, forwards to panel with `source: 'background-relay'`
   
3. **Panel** (`panel.tsx` line 160):
   - Checks `if (message.source !== 'background-relay') return;`
   - If source IS 'background-relay', continues to switch
   - Handles `PING_PANEL` case and responds with `success: true`

### The Logic Should Work

The filter `if (message.source !== 'background-relay') return;` means:
- If source is NOT 'background-relay' → return early (ignore)
- If source IS 'background-relay' → continue to switch statement ✅

Since background sets `source: 'background-relay'`, the message should pass through.

## Debugging Steps

### 1. Check if Extension is Loaded
```bash
# Rebuild
npm run build

# Then in Chrome:
# 1. Go to chrome://extensions/
# 2. Find Flint extension
# 3. Click "Reload" button (circular arrow icon)
# 4. Open DevTools for the extension background page
```

### 2. Check Console Logs

**Background Script Console:**
```
chrome://extensions/ → Flint → "service worker" link
```
Should see:
```
[Flint Background] Content script registered successfully
```

**Panel Console:**
```
Open Flint panel → Right-click → Inspect
```
Should see when you select text on a webpage:
```
[Panel] Received message: {type: "PING_PANEL", source: "background-relay"}
```

**Webpage Console:**
```
F12 on any webpage
```
Should see:
```
[Flint] Content script initialized
[Flint] Shadow host created
[Flint Minibar] Selection rect: {...}
```

### 3. Test PING_PANEL Manually

In the **webpage console**, run:
```javascript
chrome.runtime.sendMessage(
  {type: 'PING_PANEL', source: 'content-script'}, 
  (response) => console.log('Response:', response)
);
```

Expected: `Response: {success: true, data: {message: "Panel is open"}}`

### 4. Check Panel State Detection

In the **webpage console**, run:
```javascript
// This should be defined if content script loaded
console.log('Content script loaded:', typeof coordinator !== 'undefined');
```

### 5. Force Mini Bar to Show

In the **webpage console**, run:
```javascript
// Select some text first, then run:
const selection = window.getSelection();
console.log('Selection:', selection?.toString());
console.log('Selection length:', selection?.toString().length);
```

## Common Issues

### Issue 1: Extension Not Reloaded
**Symptom:** Old code still running
**Fix:** Click "Reload" button in chrome://extensions/

### Issue 2: Content Script Not Injected
**Symptom:** No console logs in webpage
**Fix:** Refresh the webpage after reloading extension

### Issue 3: Panel Not Open
**Symptom:** Mini bar doesn't show
**Fix:** Click Flint icon to open side panel first

### Issue 4: Selection Too Short
**Symptom:** Mini bar doesn't show for short selections
**Fix:** Select at least 3 characters (SELECTION_THRESHOLD = 3)

### Issue 5: Google Docs
**Symptom:** Mini bar doesn't work on Google Docs
**Fix:** This is intentional - Google Docs uses custom editor

## What Changed?

Looking at the diff, the main changes were:
1. Added capitalization fixes to `caret.ts`
2. Added spacing logic to `caret.ts`
3. Changed imports in `panel.tsx`

**None of these should affect mini bar visibility.**

## My Hypothesis

The mini bar WAS working, and the code is still correct. Possible causes:

1. **Extension needs reload** - Most likely
2. **Webpage needs refresh** - After extension reload
3. **Panel wasn't open** - Mini bar only shows when panel is open
4. **Testing on Google Docs** - Mini bar is disabled there

## Quick Test

1. Rebuild: `npm run build`
2. Reload extension in chrome://extensions/
3. Open Flint panel (click icon)
4. Go to gmail.com or any simple webpage
5. Select some text (at least 3 characters)
6. Mini bar should appear above selection

If it still doesn't work, check the console logs in all three places (background, panel, webpage).
