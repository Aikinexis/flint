# Flint Chrome Extension

Voice-to-text, summarization, and rewriting with local AI for Chrome.

## Overview

Flint is a Chrome extension that provides a unified writing environment with AI-powered text generation, rewriting, and summarization. Built on Chrome's local AI APIs, all text processing happens on your device for complete privacy.

## Features

### Unified Editor Workflow
- **Single Persistent Editor**: Work in one document across all AI tools
- **Inline AI Operations**: Generate, rewrite, and summarize text directly in your editor
- **Project Management**: Organize multiple writing projects (emails, blog posts, notes)
- **Version History**: Track changes with automatic snapshots after each AI operation
- **Context-Aware Generation**: AI understands surrounding text for natural continuity

### AI Capabilities
- **Generate**: Create text from prompts with context awareness
- **Rewrite**: Transform text with presets (formal, casual, concise, expand) or custom instructions
- **Summarize**: Extract key points, create paragraphs, or generate outlines
- **Proofread**: Fix spelling and grammar errors

### Performance
- **Local-First**: All AI processing happens on your device using Chrome's built-in Gemini Nano
- **No External Servers**: No accounts, no tracking, no data leaves your browser
- **Fast & Responsive**: Instant AI operations with no network latency

## Key Features

### Unified Editor  
Work in a single persistent editor across all AI tools. No more switching between panels or losing your place.  

### Inline Operations  
AI results appear directly in your editor with no compare views or extra steps. Select text, apply AI, and you’re done.  

### Project Management  
Organize multiple writing projects. Each project maintains its own content and version history.  

### Version Snapshots  
Every AI operation creates an automatic snapshot. Review changes, restore previous versions, or track your writing progress.  

### Context-Aware AI  
Generate text that flows naturally with what you’ve already written. The AI understands surrounding context for better continuity.  

### Pinned Notes  
Add audience descriptions or style guidelines that influence all AI operations. Ideal for maintaining a consistent tone.  

## 📚 Documentation

- **[Quick Start Guide](docs/context-engine/QUICK_START_CONTEXT_ENGINE.md)** - Get started with Flint's AI features
- **[Context Engine](docs/context-engine/README.md)** - Enhanced context awareness (NEW!)
- **[Full Documentation](docs/README.md)** - Complete documentation index
- **[Changelog](CHANGELOG.md)** - Recent changes and improvements

### What's New: Enhanced Context Engine

Flint now includes a lightweight context engine that dramatically improves AI understanding:

- ✅ **125% more context** - Sees 2250 chars vs 1000 chars before
- ✅ **Smart section selection** - Includes 3 most relevant sections from entire document
- ✅ **Better instruction following** - Custom prompts now work correctly
- ✅ **No repetition** - AI adds new information instead of repeating
- ✅ **100% local** - Fast (< 20ms), private, no external dependencies

[Learn more →](docs/context-engine/README.md)

## Requirements

- Chrome 128 or later
- Gemini Nano enabled (chrome://components → Optimization Guide On-Device Model)
- https://developer.chrome.com/docs/ai/get-started
- Operating system: Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on Chromebook Plus devices. Chrome for Android, iOS, and ChromeOS on non-Chromebook Plus devices are not yet supported by the APIs which use Gemini Nano.
- Storage: At least 22 GB of free space on the volume that contains your Chrome profile.
- GPU or CPU: Built-in models can run with GPU or CPU.
- GPU: Strictly more than 4 GB of VRAM.
- CPU: 16 GB of RAM or more and 4 CPU cores or more.
- Network: Unlimited data or an unmetered connection


### Install
Download the `dist.zip` file from the release page and load it via chrome://extensions/

or

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
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist/` folder
   - Extension appears in toolbar

4. Open side panel:
   - Click Flint icon in Chrome toolbar
   - Side panel opens on right side
   - Start writing in the unified editor

## How to Use

### Basic Workflow

1. **Start Writing**: Type or paste text into the editor
2. **Select a Tool**: Choose Generate, Rewrite, or Summarize from the sidebar
3. **Configure Options**: Set tone, length, or provide custom instructions
4. **Execute**: Click the action button - results appear inline in your editor
5. **Iterate**: Make multiple changes - each creates a version snapshot

### Generate Text
- Position cursor where you want new text
- Enter a prompt or leave empty for continuation
- AI generates text that flows naturally with surrounding content
- Generated text appears at cursor position

### Rewrite Text
- Select text you want to transform
- Choose a preset (formal, casual, concise, expand) or write custom instructions
- AI rewrites selected text in place
- Original text is preserved in version history

### Summarize Text
- Select text to summarize
- Choose format: bullets, paragraph, or brief
- Summary replaces selected text
- Adjust reading level for your audience

### Project Management
- Click "Projects" button to view all projects
- Create new projects for different writing tasks
- Switch between projects - content auto-saves
- Each project has its own version history

### Version History
- Click history toggle (‹/›) to open snapshot panel
- View all changes made to current project
- Click any snapshot to restore that version
- Snapshots show action type and timestamp

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
│   ├── content/          # Content scripts (for web page integration)
│   ├── panel/            # Side panel UI entry point
│   ├── components/       # React components
│   │   ├── UnifiedEditor.tsx      # Main editor component
│   │   ├── ToolControlsContainer.tsx  # AI tool controls
│   │   ├── ProjectManager.tsx     # Project management
│   │   ├── VersionCarousel.tsx    # Version history panel
│   │   └── ...                    # Other UI components
│   ├── services/         # Core services
│   │   ├── ai.ts         # Chrome AI APIs (Summarizer, Rewriter, Writer)
│   │   ├── speech.ts     # Voice recognition
│   │   ├── storage.ts    # IndexedDB for projects & snapshots
│   │   └── messaging.ts  # Extension messaging
│   ├── state/            # State management (React Context)
│   ├── utils/            # Utility functions
│   └── styles/           # CSS and design tokens
├── docs/
│   ├── testing/          # Testing guides and checklists
│   ├── implementation/   # Feature implementation notes
│   ├── audits/           # Quality and accessibility audits
│   └── mockups/          # UI prototypes and demos
├── tests/
│   └── manual-tests/     # Manual test HTML files
├── public/
│   └── icons/            # Extension icons
├── manifest.json         # Extension manifest
└── vite.config.ts        # Build configuration
```

## Documentation

- **[Testing Guide](docs/testing/)** - Testing procedures and checklists
- **[Implementation Notes](docs/implementation/)** - Feature development documentation
- **[Audits](docs/audits/)** - Quality assurance and accessibility reports
- **[Mockups](docs/mockups/)** - UI prototypes and design demos
- **[Manual Tests](tests/manual-tests/)** - HTML test files for manual testing

## Tech Stack

- **Frontend**: React 18 with TypeScript (strict mode)
- **Build Tool**: Vite for fast development and optimized production builds
- **Extension**: Chrome Manifest V3 with side panel API
- **AI**: Chrome Built-in AI APIs (Summarizer, Rewriter, Writer, Prompt)
- **Storage**: IndexedDB for projects and version snapshots
- **State**: React Context for global state management
- **Styling**: CSS with design tokens for consistent theming

## Architecture

### Unified Editor Workflow

Flint uses a single persistent editor that works across all AI tools:

1. **Editor Component**: Shared textarea with selection tracking and cursor indicators
2. **Tool Controls**: Context-specific options (Generate, Rewrite, Summarize) below editor
3. **Inline Operations**: AI results replace text directly in the editor
4. **Automatic Snapshots**: Each AI operation creates a version snapshot
5. **Version History**: Collapsible panel shows all snapshots for current project

### Chrome Built-in AI APIs

Flint leverages Chrome's local AI with intelligent fallbacks:

**Writer API**: Context-aware text generation
```typescript
const writer = await Writer.create({
  tone: 'neutral',
  format: 'plain-text',
  length: 'medium',
  sharedContext: pinnedNotes.join('\n')
});
const result = await writer.write(prompt);
```

**Rewriter API**: Text transformation with tone control
```typescript
const rewriter = await Rewriter.create({
  tone: 'more-formal',
  format: 'plain-text',
  length: 'as-is'
});
const result = await rewriter.rewrite(selectedText);
```

**Summarizer API**: Text summarization with options
```typescript
const summarizer = await Summarizer.create({
  type: 'key-points',
  format: 'markdown',
  length: 'medium'
});
const summary = await summarizer.summarize(selectedText);
```

**Prompt API**: Fallback for custom instructions
```typescript
const session = await ai.languageModel.create();
const result = await session.prompt(customPrompt);
```

All APIs include:
- Availability checks before use
- User activation requirements (click/keypress)
- Graceful fallbacks to mock providers
- Timeout protection (30 seconds)

## Permissions

**Required permissions:**
- `storage` - Persist settings, projects, and version snapshots locally
- `sidePanel` - Display side panel UI for the unified editor
- `scripting` - Inject content scripts for web page text manipulation (future feature)
- `activeTab` - Access current tab for text operations (future feature)

**Optional permissions:**
- `audioCapture` - Microphone access for voice recording (not yet implemented)

**Storage:**
- IndexedDB for projects and version snapshots (unlimited storage)
- chrome.storage.local for settings and preferences (limited to 10 MB)
- All data stored locally - nothing sent to external servers

**Privacy:**
- No external network calls for AI operations (all local)
- No user tracking or analytics
- No accounts or authentication required
- Web Speech API may use server-based recognition (optional feature)

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
