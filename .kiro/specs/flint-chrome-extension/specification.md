# Flint Chrome Extension — Complete Specification

## 1. Executive Summary

People lose ideas and break focus while writing because they must switch between thinking, typing, and editing. Context switching drains productivity and interrupts creative flow. Flint solves this by bringing voice capture, instant summarization, and targeted rewriting directly into the browser using Chrome's built-in AI.

All text processing happens locally on the user's device. No external servers receive user content. The extension uses Chrome's Prompt API, Summarizer API, and Rewriter API for text operations. Speech recognition uses the Web Speech API because Chrome's built-in AI for speech is not yet available. This may send audio to a network service.

## 2. Goals and Non-Goals

### Goals

1. Enable voice-to-text capture with real-time streaming in any web page text field.
2. Provide instant summarization and rewriting of selected text using local AI processing.
3. Deliver a production-ready Chrome extension under 1 MB that passes all quality checks for the hackathon submission.

### Non-Goals

1. Support for browsers other than Chrome (no Firefox, Safari, or Edge compatibility).
2. Cloud synchronization or server-side storage of user data or preferences.
3. Advanced features like translation, grammar checking, or collaborative editing during the hackathon build.

## 3. User Stories

1. As a content writer, I want to speak my draft ideas into any text field so that I can capture thoughts without typing.
2. As a student, I want to select a long article and get a bullet-point summary so that I can quickly understand the main points.
3. As a professional, I want to rewrite my casual email draft in a formal tone so that it matches business communication standards.
4. As a blogger, I want to compare the original and rewritten versions side by side so that I can choose the best phrasing.
5. As a privacy-conscious user, I want all AI processing to happen locally so that my sensitive content never leaves my device.

## 4. Functional Requirements

### 4.1 Voice to Text

The system SHALL capture voice input using the Web Speech API.
The system SHALL stream partial transcription results to the UI in real-time as the user speaks.
The system SHALL finalize the transcript when the user stops speaking or clicks the stop button.
The system SHALL display a confidence indicator for the final transcript.
The system SHALL detect the browser's default language and use it for recognition.
The system SHALL show a visual microphone indicator when recording is active.
The system SHALL handle errors such as microphone permission denied, no speech detected, and network failures with clear user messages.

### 4.2 Summarize

The system SHALL allow users to select text on any web page and trigger summarization.
The system SHALL offer three summary modes: bullets, paragraph, and outline.
The system SHALL provide reading level options: elementary, middle school, high school, and college.
The system SHALL generate summaries using Chrome's Summarizer API when available.
The system SHALL merge pinned notes into the summarization context to guide tone and audience.
The system SHALL display the summary in a comparison view before insertion.
The system SHALL fall back to a mock provider with example output when the Summarizer API is unavailable.

### 4.3 Rewrite

The system SHALL allow users to select text and trigger rewriting with preset options.
The system SHALL provide presets: clarify, simplify, concise, expand, friendly, formal, poetic, and persuasive.
The system SHALL include a custom instruction field for user-defined rewrite prompts.
The system SHALL offer tone options: more formal, more casual, and as-is.
The system SHALL provide options to make text more concise or expand it.
The system SHALL merge pinned notes into the rewrite context to guide style and audience.
The system SHALL generate rewrites using Chrome's Rewriter API when available.
The system SHALL fall back to the Prompt API or a mock provider when the Rewriter API is unavailable.

### 4.4 Insert and Compare

The system SHALL display original and rewritten text side by side in a comparison view.
The system SHALL allow users to accept or reject the rewritten version.
WHEN the user accepts, the system SHALL replace the original text in the source field.
The system SHALL support text replacement in textarea elements.
The system SHALL support text replacement in contenteditable elements.
IF replacement fails in complex editors, the system SHALL copy the result to the clipboard and notify the user.
The system SHALL preserve formatting where possible during replacement.

### 4.5 Pinned Notes

The system SHALL allow users to create and save pinned notes for audience and tone guidance.
The system SHALL merge pinned notes into AI prompts for summarization and rewriting.
The system SHALL store pinned notes in IndexedDB for persistence across sessions.
The system SHALL display pinned notes in the settings panel for editing.

### 4.6 Settings

The system SHALL provide a local-only mode toggle that disables network-dependent features.
The system SHALL allow users to select their preferred language for speech recognition.
The system SHALL offer theme options: light, dark, and system default.
The system SHALL allow users to configure keyboard shortcuts for common actions.
The system SHALL display a privacy notice about Web Speech API network usage.

## 5. Non-Functional Requirements

### Performance Budgets

1. Bundle size: The combined size of panel and content script SHALL NOT exceed 1 MB compressed.
2. Cold start: The side panel SHALL render within 3 seconds of opening.
3. Voice latency: Partial transcripts SHALL appear within 500 milliseconds of speech.
4. Rewrite latency: Text rewriting SHALL complete within 5 seconds for inputs under 1000 words.
5. UI responsiveness: All button clicks SHALL provide visual feedback within 100 milliseconds.

### Privacy Guarantees

1. All AI text processing SHALL occur locally using Chrome's built-in APIs.
2. No user content SHALL be sent to external servers except through the Web Speech API.
3. The extension SHALL NOT collect telemetry or analytics data.
4. The extension SHALL NOT require user accounts or authentication.

### Accessibility

1. All interactive elements SHALL be keyboard navigable.
2. All buttons and controls SHALL have ARIA labels.
3. Color contrast SHALL meet WCAG 2.1 AA standards.
4. Screen reader announcements SHALL be provided for state changes.

### Internationalization

1. The UI SHALL use the browser's default language when available.
2. Speech recognition SHALL support the user's selected language.
3. All user-facing strings SHALL be externalized for future translation.

### Security

1. The extension SHALL follow Manifest V3 security requirements.
2. No inline scripts or eval SHALL be used.
3. Content Security Policy SHALL restrict script sources to self.
4. User input SHALL be sanitized before insertion into the DOM.

## 6. Architecture

### Extension Structure

Flint uses Chrome Extension Manifest V3 architecture with three main contexts:

1. Background service worker: Manages extension lifecycle, handles messages, and coordinates between contexts.
2. Content script: Injected into web pages to capture selections, detect caret position, and insert text.
3. Side panel: Provides the main UI for voice recording, rewriting, summarization, and settings.

### Message Flow

1. User clicks a button in the side panel.
2. Side panel sends a message to the background service worker.
3. Background service worker forwards the message to the content script.
4. Content script performs the action and sends a response back through the background service worker.
5. Side panel receives the response and updates the UI.

### Data Flow: Voice to Draft

1. User opens side panel and clicks record button.
2. VoiceRecorder component requests microphone permission.
3. speech.ts starts Web Speech API recognition with interim results enabled.
4. Partial transcripts stream to the UI and update in real-time.
5. User clicks stop or recognition ends automatically.
6. Final transcript is displayed in the panel.
7. User clicks insert button.
8. Panel sends message to content script with transcript.
9. Content script finds active element and inserts text at caret position.

### Data Flow: Selection Rewrite

1. User selects text on a web page.
2. Content script detects selection and shows mini bar near caret.
3. User clicks rewrite button in mini bar.
4. Content script sends selected text to side panel.
5. Side panel displays text in RewritePanel component.
6. User chooses preset or enters custom instruction.
7. ai.ts calls Chrome Rewriter API with options.
8. Rewritten text is displayed in CompareView component.
9. User clicks accept button.
10. Panel sends rewritten text to content script.
11. Content script replaces original selection with new text.

### Folder Map

```
flint/
├── manifest.json
├── src/
│   ├── background/
│   │   └── background.ts
│   ├── content/
│   │   ├── contentScript.ts
│   │   ├── selection.ts
│   │   ├── caret.ts
│   │   └── injector.ts
│   ├── panel/
│   │   ├── index.html
│   │   ├── panel.tsx
│   │   └── panel.css
│   ├── components/
│   │   ├── VoiceRecorder.tsx
│   │   ├── RewritePanel.tsx
│   │   ├── SummaryPanel.tsx
│   │   ├── CompareView.tsx
│   │   ├── MiniBar.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   ├── ai.ts
│   │   ├── speech.ts
│   │   ├── storage.ts
│   │   ├── permissions.ts
│   │   └── telemetry.ts
│   ├── state/
│   │   ├── store.ts
│   │   ├── actions.ts
│   │   └── selectors.ts
│   └── utils/
│       ├── dom.ts
│       ├── id.ts
│       └── throttle.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── LICENSE
```

## 7. API Usage and Capability Checks

### Prompt API

The Prompt API provides general-purpose text generation using Chrome's built-in language model.

```typescript
async function generateText(prompt: string): Promise<string> {
  try {
    const available = await LanguageModel.availability();
    
    if (available === 'unavailable') {
      throw new Error('Language model is not available');
    }
    
    if (!navigator.userActivation.isActive) {
      throw new Error('User activation required');
    }
    
    const session = await LanguageModel.create();
    const result = await session.prompt(prompt);
    
    return result;
  } catch (error) {
    console.error('Prompt API error:', error);
    throw new Error('Failed to generate text. Please try again.');
  }
}
```

### Summarizer API

The Summarizer API creates summaries in different formats and lengths.

```typescript
async function summarizeText(
  text: string,
  options: {
    type: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
    format: 'markdown' | 'plain-text';
    length: 'short' | 'medium' | 'long';
  }
): Promise<string> {
  try {
    if (!('Summarizer' in self)) {
      throw new Error('Summarizer API not available');
    }
    
    const availability = await Summarizer.availability();
    
    if (availability === 'unavailable') {
      throw new Error('Summarizer is not available');
    }
    
    if (!navigator.userActivation.isActive) {
      throw new Error('User activation required');
    }
    
    const summarizer = await Summarizer.create(options);
    const summary = await summarizer.summarize(text);
    
    return summary;
  } catch (error) {
    console.error('Summarizer API error:', error);
    throw new Error('Failed to create summary. Please try again.');
  }
}
```

### Rewriter API

The Rewriter API transforms text with different tones and styles.

```typescript
async function rewriteText(
  text: string,
  options: {
    tone: 'more-formal' | 'more-casual' | 'as-is';
    format: 'plain-text' | 'markdown';
  }
): Promise<string> {
  try {
    if (!('Rewriter' in self)) {
      throw new Error('Rewriter API not available');
    }
    
    const availability = await Rewriter.availability();
    
    if (availability === 'unavailable') {
      throw new Error('Rewriter is not available');
    }
    
    if (!navigator.userActivation.isActive) {
      throw new Error('User activation required');
    }
    
    const rewriter = await Rewriter.create(options);
    const result = await rewriter.rewrite(text);
    
    return result;
  } catch (error) {
    console.error('Rewriter API error:', error);
    throw new Error('Failed to rewrite text. Please try again.');
  }
}
```

Note: The Rewriter API is currently in origin trial. During development, enable it at `chrome://flags/#rewriter-api-for-gemini-nano`. For production, an origin trial token may be required in the manifest.

### Web Speech API

The Web Speech API provides speech recognition with streaming results.

```typescript
function startSpeechRecognition(
  onPartial: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (error: string) => void
): SpeechRecognition {
  try {
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      
      if (result.isFinal) {
        onFinal(transcript);
      } else {
        onPartial(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Microphone not available.',
        'not-allowed': 'Microphone permission denied.',
        'network': 'Network error. Check your connection.',
      };
      
      onError(errorMessages[event.error] || 'Speech recognition failed.');
    };
    
    recognition.start();
    return recognition;
  } catch (error) {
    console.error('Speech recognition error:', error);
    onError('Failed to start speech recognition.');
    throw error;
  }
}
```

## 8. Manifest and Permissions

```json
{
  "manifest_version": 3,
  "name": "Flint",
  "version": "1.0.0",
  "description": "Voice-to-text, summarization, and rewriting with local AI",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": [
    "storage",
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background/background.js"
  },
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "action": {
    "default_title": "Open Flint"
  }
}
```

### Permission Justifications

1. `storage`: Required to save user settings, pinned notes, and session history.
2. `scripting`: Required to inject content scripts dynamically into web pages.
3. `activeTab`: Required to access the current tab for text selection and insertion.
4. `<all_urls>`: Required during development to test on any website. Scope this to specific domains for production if needed.

### Content Security Policy

The CSP restricts script sources to the extension itself. This prevents injection attacks and meets Manifest V3 security requirements. Vite bundles all code into self-contained files that comply with this policy.

## 9. Storage Model

### Settings Schema

```typescript
interface Settings {
  language: string;           // e.g., 'en-US'
  theme: 'light' | 'dark' | 'system';
  localOnlyMode: boolean;
  shortcuts: Record<string, string>;
}
```

Stored in: `chrome.storage.local`  
Key: `settings`  
Size limit: 10 KB

### Pinned Notes Schema

```typescript
interface PinnedNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

Stored in: IndexedDB  
Database: `flint-db`  
Object store: `pinnedNotes`  
Size limit: 50 MB total

### Session History Schema

```typescript
interface HistoryItem {
  id: string;
  type: 'voice' | 'summarize' | 'rewrite';
  originalText: string;
  resultText: string;
  timestamp: number;
}
```

Stored in: IndexedDB  
Database: `flint-db`  
Object store: `history`  
Size limit: 50 MB total

### Storage Strategy

Use `chrome.storage.local` for:
- Small, frequently accessed data like settings
- Data that needs to sync with storage change listeners

Use IndexedDB for:
- Large data like history items and pinned notes
- Data that requires complex queries

### Cleanup Policy

1. History items older than 30 days are automatically deleted.
2. If IndexedDB exceeds 40 MB, delete oldest history items first.
3. Pinned notes are never automatically deleted.
4. User can manually clear history from settings.

## 10. UI and Interaction Design

### Mini Bar

The mini bar appears near the text caret when the user selects text on a web page.

Components:
1. Record button: Starts voice capture.
2. Summarize button: Opens summary options.
3. Rewrite button: Opens rewrite options.
4. Close button: Hides the mini bar.

Behavior:
- Appears within 200 milliseconds of text selection.
- Positioned above or below the selection to avoid covering text.
- Fades out after 5 seconds of inactivity.
- Remains visible while hovering.

### Side Panel

The side panel is the main UI surface with four tabs.

#### Voice Tab

Components:
1. Record button: Large circular button that starts and stops recording.
2. Transcript area: Shows partial and final transcripts.
3. Insert button: Inserts transcript at caret position.
4. Clear button: Clears the current transcript.

Behavior:
- Record button pulses red when active.
- Partial transcripts appear in gray.
- Final transcript appears in black.
- Insert button is disabled until transcript is final.

#### Rewrite Tab

Components:
1. Input area: Shows selected text or allows manual input.
2. Preset buttons: Clarify, simplify, concise, expand, friendly, formal, poetic, persuasive.
3. Custom instruction field: Free-form text input for custom prompts.
4. Rewrite button: Triggers the rewrite operation.
5. Compare view: Shows original and rewritten text side by side.
6. Accept and reject buttons: Apply or discard the rewrite.

Behavior:
- Preset buttons are mutually exclusive.
- Custom instruction field is enabled when no preset is selected.
- Compare view appears after rewrite completes.
- Accept button replaces text in the source field.

#### Summary Tab

Components:
1. Input area: Shows selected text or allows manual input.
2. Mode selector: Bullets, paragraph, outline.
3. Reading level selector: Elementary, middle school, high school, college.
4. Summarize button: Triggers the summary operation.
5. Result area: Shows the generated summary.
6. Copy button: Copies summary to clipboard.

Behavior:
- Mode and reading level default to bullets and high school.
- Result area is empty until summary completes.
- Copy button shows a checkmark for 2 seconds after copying.

#### History Tab

Components:
1. List of history items: Shows recent voice, summarize, and rewrite operations.
2. Search field: Filters history by text content.
3. Clear all button: Deletes all history items.

Behavior:
- History items are sorted by timestamp, newest first.
- Clicking an item shows full details in a modal.
- Clear all button requires confirmation.

### Settings Panel

Components:
1. Local-only mode toggle: Disables network-dependent features.
2. Language selector: Dropdown for speech recognition language.
3. Theme selector: Light, dark, system.
4. Keyboard shortcuts: Editable fields for common actions.
5. Privacy notice: Explains Web Speech API network usage.
6. Pinned notes editor: List of saved notes with add, edit, delete buttons.

Behavior:
- Changes are saved automatically.
- Privacy notice is always visible.
- Pinned notes editor supports markdown formatting.

## 11. Error Handling

### Common Failure Cases

#### Built-in AI Unavailable

Cause: Chrome version does not support AI APIs or model is not downloaded.

Recovery:
1. Show a notice in the UI: "AI features require Chrome 128 or later with Gemini Nano enabled."
2. Provide a link to instructions for enabling the model.
3. Fall back to mock provider for demo purposes.

User message: "AI features are not available. Please update Chrome and enable Gemini Nano."

#### Speech Recognition Blocked

Cause: Microphone permission denied or not available.

Recovery:
1. Show a notice: "Microphone access is required for voice capture."
2. Provide a button to open browser permission settings.
3. Disable record button until permission is granted.

User message: "Microphone permission denied. Please allow access in browser settings."

#### Selection Replacement Blocked

Cause: Complex editor like Google Docs or rich text editor prevents direct text replacement.

Recovery:
1. Copy the rewritten text to the clipboard.
2. Show a notice: "Text copied to clipboard. Paste it manually in the editor."
3. Log the specific error for debugging.

User message: "Unable to replace text automatically. The result has been copied to your clipboard."

#### Network Error During Speech Recognition

Cause: Web Speech API requires network connection and it is unavailable.

Recovery:
1. Show a notice: "Speech recognition requires an internet connection."
2. Stop the recording session.
3. Allow the user to retry when connection is restored.

User message: "Network error. Please check your connection and try again."

#### Quota Exceeded in IndexedDB

Cause: Storage limit reached for history or pinned notes.

Recovery:
1. Automatically delete oldest history items to free space.
2. Show a notice: "Storage limit reached. Oldest history items have been removed."
3. Prevent saving new items until space is available.

User message: "Storage limit reached. Some old history items were removed to make space."

#### User Activation Required

Cause: AI APIs require a user gesture like a click before they can be called.

Recovery:
1. Show a notice: "Please click the button again to continue."
2. Ensure all AI operations are triggered by button clicks.

User message: "Action requires a click. Please try again."

## 12. Privacy Statement

All AI processing in Flint happens locally on your device using Chrome's built-in language models. No text content is sent to external servers for summarization or rewriting. Your drafts, notes, and history remain private and under your control.

Speech recognition uses the Web Speech API, which may send audio to a network-based service for transcription. This is a limitation of the current browser API. When recording is active, a microphone indicator is displayed. You can disable voice features in settings if you prefer not to use network-based speech recognition.

Flint does not collect analytics, telemetry, or usage data. No user accounts or authentication are required. All data is stored locally in your browser and can be cleared at any time from the settings panel.

## 13. Testing Plan

### Unit Tests

Test files:
- `src/services/ai.test.ts`
- `src/services/speech.test.ts`
- `src/content/selection.test.ts`
- `src/content/caret.test.ts`

Coverage:
- ai.ts: Test availability checks, session creation, prompt generation, error handling, and mock fallback.
- speech.ts: Test recognition start, stop, partial results, final results, error handling, and language detection.
- selection.ts: Test text selection capture in textarea and contenteditable elements.
- caret.ts: Test caret position detection and text insertion in different element types.

Pass criteria:
- All unit tests pass with 80% code coverage.
- No console errors or warnings during test execution.

### Component Tests

Test files:
- `src/components/VoiceRecorder.test.tsx`
- `src/components/RewritePanel.test.tsx`
- `src/components/SummaryPanel.test.tsx`
- `src/components/CompareView.test.tsx`

Coverage:
- VoiceRecorder: Test record button click, transcript display, insert button, and error states.
- RewritePanel: Test preset selection, custom instruction input, rewrite trigger, and result display.
- SummaryPanel: Test mode selection, reading level selection, summarize trigger, and result display.
- CompareView: Test side-by-side display, accept button, reject button, and copy to clipboard.

Pass criteria:
- All component tests pass.
- User interactions trigger expected state changes.
- Error states render correctly.

### End-to-End Tests

Test files:
- `tests/e2e/voice-to-draft.spec.ts`
- `tests/e2e/summarize-selection.spec.ts`
- `tests/e2e/rewrite-selection.spec.ts`
- `tests/e2e/insert-in-place.spec.ts`

Coverage:
- Voice to draft: Open panel, click record, mock speech stream, verify transcript, click insert, verify text in field.
- Summarize selection: Select text on page, click summarize in mini bar, choose mode, verify summary, click accept.
- Rewrite selection: Select text on page, click rewrite in mini bar, choose preset, verify rewrite, click accept, verify replacement.
- Insert in place: Verify text insertion in textarea, contenteditable, and fallback to clipboard for unsupported editors.

Pass criteria:
- All end-to-end tests pass in a fresh Chrome profile.
- No console errors during test execution.
- All user flows complete successfully.

### Running Tests

Unit and component tests:
```bash
npm test
```

End-to-end tests:
```bash
npm run test:e2e
```

Coverage report:
```bash
npm run test:coverage
```

## 14. Build and Packaging

### Build with Vite

Run the build command:
```bash
npm run build
```

Output:
- All files are bundled into the `dist/` folder.
- Manifest, icons, and HTML files are copied to `dist/`.
- TypeScript is compiled to JavaScript.
- CSS is bundled and minified.

Verify bundle size:
```bash
du -sh dist/
```

The total size must be under 1 MB compressed.

### Load as Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" button.
4. Select the `dist/` folder from the project directory.
5. The extension icon appears in the toolbar.
6. Click the icon to open the side panel.

### Zip for Submission

Create a zip file of the `dist/` folder:
```bash
cd dist
zip -r ../flint-extension.zip .
cd ..
```

The `flint-extension.zip` file is ready for submission.

### Record Demo

1. Create a fresh Chrome profile to avoid conflicts with other extensions.
2. Load the extension as unpacked in the fresh profile.
3. Open a test page with a text field.
4. Record the following flows:
   - Open side panel and capture voice to draft.
   - Select text and summarize with bullets mode.
   - Select text and rewrite with formal tone.
   - Accept rewrite and verify text replacement.
5. Use screen recording software to capture the demo.
6. Keep the video under 3 minutes.

## 15. Acceptance Criteria and Definition of Done

### Installation and Setup

- [ ] Extension installs without errors in Chrome 128 or later.
- [ ] Side panel opens when clicking the extension icon.
- [ ] No console errors appear during installation or first launch.

### Voice to Draft

- [ ] Record button starts speech recognition.
- [ ] Partial transcripts stream to the UI in real-time.
- [ ] Final transcript appears when recording stops.
- [ ] Insert button places transcript at caret position in a text field.
- [ ] Microphone indicator is visible during recording.

### Summarize Selection

- [ ] User can select text on a web page.
- [ ] Mini bar appears near the selection.
- [ ] Clicking summarize opens the summary panel.
- [ ] Summary is generated in the selected mode (bullets, paragraph, outline).
- [ ] Summary respects the selected reading level.

### Rewrite Selection

- [ ] User can select text on a web page.
- [ ] Clicking rewrite opens the rewrite panel.
- [ ] Preset buttons trigger rewrite with the correct tone.
- [ ] Custom instruction field allows free-form prompts.
- [ ] Compare view shows original and rewritten text side by side.
- [ ] Accept button replaces the original text in the source field.

### Insert in Place

- [ ] Text insertion works in textarea elements.
- [ ] Text insertion works in contenteditable elements.
- [ ] Fallback to clipboard copy works for unsupported editors.
- [ ] User receives a clear message when clipboard fallback is used.

### Quality Checks

- [ ] TypeScript compiles with zero errors in strict mode.
- [ ] ESLint passes with zero warnings.
- [ ] Prettier formatting is applied to all files.
- [ ] All unit tests pass with 80% coverage.
- [ ] All component tests pass.
- [ ] All end-to-end tests pass.
- [ ] Bundle size is under 1 MB compressed.

### Performance

- [ ] Side panel renders within 3 seconds of opening.
- [ ] Voice transcripts appear within 500 milliseconds of speech.
- [ ] Rewrite operations complete within 5 seconds for 1000 words.
- [ ] Button clicks provide visual feedback within 100 milliseconds.

### Privacy and Security

- [ ] All AI processing happens locally (except Web Speech API).
- [ ] Privacy notice is displayed in settings.
- [ ] No external network calls are made for text processing.
- [ ] Content Security Policy is enforced.

## 16. Stretch Ideas

### Translator Shortcut

Add a translate button to the mini bar that converts selected text to another language using the Prompt API. Integrate with the existing rewrite flow by adding a language selector dropdown. This would require storing the target language in settings and merging it into the prompt context.

### Proofreader Mode

Add a proofread preset to the rewrite panel that focuses on grammar, spelling, and punctuation corrections. Use the Rewriter API with a custom prompt that emphasizes error correction without changing tone or style. Display corrections with inline highlights in the compare view.

### Tone Analyzer

Add a tone analysis feature that evaluates the emotional tone of selected text (formal, casual, friendly, aggressive, neutral). Use the Prompt API to generate a tone report. Display the result as a badge or label in the summary panel. This helps users understand how their writing may be perceived.

### Markdown Export

Add an export button to the history panel that saves all history items as a markdown file. Include timestamps, original text, and results. Use the File System Access API to save the file locally. This allows users to archive their work for future reference.

### Theme Toggle

Add a quick theme toggle button to the side panel header that cycles between light, dark, and system themes. Store the preference in settings and apply it immediately without requiring a page reload. This improves accessibility for users who prefer different visual modes.

## 17. References

### Chrome Built-in AI APIs

- Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Summarizer API: https://developer.chrome.com/docs/ai/summarizer-api
- Rewriter API: https://developer.chrome.com/docs/ai/rewriter-api

### Web APIs

- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

### Chrome Extension APIs

- Manifest V3 concepts: https://developer.chrome.com/docs/extensions/develop
- Side panel: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Content Security Policy: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

### Hackathon

- Hackathon rules: https://googlechromeai2025.devpost.com/rules
- Hackathon resources: https://googlechromeai2025.devpost.com/resources
- Hackathon overview: https://googlechromeai2025.devpost.com/
