# Flint Chrome Extension — Design Document

## Overview

Flint is a Chrome Manifest V3 extension that brings voice-to-text, summarization, and rewriting capabilities directly into web pages using Chrome's built-in AI APIs. The system architecture consists of three main components: a background service worker for coordination, content scripts for text manipulation, and a React-based side panel for the user interface. All text processing happens locally except for speech recognition, which uses the Web Speech API.

The design prioritizes local-first operation, minimal bundle size (under 1 MB), and graceful degradation when AI features are unavailable. The extension follows strict TypeScript and security practices required by Manifest V3.

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Chrome Browser                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Side Panel  │◄────────┤  Background  │                  │
│  │   (React)    │         │    Worker    │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         │                        │                           │
│         │                        ▼                           │
│         │              ┌──────────────────┐                  │
│         └─────────────►│ Content Script   │                  │
│                        │  (Injected)      │                  │
│                        └──────────────────┘                  │
│                                 │                            │
│                                 ▼                            │
│                        ┌──────────────────┐                  │
│                        │   Web Page DOM   │                  │
│                        └──────────────────┘                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Chrome Built-in AI APIs    │    Web Speech API             │
│  • Prompt API               │    • SpeechRecognition        │
│  • Summarizer API           │                               │
│  • Rewriter API             │                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Background Service Worker** (`src/background/background.ts`)
- Manages extension lifecycle and installation
- Registers content scripts dynamically
- Routes messages between side panel and content scripts
- Handles permission requests
- Coordinates AI API availability checks

**Content Script** (`src/content/contentScript.ts`)
- Detects text selections on web pages
- Injects and positions the Mini Bar near selections
- Captures caret position in editable fields
- Inserts or replaces text in textarea and contenteditable elements
- Communicates with side panel via background worker

**Side Panel** (`src/panel/panel.tsx`)
- Provides main user interface with tabs (Voice, Rewrite, Summary, History, Settings)
- Manages application state using a centralized store
- Triggers AI operations through service layer
- Displays results and comparison views
- Persists user preferences and history

### Message Flow Architecture

All communication between components uses Chrome's message passing API:

```
Side Panel ──message──> Background Worker ──forward──> Content Script
                              │
                              ▼
                        AI Services Layer
                        Storage Services
```

Message types:
- `GET_SELECTION`: Request selected text from content script
- `INSERT_TEXT`: Insert text at caret position
- `REPLACE_TEXT`: Replace selected text with new content
- `SHOW_MINI_BAR`: Display mini bar near selection
- `HIDE_MINI_BAR`: Remove mini bar from page
- `CHECK_AI_AVAILABILITY`: Query AI API status

## Components and Interfaces

### Services Layer

#### AI Service (`src/services/ai.ts`)

Provides unified interface to Chrome's built-in AI APIs with capability detection and fallback handling.

**Interface:**
```typescript
interface AIService {
  // Check if AI features are available
  checkAvailability(): Promise<AIAvailability>;
  
  // Generate text using Prompt API
  prompt(text: string, options: PromptOptions): Promise<string>;
  
  // Summarize text using Summarizer API
  summarize(text: string, options: SummaryOptions): Promise<string>;
  
  // Rewrite text using Rewriter API
  rewrite(text: string, options: RewriteOptions): Promise<string>;
}

interface AIAvailability {
  promptAPI: 'available' | 'unavailable' | 'after-download';
  summarizerAPI: 'available' | 'unavailable' | 'after-download';
  rewriterAPI: 'available' | 'unavailable' | 'after-download';
}

interface SummaryOptions {
  mode: 'bullets' | 'paragraph' | 'outline';
  readingLevel: 'elementary' | 'middle-school' | 'high-school' | 'college';
  pinnedNotes?: string[];
}

interface RewriteOptions {
  preset?: 'clarify' | 'simplify' | 'concise' | 'expand' | 'friendly' | 'formal' | 'poetic' | 'persuasive';
  customPrompt?: string;
  tone?: 'more-formal' | 'more-casual' | 'as-is';
  pinnedNotes?: string[];
}
```

**Implementation Strategy:**
1. Check API availability before each operation
2. Verify user activation is present (required by Chrome AI APIs)
3. Create session with appropriate options
4. Execute operation with timeout (5 seconds for <1000 words)
5. Fall back to Prompt API if Rewriter/Summarizer unavailable
6. Fall back to Mock Provider if all APIs unavailable
7. Handle errors with user-friendly messages

**Mock Provider:**
When AI APIs are unavailable, provide example outputs that demonstrate functionality:
- Summarize: Return bullet points extracted from first sentences
- Rewrite: Return text with simple transformations (uppercase for formal, etc.)
- Display clear notice: "AI features require Chrome 128+ with Gemini Nano"

#### Speech Service (`src/services/speech.ts`)

Wraps Web Speech API with event-driven interface for voice recognition.

**Interface:**
```typescript
interface SpeechService {
  // Start speech recognition
  start(options: SpeechOptions): void;
  
  // Stop speech recognition
  stop(): void;
  
  // Check if speech recognition is supported
  isSupported(): boolean;
  
  // Event callbacks
  onPartialResult(callback: (text: string) => void): void;
  onFinalResult(callback: (text: string, confidence: number) => void): void;
  onError(callback: (error: SpeechError) => void): void;
}

interface SpeechOptions {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

type SpeechError = 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'unknown';
```

**Implementation Strategy:**
1. Check for SpeechRecognition API support
2. Request microphone permission before starting
3. Configure recognition with user's language preference
4. Stream partial results to UI as they arrive
5. Emit final result with confidence score
6. Handle errors with specific messages for each error type
7. Provide mock implementation for testing

#### Storage Service (`src/services/storage.ts`)

Manages persistent data using chrome.storage.local and IndexedDB.

**Interface:**
```typescript
interface StorageService {
  // Settings (chrome.storage.local)
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  
  // Pinned Notes (IndexedDB)
  getPinnedNotes(): Promise<PinnedNote[]>;
  savePinnedNote(note: PinnedNote): Promise<void>;
  deletePinnedNote(id: string): Promise<void>;
  
  // History (IndexedDB)
  getHistory(limit?: number): Promise<HistoryItem[]>;
  saveHistoryItem(item: HistoryItem): Promise<void>;
  searchHistory(query: string): Promise<HistoryItem[]>;
  clearHistory(): Promise<void>;
  cleanupOldHistory(): Promise<void>;
}
```

**Storage Strategy:**
- **chrome.storage.local**: Settings (10 KB limit) - fast access, sync with storage listeners
- **IndexedDB**: Pinned notes and history (50 MB total) - larger capacity, complex queries

**Cleanup Policy:**
- Auto-delete history items older than 30 days
- When storage exceeds 40 MB, delete oldest history items
- Never auto-delete pinned notes
- User can manually clear all history from settings

### Content Script Modules

#### Selection Handler (`src/content/selection.ts`)

Captures text selections and manages selection state.

**Interface:**
```typescript
interface SelectionHandler {
  // Get currently selected text
  getSelectedText(): string | null;
  
  // Get selection range for replacement
  getSelectionRange(): Range | null;
  
  // Listen for selection changes
  onSelectionChange(callback: (text: string) => void): void;
  
  // Check if selection is in editable field
  isEditableSelection(): boolean;
}
```

**Implementation:**
- Use `window.getSelection()` for text capture
- Track selection changes with `selectionchange` event
- Detect editable contexts (textarea, contenteditable, input)
- Handle shadow DOM and iframes where possible

#### Caret Handler (`src/content/caret.ts`)

Manages caret position and text insertion.

**Interface:**
```typescript
interface CaretHandler {
  // Get current caret position
  getCaretPosition(): CaretPosition | null;
  
  // Insert text at caret
  insertAtCaret(text: string): boolean;
  
  // Replace selected text
  replaceSelection(text: string): boolean;
  
  // Check if element supports direct insertion
  supportsInsertion(element: HTMLElement): boolean;
}

interface CaretPosition {
  element: HTMLElement;
  offset: number;
}
```

**Implementation:**
- Handle textarea: Use `selectionStart` and `selectionEnd`
- Handle contenteditable: Use `Selection` and `Range` APIs
- Preserve formatting in contenteditable where possible
- Fall back to clipboard copy for unsupported editors (Google Docs, etc.)
- Notify user when fallback is used

#### Mini Bar Injector (`src/content/injector.ts`)

Injects and positions the Mini Bar near text selections.

**Interface:**
```typescript
interface MiniBarInjector {
  // Show mini bar near selection
  show(position: Position): void;
  
  // Hide mini bar
  hide(): void;
  
  // Check if mini bar is visible
  isVisible(): boolean;
}

interface Position {
  x: number;
  y: number;
}
```

**Implementation:**
- Create shadow DOM for style isolation
- Position above or below selection to avoid covering text
- Auto-hide after 5 seconds of inactivity
- Keep visible while hovering
- Handle scroll events to reposition
- Remove on page navigation

### React Components

#### VoiceRecorder (`src/components/VoiceRecorder.tsx`)

Voice capture interface with real-time transcript display.

**Props:**
```typescript
interface VoiceRecorderProps {
  onTranscriptComplete: (text: string) => void;
  language: string;
}
```

**State:**
- `isRecording`: boolean
- `partialTranscript`: string
- `finalTranscript`: string
- `confidence`: number
- `error`: string | null

**UI Elements:**
- Large circular record button (pulses red when active)
- Transcript area (partial in gray, final in black)
- Insert button (disabled until transcript is final)
- Clear button
- Microphone indicator icon

**Behavior:**
- Click record → request mic permission → start recognition
- Stream partial results in real-time
- Show confidence score with final result
- Handle errors with user-friendly messages
- Insert transcript at caret when user clicks insert

#### RewritePanel (`src/components/RewritePanel.tsx`)

Text rewriting interface with presets and custom prompts.

**Props:**
```typescript
interface RewritePanelProps {
  initialText?: string;
  pinnedNotes: PinnedNote[];
  onRewriteComplete: (original: string, rewritten: string) => void;
}
```

**State:**
- `inputText`: string
- `selectedPreset`: string | null
- `customPrompt`: string
- `isProcessing`: boolean
- `error`: string | null

**UI Elements:**
- Input textarea for text
- Preset buttons (mutually exclusive)
- Custom instruction field
- Rewrite button
- Loading indicator

**Behavior:**
- Load selected text from page if available
- Preset buttons are mutually exclusive
- Custom field enabled when no preset selected
- Merge pinned notes into prompt context
- Show loading state during processing
- Navigate to CompareView on completion

#### SummaryPanel (`src/components/SummaryPanel.tsx`)

Text summarization interface with mode and reading level options.

**Props:**
```typescript
interface SummaryPanelProps {
  initialText?: string;
  pinnedNotes: PinnedNote[];
  onSummaryComplete: (summary: string) => void;
}
```

**State:**
- `inputText`: string
- `mode`: 'bullets' | 'paragraph' | 'outline'
- `readingLevel`: 'elementary' | 'middle-school' | 'high-school' | 'college'
- `summary`: string
- `isProcessing`: boolean
- `error`: string | null

**UI Elements:**
- Input textarea for text
- Mode selector (radio buttons)
- Reading level dropdown
- Summarize button
- Result area
- Copy button

**Behavior:**
- Load selected text from page if available
- Default to bullets mode and high-school level
- Merge pinned notes into context
- Display summary in result area
- Copy button shows checkmark for 2 seconds

#### CompareView (`src/components/CompareView.tsx`)

Side-by-side comparison of original and rewritten text.

**Props:**
```typescript
interface CompareViewProps {
  originalText: string;
  rewrittenText: string;
  onAccept: () => void;
  onReject: () => void;
}
```

**UI Elements:**
- Two-column layout
- Original text (left, read-only)
- Rewritten text (right, read-only)
- Accept button (green)
- Reject button (gray)
- Copy to clipboard button

**Behavior:**
- Display texts side by side with equal width
- Highlight differences if possible
- Accept → replace text in source field
- Reject → close view and return to rewrite panel
- Copy → copy rewritten text to clipboard

#### MiniBar (`src/components/MiniBar.tsx`)

Compact toolbar injected near text selections.

**Props:**
```typescript
interface MiniBarProps {
  position: Position;
  onRecord: () => void;
  onSummarize: () => void;
  onRewrite: () => void;
  onClose: () => void;
}
```

**UI Elements:**
- Record button (microphone icon)
- Summarize button (list icon)
- Rewrite button (edit icon)
- Close button (X icon)

**Behavior:**
- Appears within 200ms of selection
- Positioned to avoid covering text
- Auto-hides after 5 seconds
- Stays visible while hovering
- Buttons open corresponding panel tab

#### Settings (`src/components/Settings.tsx`)

Configuration interface for preferences and pinned notes.

**Props:**
```typescript
interface SettingsProps {
  settings: Settings;
  pinnedNotes: PinnedNote[];
  onSettingsChange: (settings: Settings) => void;
  onPinnedNotesChange: (notes: PinnedNote[]) => void;
}
```

**UI Elements:**
- Local-only mode toggle
- Language selector dropdown
- Theme selector (light/dark/system)
- Keyboard shortcuts editor
- Privacy notice (always visible)
- Pinned notes list with add/edit/delete

**Behavior:**
- Changes save automatically
- Privacy notice explains Web Speech API network usage
- Pinned notes support markdown formatting
- Validate shortcuts for conflicts

### State Management

#### Store (`src/state/store.ts`)

Centralized state management using React Context or lightweight state library.

**State Shape:**
```typescript
interface AppState {
  // UI state
  activeTab: 'voice' | 'rewrite' | 'summary' | 'history' | 'settings';
  isProcessing: boolean;
  
  // Data
  settings: Settings;
  pinnedNotes: PinnedNote[];
  history: HistoryItem[];
  
  // Current operation
  currentText: string;
  currentResult: string | null;
  
  // AI availability
  aiAvailability: AIAvailability;
  
  // Errors
  error: string | null;
}
```

**Actions:**
- `setActiveTab(tab)`
- `setSettings(settings)`
- `addPinnedNote(note)`
- `updatePinnedNote(id, note)`
- `deletePinnedNote(id)`
- `addHistoryItem(item)`
- `clearHistory()`
- `setCurrentText(text)`
- `setCurrentResult(result)`
- `setError(error)`
- `checkAIAvailability()`

## Data Models

### Settings

```typescript
interface Settings {
  language: string;                    // e.g., 'en-US'
  theme: 'light' | 'dark' | 'system';
  localOnlyMode: boolean;
  shortcuts: {
    openPanel: string;
    record: string;
    summarize: string;
    rewrite: string;
  };
}
```

### Pinned Note

```typescript
interface PinnedNote {
  id: string;                          // UUID
  title: string;
  content: string;                     // Markdown supported
  createdAt: number;                   // Unix timestamp
  updatedAt: number;                   // Unix timestamp
}
```

### History Item

```typescript
interface HistoryItem {
  id: string;                          // UUID
  type: 'voice' | 'summarize' | 'rewrite';
  originalText: string;
  resultText: string;
  timestamp: number;                   // Unix timestamp
  metadata?: {
    mode?: string;                     // For summarize
    preset?: string;                   // For rewrite
    confidence?: number;               // For voice
  };
}
```

## Error Handling

### Error Categories and Recovery Strategies

**1. AI API Unavailable**
- Detection: Check `availability()` returns 'unavailable'
- Recovery: Use Mock Provider with example outputs
- User Message: "AI features require Chrome 128+ with Gemini Nano enabled"
- UI: Show link to setup instructions

**2. User Activation Required**
- Detection: Check `navigator.userActivation.isActive` is false
- Recovery: Prompt user to click button again
- User Message: "Please click the button again to continue"
- UI: Re-enable button, add visual cue

**3. Microphone Permission Denied**
- Detection: SpeechRecognition error event with 'not-allowed'
- Recovery: Provide link to browser permission settings
- User Message: "Microphone permission denied. Please allow access in browser settings"
- UI: Disable record button, show settings link

**4. Network Error During Speech**
- Detection: SpeechRecognition error event with 'network'
- Recovery: Stop recognition, allow retry
- User Message: "Network error. Please check your connection and try again"
- UI: Reset record button, show retry option

**5. Text Replacement Failure**
- Detection: Exception during DOM manipulation
- Recovery: Copy to clipboard, notify user
- User Message: "Unable to replace text automatically. The result has been copied to your clipboard"
- UI: Show clipboard icon, provide paste instructions

**6. Storage Quota Exceeded**
- Detection: IndexedDB quota error
- Recovery: Auto-delete oldest history items
- User Message: "Storage limit reached. Oldest history items have been removed"
- UI: Show storage usage indicator

**7. Long Text Timeout**
- Detection: AI operation exceeds 5 second timeout
- Recovery: Cancel operation, suggest chunking
- User Message: "Text is too long. Try summarizing first, then rewriting the summary"
- UI: Show character count, suggest limit

### Error Logging

All errors are logged to console with context:
```typescript
console.error('[Flint]', {
  component: 'AIService',
  operation: 'rewrite',
  error: error.message,
  timestamp: Date.now(),
  userAgent: navigator.userAgent
});
```

## Testing Strategy

### Unit Tests

**Target Files:**
- `src/services/ai.ts` - AI API interactions, fallback logic
- `src/services/speech.ts` - Speech recognition, error handling
- `src/content/selection.ts` - Text selection capture
- `src/content/caret.ts` - Text insertion and replacement
- `src/services/storage.ts` - Data persistence

**Test Approach:**
- Mock Chrome APIs (storage, scripting, runtime)
- Mock Web Speech API
- Mock AI APIs with controlled responses
- Test error conditions and fallbacks
- Verify data transformations

**Coverage Target:** 80% code coverage

### Component Tests

**Target Components:**
- `VoiceRecorder` - Recording states, transcript display
- `RewritePanel` - Preset selection, custom prompts
- `SummaryPanel` - Mode selection, result display
- `CompareView` - Accept/reject actions
- `Settings` - Preference changes, pinned notes

**Test Approach:**
- Use React Testing Library
- Test user interactions (clicks, typing)
- Verify state changes
- Test error states
- Mock service layer

### End-to-End Tests

**Test Scenarios:**
1. **Voice to Draft**
   - Open side panel
   - Click record button
   - Mock speech stream with partial results
   - Verify transcript updates in real-time
   - Click insert button
   - Verify text appears in test page textarea

2. **Summarize Selection**
   - Load test page with long text
   - Select text
   - Verify mini bar appears
   - Click summarize button
   - Select bullets mode
   - Verify summary generates
   - Click accept
   - Verify summary appears in page

3. **Rewrite Selection**
   - Load test page with text
   - Select text
   - Click rewrite in mini bar
   - Select formal preset
   - Verify rewrite generates
   - Verify compare view shows both versions
   - Click accept
   - Verify original text is replaced

4. **Fallback Handling**
   - Disable AI APIs in test environment
   - Trigger rewrite operation
   - Verify mock provider is used
   - Verify user sees appropriate message

**Test Environment:**
- Playwright for browser automation
- Fresh Chrome profile for each test
- Mock AI APIs for consistent results
- Test pages with various input types

### Performance Tests

**Metrics to Verify:**
- Side panel render time < 3 seconds
- Button feedback < 100ms
- Partial transcript latency < 500ms
- Rewrite completion < 5 seconds (for <1000 words)
- Bundle size < 1 MB compressed

**Tools:**
- Chrome DevTools Performance panel
- Lighthouse for bundle analysis
- Custom timing measurements in code

## Security Considerations

### Content Security Policy

Manifest V3 requires strict CSP:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Implications:**
- No inline scripts allowed
- No `eval()` or `new Function()`
- All scripts must be bundled
- Vite handles bundling automatically

### Input Sanitization

**User Input Points:**
- Text from web pages (selections)
- Voice transcripts
- Custom rewrite prompts
- Pinned note content

**Sanitization Strategy:**
- Escape HTML entities before DOM insertion
- Use `textContent` instead of `innerHTML` where possible
- Validate input lengths (max 10,000 characters)
- Strip script tags from contenteditable content

### Permission Minimization

**Required Permissions:**
- `storage` - Settings and data persistence
- `scripting` - Content script injection
- `activeTab` - Access current tab for text manipulation

**Not Required:**
- `tabs` - Don't need full tab access
- `webRequest` - No network interception
- `cookies` - No authentication

### Data Privacy

**Local-First Guarantees:**
- All AI processing uses Chrome built-in APIs (local)
- No external API calls for text operations
- No telemetry or analytics collection
- No user accounts or authentication

**Exception:**
- Web Speech API may use network service
- Privacy notice clearly states this
- User can disable voice features

## Build and Deployment

### Build Configuration

**Vite Config** (`vite.config.ts`):
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        panel: 'src/panel/index.html',
        background: 'src/background/background.ts',
        content: 'src/content/contentScript.ts'
      },
      output: {
        entryFileNames: 'src/[name]/[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    target: 'es2020',
    minify: 'terser',
    sourcemap: false
  }
});
```

**Bundle Optimization:**
- Tree-shaking to remove unused code
- Code splitting for lazy-loaded components
- Minification with Terser
- No source maps in production
- Compress with gzip for size verification

### TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "jsx": "react-jsx"
  }
}
```

**Strict Mode Requirements:**
- No implicit any
- Strict null checks
- No unused locals or parameters
- All code must type-check without errors

### Development Workflow

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Development Build:**
   ```bash
   npm run dev
   ```
   - Watches for file changes
   - Rebuilds automatically
   - Outputs to `dist/`

3. **Type Check:**
   ```bash
   npm run type-check
   ```
   - Runs `tsc --noEmit`
   - Must pass with zero errors

4. **Lint:**
   ```bash
   npm run lint
   ```
   - ESLint with TypeScript rules
   - Must pass with zero warnings

5. **Format:**
   ```bash
   npm run format
   ```
   - Prettier for consistent style

6. **Test:**
   ```bash
   npm test
   npm run test:e2e
   ```

7. **Production Build:**
   ```bash
   npm run build
   ```
   - Minified output
   - Bundle size verification
   - Ready for loading as unpacked extension

### Loading in Chrome

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder
5. Extension appears in toolbar

### Packaging for Submission

```bash
cd dist
zip -r ../flint-extension.zip .
cd ..
```

Result: `flint-extension.zip` ready for Chrome Web Store or hackathon submission.

## UI/UX Design System

### Theme Overview

Flint uses a modern minimalist design system with a monochrome base and orange accent color. The theme prioritizes clarity, focus, and accessibility while maintaining a clean, professional appearance.

**Core Principles:**
- Dark mode by default (optimized for extended use)
- Monochrome palette with strategic accent usage
- Soft shadows and subtle gradients for depth
- Generous spacing and rounded corners
- High contrast for accessibility (WCAG 2.1 AA)

### Color System

**Primary Theme (Dark Mode Default):**
- Background: `#0c0e13` - Deep charcoal for main canvas
- Surface: `#111421` - Elevated panels and cards
- Surface-2: `#151a28` - Secondary surfaces and inputs
- Text: `#eef0f6` - High contrast primary text
- Muted: `#b7bccf` - Secondary text and labels
- Accent: `#f97316` - Orange for primary actions
- Accent-2: `#fdba74` - Lighter orange for gradients

**Light Mode:**
- Background: `#ffffff` - Pure white canvas
- Surface: `#f6f7fb` - Light gray panels
- Surface-2: `#eef0f6` - Slightly darker gray
- Text: `#0d1220` - Near-black text
- Muted: `#4d5568` - Gray for secondary text
- Accent: `#ea580c` - Darker orange for light backgrounds

**Complementary Accent (Optional):**
- Blue accent: `#3b82f6` - Can replace orange via toggle
- Blue-2: `#93c5fd` - Lighter blue for gradients
- Activated by `.accent-comp` class on root element

### Typography

**Font Stack:**
```css
font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
```

**Type Scale:**
- XS: 12px - Badges, metadata
- SM: 13px - Section titles, labels
- MD: 14px - Body text, buttons (default)
- LG: 16px - Headings, emphasis
- XL: 18px - Panel titles
- 2XL: 22px - Hero text

### Spacing and Layout

**Border Radius:**
- Small: 10px - Badges, small elements
- Medium: 16px - Buttons, inputs, cards
- Large: 24px - Panels, modals, mini bar

**Shadows:**
- Soft: `0 8px 24px rgba(0,0,0,0.25)` - Elevated surfaces
- Glow: `0 0 0 1px rgba(249, 115, 22, 0.25), 0 12px 40px rgba(249, 115, 22, 0.18)` - Focus states, hover effects

**Component Heights:**
- Button: 38px
- Input: 40px
- Toolbar: 44px

### Design Tokens

All design values are defined as CSS custom properties in `src/styles/tokens.css`:

```css
:root {
  /* Geometry */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  
  /* Elevation */
  --shadow-soft: 0 8px 24px rgba(0,0,0,0.25);
  --shadow-glow: 0 0 0 1px rgba(249, 115, 22, 0.25), 0 12px 40px rgba(249, 115, 22, 0.18);
  
  /* Typography */
  --font-sans: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  --fs-xs: 12px;
  --fs-sm: 13px;
  --fs-md: 14px;
  --fs-lg: 16px;
  --fs-xl: 18px;
  --fs-2xl: 22px;
  
  /* Colors - Dark Mode */
  --bg: #0c0e13;
  --surface: #111421;
  --surface-2: #151a28;
  --text: #eef0f6;
  --muted: #b7bccf;
  --accent: #f97316;
  --stroke: rgba(255,255,255,0.08);
  
  /* Dimensions */
  --btn-height: 38px;
  --toolbar-height: 44px;
}

.light {
  --bg: #ffffff;
  --surface: #f6f7fb;
  --text: #0d1220;
  /* ... light mode overrides */
}

.accent-comp {
  --accent: var(--comp);
  --accent-2: var(--comp-2);
}
```

### Component Styles

**Surfaces:**
```css
.flint-surface {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), var(--surface);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
}
```

**Buttons:**
```css
.flint-btn {
  height: var(--btn-height);
  padding: 0 16px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text);
  transition: transform .12s ease, box-shadow .12s ease;
}

.flint-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  color: #0b0d13;
  font-weight: 600;
}

.flint-btn:hover {
  box-shadow: var(--shadow-glow);
}
```

**Inputs:**
```css
.flint-input {
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  background: var(--surface-2);
  color: var(--text);
  padding: 0 16px;
}

.flint-input:focus {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 50%, transparent);
  border-color: color-mix(in oklab, var(--accent) 60%, var(--stroke));
}
```

**Mini Bar:**
```css
.flint-minibar {
  position: fixed;
  z-index: 999999;
  padding: 8px;
  border: 1px solid var(--stroke-strong);
  background: rgba(17, 20, 33, 0.85);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glow);
}
```

### Tailwind Integration

Design tokens are mapped to Tailwind utilities in `tailwind.config.cjs`:

```javascript
module.exports = {
  theme: {
    extend: {
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px"
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        stroke: "var(--stroke)"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.25)",
        glow: "0 0 0 1px rgba(249, 115, 22, 0.25), 0 12px 40px rgba(249, 115, 22, 0.18)"
      }
    }
  }
};
```

### Theme Switching

**Light Mode Toggle:**
- Implemented in Settings component
- Toggles `.light` class on root element
- Persisted in chrome.storage.local
- Applies immediately without reload

**Accent Color Toggle:**
- Optional blue accent as alternative to orange
- Toggles `.accent-comp` class on root element
- Useful for user preference or accessibility
- Persisted in settings

**Implementation:**
```typescript
// Toggle light mode
document.documentElement.classList.toggle('light');

// Toggle complementary accent
document.documentElement.classList.toggle('accent-comp');
```

### Accessibility Features

**Color Contrast:**
- All text meets WCAG 2.1 AA standards
- Primary text: 14:1 contrast ratio (dark mode)
- Muted text: 7:1 contrast ratio
- Buttons: 4.5:1 minimum

**Focus States:**
- Visible focus rings on all interactive elements
- Orange glow effect (2px outline + shadow)
- High contrast in both light and dark modes
- Never removed, only styled

**Keyboard Navigation:**
- All components fully keyboard accessible
- Logical tab order
- Focus trap in modals
- Escape key closes overlays

**Screen Readers:**
- ARIA labels on all buttons and controls
- ARIA live regions for dynamic content
- Semantic HTML structure
- Status announcements for state changes

### Component-Specific Design

**Side Panel:**
- Full height, fixed width (400px)
- Toolbar at top with tab navigation
- Content area with padding (16px)
- Smooth transitions between tabs
- Scrollable content area

**Mini Bar:**
- Compact horizontal layout
- 4 icon buttons (Record, Summarize, Rewrite, Close)
- Appears near text selection
- Semi-transparent background with blur
- Auto-hides after 5 seconds

**Voice Recorder:**
- Large circular record button (60px)
- Pulsing animation when active
- Transcript area with monospace font
- Confidence indicator (progress bar)
- Insert and clear buttons at bottom

**Rewrite Panel:**
- Preset buttons in grid layout (2 columns)
- Custom prompt textarea (3 rows)
- Primary action button (full width)
- Loading spinner during processing

**Summary Panel:**
- Mode selector (radio buttons, horizontal)
- Reading level dropdown
- Result area with markdown rendering
- Copy button with success feedback

**Compare View:**
- Two-column layout (50/50 split)
- Original on left, rewritten on right
- Diff highlighting (optional)
- Accept (green) and Reject (gray) buttons
- Sticky footer with actions

**Settings:**
- Grouped sections with titles
- Toggle switches for boolean options
- Dropdowns for selections
- Pinned notes list with add/edit/delete
- Privacy notice in callout box

### Animation and Transitions

**Micro-interactions:**
- Button press: `translateY(1px)` on active
- Hover: Glow shadow appears (120ms ease)
- Focus: Ring fades in (120ms ease)
- Tab switch: Fade content (200ms ease)

**Loading States:**
- Spinner for AI operations
- Skeleton screens for history loading
- Progress bar for long operations
- Disable buttons during processing

**Feedback:**
- Success: Green checkmark (2 seconds)
- Error: Red icon with message
- Copy: Clipboard icon → checkmark
- Insert: Button text changes briefly

### Responsive Considerations

**Side Panel:**
- Fixed width (400px) - no responsive needed
- Vertical scroll for overflow content
- Collapsible sections if needed

**Mini Bar:**
- Repositions to stay in viewport
- Flips above/below selection as needed
- Hides on scroll (reappears on scroll stop)

### Design System Files

**File Structure:**
```
src/styles/
├── tokens.css          # CSS custom properties
├── index.css           # Global styles, imports tokens
└── components/         # Component-specific styles (if needed)
```

**Usage in Components:**
```tsx
// Use utility classes
<button className="flint-btn primary">
  Rewrite
</button>

// Or Tailwind utilities
<div className="bg-surface border border-stroke rounded-lg p-4">
  Content
</div>
```

### Design Acceptance Criteria

- [ ] Dark mode renders correctly with monochrome + orange theme
- [ ] Light mode toggle works and persists
- [ ] Blue accent toggle works and updates all accent colors
- [ ] All text meets WCAG 2.1 AA contrast standards
- [ ] Focus states are visible on all interactive elements
- [ ] Keyboard navigation works for all components
- [ ] Buttons show hover and active states
- [ ] Shadows and borders render consistently
- [ ] Typography scale is applied correctly
- [ ] Spacing is consistent across components
- [ ] Mini bar uses semi-transparent background with blur
- [ ] Animations are smooth (60fps)
- [ ] No style regressions in existing flows

## Design Decisions and Rationale

### Why React for Side Panel?

- Familiar to most developers
- Rich ecosystem of components
- Good TypeScript support
- Efficient re-rendering for real-time transcripts
- Small bundle size with proper tree-shaking

### Why Not Use a State Management Library?

- Application state is relatively simple
- React Context is sufficient for our needs
- Avoids additional bundle size
- Reduces complexity and learning curve

### Why IndexedDB for History?

- Larger storage capacity than chrome.storage (50 MB vs 10 KB)
- Supports complex queries (search, filter)
- Async API doesn't block UI
- Better for large datasets

### Why Shadow DOM for Mini Bar?

- Style isolation from host page
- Prevents CSS conflicts
- Maintains consistent appearance
- Protects against page scripts

### Why Mock Provider Instead of Disabling Features?

- Allows demo without AI APIs
- Users can see functionality
- Provides clear upgrade path
- Better user experience than blank states

### Why 1 MB Bundle Limit?

- Fast download and installation
- Minimal memory footprint
- Meets hackathon requirements
- Forces efficient code practices

### Why No External Dependencies for AI?

- Local-first privacy guarantee
- No API keys or authentication
- Works offline (except speech)
- Meets hackathon constraints

### Why Dark Mode as Default?

- Reduces eye strain during extended use
- Common preference for developer tools
- Better for low-light environments
- Highlights orange accent more effectively
- Light mode still available via toggle

### Why Orange as Primary Accent?

- High visibility and energy
- Stands out against monochrome base
- Associated with creativity and action
- Good contrast in both light and dark modes
- Differentiates from typical blue tech UIs

### Why Offer Blue Accent Toggle?

- User preference and accessibility
- Some users prefer cooler tones
- Blue is more traditional for tech products
- Allows customization without complexity
- Easy to implement with CSS variables

### Why CSS Variables Over Sass/Less?

- Native browser support (no build step needed)
- Dynamic theming at runtime
- Easy integration with Tailwind
- Better performance than preprocessor variables
- Simpler mental model for theme switching

## Future Enhancements

### Translator Shortcut
Add translate button to mini bar using Prompt API with language selector. Store target language in settings.

### Proofreader Mode
Add proofread preset focusing on grammar/spelling using Rewriter API with error-correction prompt.

### Tone Analyzer
Analyze emotional tone of text (formal/casual/friendly) using Prompt API. Display as badge in summary panel.

### Markdown Export
Export history as markdown file using File System Access API. Include timestamps and full text.

### Theme Toggle
Quick theme switcher in panel header. Cycles light/dark/system without page reload.

## References

This design addresses the following requirements:
- Requirements 1.1-1.9: Voice capture architecture and speech service
- Requirements 2.1-2.8: Summarization flow and AI service
- Requirements 3.1-3.8: Rewriting flow and preset handling
- Requirements 4.1-4.6: Comparison view and text replacement
- Requirements 5.1-5.5: Pinned notes storage and merging
- Requirements 6.1-6.6: Settings management and privacy
- Requirements 7.1-7.7: History storage and cleanup
- Requirements 8.1-8.5: Performance budgets and optimization
- Requirements 9.1-9.5: Accessibility features
- Requirements 10.1-10.6: Error handling and fallbacks
