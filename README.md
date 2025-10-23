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

4. Open panel:
   - Click the Flint icon in toolbar
   - Panel opens as popup

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

Flint uses Chrome's local AI APIs with capability checks:

**Prompt API**: Text generation
```typescript
const available = await ai.languageModel.availability();
if (available !== 'no') {
  const session = await ai.languageModel.create();
  const result = await session.prompt('Your prompt');
}
```

**Summarizer API**: Text summarization
```typescript
const available = await ai.summarizer.availability();
if (available !== 'no') {
  const summarizer = await ai.summarizer.create();
  const summary = await summarizer.summarize(text);
}
```

**Rewriter API**: Text transformation
```typescript
const available = await ai.rewriter.availability();
if (available !== 'no') {
  const rewriter = await ai.rewriter.create();
  const result = await rewriter.rewrite(text);
}
```

All APIs check availability before use and fall back to mock providers when unavailable.

## Permissions

**permissions:**
- `storage` - Save settings and history locally
- `scripting` - Inject content scripts for text selection
- `activeTab` - Access current tab for text insertion

**host_permissions:**
- `<all_urls>` - Content script injection on any site

No data sent to external servers.

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
