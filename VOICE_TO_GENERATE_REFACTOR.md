# Voice to Generate Panel Refactor

## Summary

Replaced the dedicated Transcribe/Voice panel with a new Generate panel, and moved voice recording functionality to inline buttons in Rewrite and Summary panels.

## Changes Made

### 1. New Components

#### `src/components/GeneratePanel.tsx`
- New panel for text generation using Writer API
- Prompt input field for user instructions
- Generated text output field (editable)
- Uses Writer API (with Prompt API fallback)
- Supports pinned notes context
- Mock provider fallback when APIs unavailable

#### `src/components/VoiceButton.tsx`
- Compact, reusable voice recording button
- Shows partial transcript in tooltip
- Error handling with tooltip display
- Can be embedded in any panel

### 2. Updated Components

#### `src/components/RewritePanel.tsx`
- Added VoiceButton to action button group
- Voice transcript appends to current version text

#### `src/components/SummaryPanel.tsx`
- Added VoiceButton to action button group
- Voice transcript appends to current version text

#### `src/panel/panel.tsx`
- Replaced VoiceRecorder import with GeneratePanel
- Updated navigation items: Generate, Rewrite, Summary, History, Settings
- Changed 'voice' tab to 'generate' tab
- Updated message handler: OPEN_VOICE_TAB → OPEN_GENERATE_TAB

### 3. Updated Services

#### `src/services/ai.ts`
- Added `GenerateOptions` interface
- Added `generate()` method using Writer API
- Added Writer API availability check
- Added mock generate implementation
- Updated `AIAvailability` interface to include `writerAPI`

### 4. Updated State Management

#### `src/state/store.ts`
- Changed Tab type: 'voice' → 'generate'
- Updated initial state to include writerAPI availability

#### `src/state/AppProvider.tsx`
- Added writerAPI to error fallback availability object

### 5. Updated Background & Content Scripts

#### `src/background/background.ts`
- Changed message type: OPEN_VOICE_TAB → OPEN_GENERATE_TAB
- Updated comments to reference Generate tab

#### `src/content/contentScript.ts`
- Updated record button to send OPEN_GENERATE_TAB message

## User Experience Changes

### Before
- Dedicated Voice tab for transcription
- Voice recording isolated from other workflows
- Manual copy/paste to use transcripts in other panels

### After
- Generate panel for AI-powered text creation
- Voice recording available directly in Rewrite and Summary panels
- Voice transcripts automatically append to text being edited
- Unified workflow: dictate → edit → process

## Benefits

1. **Better Integration**: Voice input is now contextual and available where needed
2. **New Capability**: Generate panel adds Writer API functionality for creating new content
3. **Streamlined UX**: All three panels (Generate, Rewrite, Summary) work together seamlessly
4. **Less Navigation**: No need to switch tabs to use voice input

## API Usage

- **Generate Panel**: Writer API → Prompt API fallback → Mock
- **Rewrite Panel**: Rewriter API → Prompt API fallback → Mock
- **Summary Panel**: Summarizer API → Mock
- **Voice Button**: Web Speech API (in both Rewrite and Summary)

## Build Status

✅ TypeScript compilation: PASSED
✅ Vite build: PASSED
✅ Bundle size: 260.87 kB (69.48 kB gzipped)
