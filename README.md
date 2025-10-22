# Flint Chrome Extension

Voice-to-text, summarization, and rewriting with local AI for Chrome.

## Overview

Flint is a Chrome extension that brings voice capture, instant summarization, and targeted rewriting directly into web pages using Chrome's built-in AI APIs. All text processing happens locally on your device.

## Features

- **Voice to Text**: Capture thoughts with speech recognition
- **Summarize**: Get bullet points, paragraphs, or outlines from selected text
- **Rewrite**: Transform text with presets (formal, casual, concise, etc.) or custom prompts
- **Local-First**: All AI processing happens on your device (except speech recognition)
- **Privacy-Focused**: No external servers, no accounts, no tracking

## Requirements

- Chrome 128 or later
- Gemini Nano enabled (for AI features)
- Microphone access (for voice features)

## Installation

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load as unpacked extension:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from your project directory
   - Flint icon appears in the extensions toolbar

4. Open side panel:
   - Click the Flint icon in toolbar
   - Side panel opens on the right side

### Development with Watch Mode

```bash
npm run dev
```

This will rebuild automatically when you make changes.

## Development Scripts

- `npm run dev` - Build with watch mode
- `npm run build` - Production build
- `npm run type-check` - Check TypeScript types
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
flint/
├── src/
│   ├── background/       # Service worker
│   ├── content/          # Content scripts
│   ├── panel/            # Side panel UI
│   ├── components/       # React components
│   ├── services/         # AI, speech, storage services
│   ├── state/            # State management
│   ├── utils/            # Utility functions
│   └── styles/           # CSS and design tokens
├── public/
│   └── icons/            # Extension icons
├── manifest.json         # Extension manifest
└── vite.config.ts        # Build configuration
```

## Tech Stack

- React 18
- TypeScript (strict mode)
- Vite
- Chrome Extension Manifest V3
- Chrome Built-in AI APIs (Prompt, Summarizer, Rewriter)
- Web Speech API

## Built-in AI APIs

Flint uses Chrome's local AI APIs with capability checks before each operation:

**Prompt API**: General-purpose text generation
```typescript
const available = await LanguageModel.availability();
if (available !== 'unavailable' && navigator.userActivation.isActive) {
  const session = await LanguageModel.create();
  const result = await session.prompt('Your prompt here');
}
```

**Summarizer API**: Text summarization with modes (bullets, paragraph, outline)
```typescript
if ('Summarizer' in self) {
  const availability = await Summarizer.availability();
  if (availability !== 'unavailable' && navigator.userActivation.isActive) {
    const summarizer = await Summarizer.create({
      type: 'key-points',
      format: 'markdown',
      length: 'medium'
    });
    const summary = await summarizer.summarize(text);
  }
}
```

**Rewriter API**: Text transformation with tone control
```typescript
if ('Rewriter' in self) {
  const availability = await Rewriter.availability();
  if (availability !== 'unavailable' && navigator.userActivation.isActive) {
    const rewriter = await Rewriter.create({ 
      tone: 'more-formal',
      format: 'plain-text'
    });
    const result = await rewriter.rewrite(text);
  }
}
```

All APIs require user activation (button click) and include fallback to mock providers when unavailable.

## Permissions

Flint requires the following permissions (defined in `manifest.json`):

**permissions:**
- `storage` - Save user settings, pinned notes, and session history locally
- `scripting` - Inject content scripts into web pages to detect text selections
- `activeTab` - Access the current tab to insert and replace text

**host_permissions:**
- `<all_urls>` - Required for content script injection on any website

All permissions are used solely for core functionality. No data is sent to external servers.

## Troubleshooting

### AI Features Not Working

If you see "AI features require Chrome 128 or later with Gemini Nano enabled":

1. Update Chrome to version 128 or later
2. Enable Gemini Nano:
   - Go to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"
   - Go to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"
   - Restart Chrome
3. Wait for the model to download (may take a few minutes)

### Microphone Not Working

If voice capture doesn't work:

1. Check that Chrome has microphone permission
2. Go to `chrome://settings/content/microphone`
3. Ensure the site or extension has access
4. Check your system microphone settings

## License

MIT
