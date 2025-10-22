---
inclusion: always
---

# Flint Chrome Extension — Development Guide

Flint is a local-first Chrome extension for voice-to-text, text summarization, and rewriting using Chrome's built-in AI APIs.

## Tech Stack

- React + TypeScript + Vite
- Chrome Extension Manifest V3
- Jest + React Testing Library + Playwright (tests only when requested)

## Non-Negotiable Constraints

1. Manifest V3 only (no V2 APIs)
2. Local-first: no external servers or network calls
3. Bundle size: max 1 MB compressed (panel + content script combined)
4. TypeScript strict mode must pass with zero errors
5. ESLint + Prettier must pass with zero warnings

## File Structure

```
src/
├── background/background.ts
├── content/contentScript.ts, selection.ts, caret.ts, injector.ts
├── panel/index.html, panel.tsx, panel.css
├── components/VoiceRecorder.tsx, RewritePanel.tsx, SummaryPanel.tsx, CompareView.tsx, MiniBar.tsx, Settings.tsx
├── services/ai.ts, speech.ts, storage.ts, permissions.ts, telemetry.ts
├── state/store.ts, actions.ts, selectors.ts
└── utils/dom.ts, id.ts, throttle.ts
```

## Core Modules

### `services/ai.ts`

Single abstraction for Chrome built-in AI APIs with capability detection and mock fallback.

**Required functions:**
- `summarize(text, options)` — options: `{ mode, readingLevel, pinnedNotes }`, modes: bullets, paragraph, outline
- `rewrite(text, options)` — options: `{ tone, makeConcise, expand, readingLevel, userPrompt, pinnedNotes }`

**Implementation rules:**
- Check availability before creating sessions: `await LanguageModel.availability()`
- Always provide mock provider when built-in AI unavailable
- Handle user activation requirements for API calls

### `services/speech.ts`

Event-driven speech recognition using Web Speech API.

**Required interface:**
- `start()`, `stop()`, partial result callback
- Stream partial transcripts to UI in real-time
- Include mock for testing and offline demo

**Note:** Web Speech API may use server-based recognition; include privacy notice.

### `content/selection.ts` & `content/caret.ts`

Text selection and insertion handlers for content scripts.

**Requirements:**
- Capture text selections and caret positions accurately
- Support both `<textarea>` and `contenteditable` elements
- Fallback to clipboard copy for unsupported editors (with user notification)
- Preserve formatting where possible

### `services/storage.ts`

Persistent storage abstraction.

**Storage strategy:**
- `chrome.storage.local` for settings and preferences
- IndexedDB for pinned notes and session history
- Handle quota errors gracefully with user feedback

## Manifest V3 Requirements

**Required permissions:** `storage`, `activeTab`, `scripting`

**Required host_permissions:** `<all_urls>` (for content script injection)

**Architecture components:**
- Background service worker (`src/background/background.ts`)
- Content scripts (on-demand injection via `chrome.scripting.registerContentScripts`)
- Side panel UI (`panel/index.html`)

## Code Style

**React:**
- Functional components with hooks only (no class components)
- Named exports (avoid default exports)

**Functions:**
- Small, single-purpose functions (max 50 lines)
- Descriptive variable names (no abbreviations like `txt`, `btn`, `usr`)

**Documentation:**
- JSDoc comments for all public APIs and exported functions
- Include `@param` and `@returns` tags

## Testing (Only When Requested)

**Do NOT add tests unless explicitly requested by the user.**

When tests are requested:
- Unit: Jest for service modules (`ai.ts`, `speech.ts`, `selection.ts`, `caret.ts`)
- Component: React Testing Library for UI components
- E2E: Playwright for full workflows (select text → rewrite → replace)
- Always mock external APIs (speech, AI) in tests

## Definition of Done

1. Zero TypeScript errors (strict mode) and zero lint warnings
2. Loads as unpacked extension in Chrome without console errors
3. Side panel opens and renders correctly
4. Voice recording and transcription work (mock or real API)
5. Text selection, rewriting, and insertion work in test pages
6. Bundle size under 1 MB compressed
7. All tests pass (if tests were added)

## Product Flows

### Voice to Draft

User opens panel → presses record → partial text streams → final text on stop → insert at caret or edit in panel

### Summarize Selection

User selects text → clicks summarize in mini bar → choose mode → accept result

### Rewrite Selection

User selects text → clicks rewrite → choose preset or custom prompt → compare → accept to replace in place

## UI Surfaces

- Mini bar near caret with record, summarize, rewrite buttons
- Side panel with tabs: Voice, Rewrite, Summary, History
- Settings page: language, theme, local-only mode, shortcuts

## Development Workflow

1. Start with minimal working implementation
2. Ensure TypeScript compiles cleanly at each step (run `tsc --noEmit` to verify)
3. Do NOT add tests unless explicitly requested by user
4. Test in actual Chrome browser as unpacked extension, not just build verification
5. Use mock providers when built-in AI unavailable

## Fallback Strategies

**When built-in AI unavailable:**
- Use mock provider with clear UI notice to user
- Provide example outputs that demonstrate functionality

**When text replacement fails:**
- Fall back to clipboard copy with user guidance message
- Log specific error for debugging

**When handling long selections:**
- Truncate selections over 10,000 characters
- Prompt user to summarize first, then rewrite summary