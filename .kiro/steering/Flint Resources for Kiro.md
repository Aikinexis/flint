---
inclusion: always
---

# Flint Resources for Kiro

Compact reference for Chrome built-in AI APIs, extension APIs, and official documentation.

## Chrome Built-in AI APIs

### Prompt API

**Docs:** https://developer.chrome.com/docs/ai/prompt-api

**Usage pattern:**
```ts
const available = await LanguageModel.availability();
if (available !== 'unavailable' && navigator.userActivation.isActive) {
  const session = await LanguageModel.create();
  const result = await session.prompt('Your prompt here');
}
```

**Key points:**
- Always check availability before use
- Requires user activation (user gesture like click)
- Create session, then call `prompt()`

### Summarizer API

**Docs:** https://developer.chrome.com/docs/ai/summarizer-api

**Usage pattern:**
```ts
if ('Summarizer' in self) {
  const availability = await Summarizer.availability();
  if (availability !== 'unavailable' && navigator.userActivation.isActive) {
    const summarizer = await Summarizer.create({
      type: 'key-points',  // or 'tl;dr', 'teaser', 'headline'
      format: 'markdown',  // or 'plain-text'
      length: 'medium',    // or 'short', 'long'
    });
    const summary = await summarizer.summarize(text, { context: 'Optional context' });
  }
}
```

**Key points:**
- Check `'Summarizer' in self` before use
- Options: type, format, length
- Optional context parameter for better results

### Rewriter API

**Docs:** https://developer.chrome.com/docs/ai/rewriter-api

**Usage pattern:**
```ts
if ('Rewriter' in self) {
  const availability = await Rewriter.availability();
  if (availability !== 'unavailable' && navigator.userActivation.isActive) {
    const rewriter = await Rewriter.create({ 
      tone: 'more-formal',  // or 'more-casual', 'as-is'
      format: 'plain-text'  // or 'markdown'
    });
    const result = await rewriter.rewrite(text, { context: 'Optional context' });
  }
}
```

**Important notes:**
- Currently in origin trial; may require flag: `chrome://flags/#rewriter-api-for-gemini-nano`
- May need origin-trial token in manifest during trial period
- Check availability before use

## Chrome Extension APIs

### Side Panel

**Docs:** https://developer.chrome.com/docs/extensions/reference/api/sidePanel

**Manifest configuration:**
```json
{
  "manifest_version": 3,
  "side_panel": { "default_path": "panel/index.html" },
  "permissions": ["storage", "scripting", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "src/background/background.js" }
}
```

### Content Scripts

**Docs:** https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts  
**Scripting API:** https://developer.chrome.com/docs/extensions/reference/api/scripting

**Dynamic registration (preferred for Flint):**
```js
await chrome.scripting.registerContentScripts([{
  id: "flint-cs",
  js: ["src/content/contentScript.js"],
  matches: ["<all_urls>"],
  runAt: "document_idle"
}]);
```

**Key points:**
- Use dynamic registration for on-demand injection
- `runAt: "document_idle"` ensures DOM is ready
- Content scripts run in isolated world (separate from page scripts)

### Messaging

**Docs:** https://developer.chrome.com/docs/extensions/develop/concepts/messaging

**Pattern:**
```js
// Content script → Background
chrome.runtime.sendMessage({ type: "ACTION_NAME", payload: data });

// Background listener
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "ACTION_NAME") {
    // Handle message
    return true; // Keep channel open for async response
  }
});
```

### Storage

**Docs:** https://developer.chrome.com/docs/extensions/reference/api/storage

**Usage:**
```ts
// Write
await chrome.storage.local.set({ key: value });

// Read
const { key } = await chrome.storage.local.get('key');

// Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.key) {
    console.log('New value:', changes.key.newValue);
  }
});
```

## Web Speech API

**Docs:** https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

**Usage pattern:**
```js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.continuous = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const isFinal = event.results[0].isFinal;
  // Handle partial or final transcript
};

recognition.onerror = (event) => {
  console.error('Speech recognition error:', event.error);
};

recognition.start();
```

**Important notes:**
- Chrome uses server-based recognition (not fully offline)
- Include privacy notice about voice data
- Show visual indicator when mic is active
- Handle errors gracefully (no-speech, audio-capture, not-allowed)

## Content Security Policy

**Docs:** https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

**Key points for Manifest V3:**
- No inline scripts allowed
- No `eval()` or `new Function()`
- External scripts must be bundled
- Use `script-src 'self'` in manifest if needed

## Hackathon Information

**Rules:** https://googlechromeai2025.devpost.com/rules  
**Resources:** https://googlechromeai2025.devpost.com/resources  
**Overview:** https://googlechromeai2025.devpost.com/