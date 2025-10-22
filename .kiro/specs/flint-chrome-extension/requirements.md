# Requirements Document

## Introduction

Flint is a Chrome extension that enables voice-to-text capture, text summarization, and text rewriting directly within web pages. The system processes all text operations locally using Chrome's built-in AI APIs (Prompt API, Summarizer API, and Rewriter API). Voice recognition uses the Web Speech API. The extension operates as a Manifest V3 Chrome extension with a side panel interface, content scripts for text manipulation, and a background service worker for coordination.

## Glossary

- **Flint System**: The complete Chrome extension including side panel, content scripts, and background service worker
- **Side Panel**: The main user interface displayed in Chrome's side panel area
- **Content Script**: JavaScript code injected into web pages to detect selections and manipulate text
- **Mini Bar**: A small toolbar that appears near text selections on web pages
- **Web Speech API**: Browser API for speech recognition that may use network-based services
- **Chrome Built-in AI**: Local AI APIs provided by Chrome (Prompt, Summarizer, Rewriter)
- **User Activation**: A user gesture such as a button click required by Chrome AI APIs
- **Pinned Note**: User-created guidance text for audience and tone that merges into AI prompts
- **Session History**: Record of past voice, summarize, and rewrite operations
- **Mock Provider**: Fallback implementation that provides example outputs when AI APIs are unavailable

## Requirements

### Requirement 1: Voice Capture and Transcription

**User Story:** As a content writer, I want to speak my draft ideas into any text field so that I can capture thoughts without typing.

#### Acceptance Criteria

1.1 WHEN the user clicks the record button, THE Flint System SHALL start speech recognition using the Web Speech API

1.2 WHILE speech recognition is active, THE Flint System SHALL display a visual microphone indicator

1.3 WHILE the user is speaking, THE Flint System SHALL stream partial transcription results to the user interface within 500 milliseconds

1.4 WHEN the user clicks the stop button, THE Flint System SHALL finalize the transcript and stop speech recognition

1.5 WHEN speech recognition produces a final transcript, THE Flint System SHALL display a confidence indicator with the result

1.6 WHEN the user clicks the insert button, THE Flint System SHALL place the transcript at the caret position in the active text field

1.7 IF microphone permission is denied, THEN THE Flint System SHALL display the message "Microphone permission denied. Please allow access in browser settings."

1.8 IF no speech is detected within 10 seconds, THEN THE Flint System SHALL display the message "No speech detected. Please try again."

1.9 IF a network error occurs during speech recognition, THEN THE Flint System SHALL display the message "Network error. Please check your connection and try again."

### Requirement 2: Text Summarization

**User Story:** As a student, I want to select a long article and get a bullet-point summary so that I can quickly understand the main points.

#### Acceptance Criteria

2.1 WHEN the user selects text on a web page, THE Flint System SHALL display the Mini Bar within 200 milliseconds

2.2 WHEN the user clicks the summarize button in the Mini Bar, THE Flint System SHALL open the summary panel with the selected text

2.3 WHEN the user chooses a summary mode, THE Flint System SHALL generate a summary using the Chrome Summarizer API in the selected format (bullets, paragraph, or outline)

2.4 WHEN the user selects a reading level, THE Flint System SHALL generate a summary appropriate for the selected level (elementary, middle school, high school, or college)

2.5 WHERE Pinned Notes exist, THE Flint System SHALL merge the pinned note content into the summarization context

2.6 WHEN the summary generation completes, THE Flint System SHALL display the result in the summary panel within 5 seconds for inputs under 1000 words

2.7 IF the Chrome Summarizer API is unavailable, THEN THE Flint System SHALL use the Mock Provider and display the message "AI features require Chrome 128 or later with Gemini Nano enabled."

2.8 IF User Activation is not present, THEN THE Flint System SHALL display the message "Please click the button again to continue."

### Requirement 3: Text Rewriting

**User Story:** As a professional, I want to rewrite my casual email draft in a formal tone so that it matches business communication standards.

#### Acceptance Criteria

3.1 WHEN the user selects text on a web page, THE Flint System SHALL display the Mini Bar within 200 milliseconds

3.2 WHEN the user clicks the rewrite button in the Mini Bar, THE Flint System SHALL open the rewrite panel with the selected text

3.3 WHEN the user selects a preset option (clarify, simplify, concise, expand, friendly, formal, poetic, or persuasive), THE Flint System SHALL generate rewritten text using the Chrome Rewriter API with the corresponding tone

3.4 WHERE the user enters a custom instruction, THE Flint System SHALL generate rewritten text using the custom prompt

3.5 WHERE Pinned Notes exist, THE Flint System SHALL merge the pinned note content into the rewrite context

3.6 WHEN the rewrite generation completes, THE Flint System SHALL display the result within 5 seconds for inputs under 1000 words

3.7 IF the Chrome Rewriter API is unavailable, THEN THE Flint System SHALL use the Chrome Prompt API as a fallback

3.8 IF both Chrome Rewriter API and Prompt API are unavailable, THEN THE Flint System SHALL use the Mock Provider and display the message "AI features require Chrome 128 or later with Gemini Nano enabled."

### Requirement 4: Text Comparison and Replacement

**User Story:** As a blogger, I want to compare the original and rewritten versions side by side so that I can choose the best phrasing.

#### Acceptance Criteria

4.1 WHEN rewritten text is generated, THE Flint System SHALL display the original and rewritten text side by side in a comparison view

4.2 WHEN the user clicks the accept button, THE Flint System SHALL replace the original text in the source field with the rewritten text

4.3 WHEN the source field is a textarea element, THE Flint System SHALL replace the text and preserve the caret position

4.4 WHEN the source field is a contenteditable element, THE Flint System SHALL replace the text and preserve formatting where possible

4.5 IF text replacement fails in the source field, THEN THE Flint System SHALL copy the rewritten text to the clipboard and display the message "Unable to replace text automatically. The result has been copied to your clipboard."

4.6 WHEN the user clicks the reject button, THE Flint System SHALL discard the rewritten text and close the comparison view

### Requirement 5: Pinned Notes Management

**User Story:** As a marketing professional, I want to save audience and tone guidance so that all my rewrites maintain consistent brand voice.

#### Acceptance Criteria

5.1 WHEN the user creates a pinned note, THE Flint System SHALL store the note in IndexedDB with a unique identifier, title, content, and timestamp

5.2 WHEN the user edits a pinned note, THE Flint System SHALL update the note content and timestamp in IndexedDB

5.3 WHEN the user deletes a pinned note, THE Flint System SHALL remove the note from IndexedDB

5.4 WHEN the user triggers a summarize or rewrite operation, THE Flint System SHALL merge all pinned note content into the AI prompt context

5.5 THE Flint System SHALL display pinned notes in the settings panel for viewing and editing

### Requirement 6: Settings and Preferences

**User Story:** As a privacy-conscious user, I want all AI processing to happen locally so that my sensitive content never leaves my device.

#### Acceptance Criteria

6.1 THE Flint System SHALL provide a local-only mode toggle that disables network-dependent features

6.2 THE Flint System SHALL allow the user to select a preferred language for speech recognition from available options

6.3 THE Flint System SHALL provide theme options (light, dark, and system default) that apply immediately to the user interface

6.4 THE Flint System SHALL allow the user to configure keyboard shortcuts for common actions

6.5 THE Flint System SHALL display a privacy notice stating "Speech recognition uses the Web Speech API, which may send audio to a network-based service for transcription."

6.6 THE Flint System SHALL store all settings in chrome.storage.local for persistence across sessions

### Requirement 7: Session History

**User Story:** As a researcher, I want to review my past summarization and rewriting operations so that I can reference previous work.

#### Acceptance Criteria

7.1 WHEN the user completes a voice, summarize, or rewrite operation, THE Flint System SHALL save the operation details to IndexedDB with original text, result text, operation type, and timestamp

7.2 THE Flint System SHALL display session history in the history panel sorted by timestamp with newest items first

7.3 WHEN the user searches history, THE Flint System SHALL filter history items by text content matching the search query

7.4 WHEN the user clicks a history item, THE Flint System SHALL display full details in a modal view

7.5 WHEN the user clicks clear all history, THE Flint System SHALL prompt for confirmation before deleting all history items

7.6 WHEN history items are older than 30 days, THE Flint System SHALL automatically delete them

7.7 IF IndexedDB storage exceeds 40 megabytes, THEN THE Flint System SHALL delete the oldest history items until storage is below 40 megabytes

### Requirement 8: Performance and Bundle Size

**User Story:** As a user with limited bandwidth, I want the extension to load quickly and use minimal storage so that it does not slow down my browser.

#### Acceptance Criteria

8.1 THE Flint System SHALL render the side panel within 3 seconds of the user opening it

8.2 THE Flint System SHALL provide visual feedback within 100 milliseconds of any button click

8.3 THE Flint System SHALL have a combined compressed bundle size not exceeding 1 megabyte for the panel and content script

8.4 WHEN the user speaks during voice capture, THE Flint System SHALL display partial transcripts within 500 milliseconds

8.5 WHEN the user triggers a rewrite operation with input under 1000 words, THE Flint System SHALL complete the operation within 5 seconds

### Requirement 9: Accessibility

**User Story:** As a user who relies on keyboard navigation, I want to access all features without using a mouse so that I can work efficiently.

#### Acceptance Criteria

9.1 THE Flint System SHALL make all interactive elements keyboard navigable using standard tab navigation

9.2 THE Flint System SHALL provide ARIA labels for all buttons and controls

9.3 THE Flint System SHALL display clear focus indicators on all interactive elements

9.4 THE Flint System SHALL meet WCAG 2.1 AA color contrast standards for all text and UI elements

9.5 WHEN the Flint System changes state, THE Flint System SHALL provide screen reader announcements for the state change

### Requirement 10: Error Handling and Fallbacks

**User Story:** As a user on an older Chrome version, I want clear guidance when features are unavailable so that I understand what I need to do.

#### Acceptance Criteria

10.1 WHEN the Flint System detects that Chrome Built-in AI is unavailable, THE Flint System SHALL display the message "AI features require Chrome 128 or later with Gemini Nano enabled." and provide a link to instructions

10.2 WHERE Chrome Built-in AI is unavailable, THE Flint System SHALL use the Mock Provider to demonstrate functionality with example outputs

10.3 IF User Activation is required but not present, THEN THE Flint System SHALL display the message "Action requires a click. Please try again."

10.4 IF IndexedDB quota is exceeded, THEN THE Flint System SHALL automatically delete the oldest history items and display the message "Storage limit reached. Oldest history items have been removed."

10.5 WHEN any error occurs, THE Flint System SHALL log the error details to the console for debugging purposes

10.6 THE Flint System SHALL handle all errors gracefully without crashing or leaving the user interface in a broken state
