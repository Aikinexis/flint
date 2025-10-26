# Implementation Plan

This plan breaks down the Flint Chrome extension into small, actionable tasks. Each task should take 1-2 hours and includes specific files to create or modify, along with a suggested commit message.

## Phase 1: Project Setup and Foundation

- [x] 1. Initialize project structure and dependencies
  - Create project directory with folder structure
  - Initialize npm project with `package.json`
  - Install core dependencies: React, TypeScript, Vite
  - Install dev dependencies: ESLint, Prettier, TypeScript types
  - Create basic `tsconfig.json` with strict mode
  - Create `.eslintrc.js` and `.prettierrc` config files
  - _Requirements: 8.1, 8.3_
  - _Commit: "chore: initialize project with TypeScript, React, and Vite"_

- [x] 2. Configure Vite for Chrome extension build
  - Create `vite.config.ts` with multi-entry build configuration
  - Configure separate entry points for panel, background, and content script
  - Set up output paths to match extension structure
  - Configure build options (minify, target ES2020, no sourcemaps)
  - Add build scripts to `package.json` (dev, build, type-check)
  - _Requirements: 8.3_
  - _Commit: "build: configure Vite for Chrome extension multi-entry build"_

- [x] 3. Create manifest.json and basic extension structure
  - Create `manifest.json` with Manifest V3 configuration
  - Define permissions: storage, scripting, activeTab
  - Configure side panel with default path
  - Set up background service worker entry
  - Add host_permissions for all URLs
  - Define content security policy
  - Create placeholder icon files (16px, 48px, 128px)
  - _Requirements: 6.6, 10.6_
  - _Commit: "feat: add Manifest V3 configuration and extension structure"_


## Phase 2: Design System and Styling

- [x] 4. Create design tokens and CSS variables
  - Create `src/styles/tokens.css` with all CSS custom properties
  - Define dark mode colors, typography, spacing, shadows
  - Add `.light` class overrides for light mode
  - Add `.accent-comp` class for blue accent toggle
  - Define component primitives (flint-bg, flint-surface, flint-card)
  - Define button styles (flint-btn, primary, ghost)
  - Define input styles (flint-input with focus states)
  - Define toolbar and minibar styles
  - _Requirements: 6.3, 9.4_
  - _Commit: "style: add design tokens with dark/light modes and accent toggle"_

- [x] 5. Configure Tailwind CSS with design tokens
  - Install Tailwind CSS and dependencies
  - Create `tailwind.config.cjs` with custom theme
  - Map CSS variables to Tailwind utilities
  - Configure content paths for React components
  - Add custom border radius, colors, shadows
  - Create `src/styles/index.css` and import tokens
  - Add Tailwind directives (@tailwind base, components, utilities)
  - _Requirements: 9.4_
  - _Commit: "style: configure Tailwind with design token integration"_

## Phase 3: Core Services Layer

- [x] 6. Create utility modules
  - Create `src/utils/id.ts` with UUID generation function
  - Create `src/utils/throttle.ts` with throttle and debounce functions
  - Create `src/utils/dom.ts` with DOM helper functions
  - Add TypeScript types and JSDoc comments
  - Write simple unit tests for utilities
  - _Requirements: 8.2_
  - _Commit: "feat: add utility modules for ID generation and DOM helpers"_

- [x] 7. Implement storage service foundation
  - Create `src/services/storage.ts` with StorageService interface
  - Implement chrome.storage.local wrapper for settings
  - Add getSettings() and saveSettings() methods
  - Define Settings TypeScript interface
  - Add error handling for storage quota
  - _Requirements: 6.6, 10.4_
  - _Commit: "feat: implement chrome.storage wrapper for settings"_

- [x] 8. Implement IndexedDB for history and notes
  - Add IndexedDB initialization in storage service
  - Create database schema for pinnedNotes and history object stores
  - Implement getPinnedNotes(), savePinnedNote(), deletePinnedNote()
  - Implement getHistory(), saveHistoryItem(), searchHistory()
  - Add cleanupOldHistory() for 30-day auto-deletion
  - Handle quota exceeded errors
  - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.6, 7.7, 10.4_
  - _Commit: "feat: add IndexedDB storage for pinned notes and history"_

- [x] 9. Create AI service with availability checks
  - Create `src/services/ai.ts` with AIService interface
  - Implement checkAvailability() for Prompt, Summarizer, Rewriter APIs
  - Add TypeScript interfaces for AIAvailability, SummaryOptions, RewriteOptions
  - Implement basic error handling structure
  - Add user activation check helper
  - Add prompt(), summarize(), and rewrite() methods
  - Implement MockAIProvider for graceful fallback
  - Add pinned notes merging into AI context
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 10.1, 10.2, 10.3_
  - _Commit: "feat: implement complete AI service with all APIs and mock fallback"_

- [x] 10. Implement Prompt API integration
  - Completed as part of task 9
  - _Requirements: 3.7, 8.5, 10.3_

- [x] 11. Implement Summarizer API integration
  - Completed as part of task 9
  - _Requirements: 2.3, 2.4, 2.6, 2.7, 10.1_

- [x] 12. Implement Rewriter API integration
  - Completed as part of task 9
  - _Requirements: 3.3, 3.4, 3.6, 3.7, 10.1_

- [x] 13. Create mock AI provider for fallback
  - Completed as part of task 9
  - _Requirements: 2.7, 3.8, 10.1, 10.2_

- [x] 14. Implement pinned notes merging into prompts
  - Completed as part of task 9
  - _Requirements: 2.5, 3.5, 5.4_
  - _Commit: "feat: merge pinned notes into AI prompt context"_

- [x] 15. Create speech recognition service
  - Create `src/services/speech.ts` with SpeechService interface
  - Check for SpeechRecognition API support
  - Implement start() method with language configuration
  - Set up interim results and continuous options
  - Implement stop() method
  - Add event callbacks: onPartialResult, onFinalResult, onError
  - _Requirements: 1.1, 1.3, 1.4_
  - _Commit: "feat: create speech recognition service wrapper"_

- [x] 16. Add speech error handling and confidence
  - Map speech error types to user-friendly messages
  - Handle 'no-speech', 'audio-capture', 'not-allowed', 'network' errors
  - Extract confidence score from final results
  - Implement timeout for no speech detected (10 seconds)
  - Add error callback with specific error types
  - _Requirements: 1.5, 1.7, 1.8, 1.9_
  - _Commit: "feat: add speech error handling and confidence scoring"_


## Phase 4: Content Scripts

- [x] 17. Create selection handler module
  - Create `src/content/selection.ts` with SelectionHandler interface
  - Implement getSelectedText() using window.getSelection()
  - Implement getSelectionRange() for Range capture
  - Add onSelectionChange() listener for selectionchange event
  - Implement isEditableSelection() to detect textarea/contenteditable
  - Handle empty selections and edge cases
  - _Requirements: 2.1, 3.1, 4.1_
  - _Commit: "feat: create text selection handler for content script"_

- [x] 18. Create caret position handler
  - Create `src/content/caret.ts` with CaretHandler interface
  - Implement getCaretPosition() for textarea and contenteditable
  - Use selectionStart/selectionEnd for textarea elements
  - Use Selection and Range APIs for contenteditable
  - Add supportsInsertion() to check element compatibility
  - _Requirements: 1.6, 4.3, 4.4_
  - _Commit: "feat: add caret position detection for text insertion"_

- [x] 19. Implement text insertion at caret
  - Add insertAtCaret() method to CaretHandler
  - Handle textarea: insert at selectionStart, update caret position
  - Handle contenteditable: create text node, insert at range
  - Preserve caret position after insertion
  - Trigger input event for form validation
  - _Requirements: 1.6, 4.3_
  - _Commit: "feat: implement text insertion at caret position"_

- [x] 20. Implement text replacement in selections
  - Add replaceSelection() method to CaretHandler
  - Handle textarea: replace between selectionStart and selectionEnd
  - Handle contenteditable: delete range contents, insert new text
  - Preserve formatting in contenteditable where possible
  - Update selection to highlight replaced text
  - _Requirements: 4.2, 4.3, 4.4_
  - _Commit: "feat: add text replacement for selected content"_

- [x] 21. Add clipboard fallback for unsupported editors
  - Detect when direct insertion fails (Google Docs, complex editors)
  - Use navigator.clipboard.writeText() as fallback
  - Show user notification when fallback is used
  - Log specific error for debugging
  - Return success/failure status
  - _Requirements: 4.5_
  - _Commit: "feat: add clipboard fallback for complex editors"_

- [x] 22. Create mini bar injector
  - Create `src/content/injector.ts` with MiniBarInjector interface
  - Create shadow DOM for style isolation
  - Implement show() to inject mini bar near selection
  - Calculate position above or below selection
  - Add HTML structure with 4 icon buttons
  - Apply flint-minibar styles from tokens
  - _Requirements: 2.1, 3.1_
  - _Commit: "feat: create mini bar injector with shadow DOM"_

- [x] 23. Add mini bar positioning and auto-hide
  - Implement positioning logic to avoid covering text
  - Handle viewport boundaries (flip above/below)
  - Add auto-hide after 5 seconds of inactivity
  - Keep visible while hovering
  - Reposition on scroll events
  - Implement hide() to remove mini bar
  - _Requirements: 2.1_
  - _Commit: "feat: add mini bar positioning and auto-hide behavior"_

- [x] 24. Create main content script coordinator
  - Create `src/content/contentScript.ts` as entry point
  - Initialize SelectionHandler, CaretHandler, MiniBarInjector
  - Listen for selectionchange events
  - Show mini bar when text is selected
  - Set up message listener for commands from panel
  - Handle GET_SELECTION, INSERT_TEXT, REPLACE_TEXT messages
  - _Requirements: 2.1, 3.1, 4.2_
  - _Commit: "feat: create content script coordinator with message handling"_

- [x] 25. Add content script message handlers
  - Implement handler for GET_SELECTION message
  - Implement handler for INSERT_TEXT message
  - Implement handler for REPLACE_TEXT message
  - Implement handler for SHOW_MINI_BAR message
  - Send responses back through chrome.runtime.sendMessage
  - Add error handling for each message type
  - _Requirements: 1.6, 4.2_
  - _Commit: "feat: add message handlers for panel-content communication"_


## Phase 5: Background Service Worker

- [x] 26. Create background service worker
  - Create `src/background/background.ts` as service worker entry
  - Add chrome.runtime.onInstalled listener for setup
  - Register content scripts dynamically with chrome.scripting
  - Set up message routing between panel and content scripts
  - Add chrome.runtime.onMessage listener
  - _Requirements: 6.6_
  - _Commit: "feat: create background service worker with message routing"_

- [x] 27. Implement dynamic content script registration
  - Use chrome.scripting.registerContentScripts API
  - Register content script for all URLs
  - Set runAt to document_idle
  - Handle registration errors gracefully
  - Add unregister on extension update
  - _Requirements: 6.6_
  - _Commit: "feat: add dynamic content script registration"_

- [x] 28. Add message forwarding logic
  - Forward messages from panel to active tab's content script
  - Forward responses from content script back to panel
  - Use chrome.tabs.query to find active tab
  - Use chrome.tabs.sendMessage for content script communication
  - Handle cases where content script is not injected
  - Add error handling for message failures
  - _Requirements: 1.6, 4.2_
  - _Commit: "feat: implement message forwarding between panel and content"_

## Phase 6: State Management

- [x] 29. Create application state store
  - Create `src/state/store.ts` with AppState interface
  - Set up React Context for state management
  - Define initial state with all properties
  - Create Provider component to wrap app
  - Add useAppState hook for components
  - _Requirements: 6.1, 6.2, 6.3_
  - _Commit: "feat: create application state store with React Context"_

- [x] 30. Define state actions
  - Create `src/state/actions.ts` with action creators
  - Add setActiveTab, setSettings, setCurrentText actions
  - Add addPinnedNote, updatePinnedNote, deletePinnedNote actions
  - Add addHistoryItem, clearHistory actions
  - Add setError, checkAIAvailability actions
  - Implement reducer or state update logic
  - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.5_
  - _Commit: "feat: define state actions for app operations"_

- [x] 31. Create state selectors
  - Create `src/state/selectors.ts` with selector functions
  - Add selectors for activeTab, settings, pinnedNotes
  - Add selectors for history, currentText, aiAvailability
  - Add computed selectors (filtered history, etc.)
  - Use memoization for expensive computations
  - _Requirements: 7.3_
  - _Commit: "feat: add state selectors for component access"_

- [x] 32. Integrate storage with state
  - Load settings from chrome.storage on app init
  - Load pinned notes from IndexedDB on app init
  - Load recent history from IndexedDB on app init
  - Save settings to storage when changed
  - Save pinned notes to IndexedDB when modified
  - Save history items to IndexedDB after operations
  - _Requirements: 5.1, 6.6, 7.1_
  - _Commit: "feat: integrate persistent storage with app state"_


## Phase 7: React Components - Voice Recorder

- [x] 33. Create VoiceRecorder component structure
  - Create `src/components/VoiceRecorder.tsx` with component skeleton
  - Define VoiceRecorderProps interface
  - Set up component state (isRecording, transcript, confidence, error)
  - Add basic JSX structure with record button and transcript area
  - Apply flint-btn and flint-card styles
  - _Requirements: 1.1, 1.2_
  - _Commit: "feat: create VoiceRecorder component structure"_

- [x] 34. Implement recording controls
  - Add click handler for record button
  - Request microphone permission before starting
  - Call speechService.start() when recording starts
  - Show visual microphone indicator when active
  - Add pulsing animation to record button
  - Implement stop button to end recording
  - _Requirements: 1.1, 1.2, 1.7_
  - _Commit: "feat: add recording controls with permission handling"_

- [x] 35. Add real-time transcript streaming
  - Set up onPartialResult callback from speech service
  - Update partialTranscript state as results arrive
  - Display partial transcript in gray text
  - Set up onFinalResult callback
  - Update finalTranscript state with confidence score
  - Display final transcript in black text
  - _Requirements: 1.3, 1.4, 1.5_
  - _Commit: "feat: implement real-time transcript streaming"_

- [x] 36. Add insert and clear functionality
  - Create insert button (disabled until transcript is final)
  - Send INSERT_TEXT message to content script via background
  - Show success feedback after insertion
  - Create clear button to reset transcript
  - Clear both partial and final transcript state
  - Reset confidence and error state
  - _Requirements: 1.6_
  - _Commit: "feat: add insert and clear transcript functionality"_

- [x] 37. Implement voice error handling
  - Set up onError callback from speech service
  - Display error messages in UI (red text or banner)
  - Handle microphone permission denied error
  - Handle no speech detected error
  - Handle network error
  - Provide retry option after errors
  - _Requirements: 1.7, 1.8, 1.9_
  - _Commit: "feat: add error handling for speech recognition"_

## Phase 8: React Components - Rewrite Panel

- [x] 38. Create RewritePanel component structure
  - Create `src/components/RewritePanel.tsx` with component skeleton
  - Define RewritePanelProps interface
  - Set up component state (inputText, selectedPreset, customPrompt, isProcessing)
  - Add basic JSX structure with input area and preset buttons
  - Apply flint-input and flint-btn styles
  - _Requirements: 3.1, 3.2_
  - _Commit: "feat: create RewritePanel component structure"_

- [x] 39. Implement preset button selection
  - Create grid of preset buttons (clarify, simplify, concise, expand, friendly, formal, poetic, persuasive)
  - Make preset buttons mutually exclusive
  - Highlight selected preset
  - Clear custom prompt when preset is selected
  - Store selected preset in state
  - _Requirements: 3.3_
  - _Commit: "feat: add preset button selection with mutual exclusivity"_

- [x] 40. Add custom instruction field
  - Create textarea for custom instructions
  - Enable custom field when no preset is selected
  - Disable presets when custom field has content
  - Store custom prompt in state
  - Add placeholder text for guidance
  - _Requirements: 3.4_
  - _Commit: "feat: add custom instruction field for rewriting"_

- [x] 41. Implement rewrite operation
  - Create rewrite button (primary style)
  - Validate that text and (preset or custom prompt) are present
  - Show loading spinner during processing
  - Call aiService.rewrite() with options
  - Merge pinned notes into context
  - Handle timeout (5 seconds)
  - Store result in state
  - _Requirements: 3.3, 3.4, 3.5, 3.6_
  - _Commit: "feat: implement rewrite operation with AI service"_

- [x] 42. Add rewrite error handling
  - Display error messages from AI service
  - Handle AI unavailable error with clear message
  - Handle user activation required error
  - Handle timeout error
  - Provide retry option
  - Show mock provider notice when fallback is used
  - _Requirements: 3.7, 3.8, 10.1, 10.3_
  - _Commit: "feat: add error handling for rewrite operations"_

- [x] 43. Integrate with CompareView
  - Navigate to CompareView when rewrite completes
  - Pass original and rewritten text as props
  - Handle accept callback to replace text
  - Handle reject callback to return to rewrite panel
  - Clear processing state after navigation
  - _Requirements: 4.1_
  - _Commit: "feat: integrate RewritePanel with CompareView"_


## Phase 9: React Components - Summary Panel

- [x] 44. Create SummaryPanel component structure
  - Create `src/components/SummaryPanel.tsx` with component skeleton
  - Define SummaryPanelProps interface
  - Set up component state (inputText, mode, readingLevel, summary, isProcessing)
  - Add basic JSX structure with input area and mode selector
  - Apply flint-input and flint-btn styles
  - _Requirements: 2.2_
  - _Commit: "feat: create SummaryPanel component structure"_

- [x] 45. Implement mode and reading level selectors
  - Create radio buttons for mode (bullets, paragraph, outline)
  - Create dropdown for reading level (elementary, middle school, high school, college)
  - Set default values (bullets, high school)
  - Store selections in state
  - Apply selected styles to active options
  - _Requirements: 2.3, 2.4_
  - _Commit: "feat: add mode and reading level selectors"_

- [x] 46. Implement summarize operation
  - Create summarize button (primary style)
  - Validate that input text is present
  - Show loading spinner during processing
  - Call aiService.summarize() with mode and reading level
  - Merge pinned notes into context
  - Handle timeout (5 seconds)
  - Display summary in result area
  - _Requirements: 2.3, 2.4, 2.5, 2.6_
  - _Commit: "feat: implement summarize operation with AI service"_

- [x] 47. Add summary result display and copy
  - Create result area to display generated summary
  - Format summary based on mode (bullets, paragraph, outline)
  - Add copy to clipboard button
  - Show checkmark feedback for 2 seconds after copying
  - Handle copy errors gracefully
  - _Requirements: 2.6_
  - _Commit: "feat: add summary result display with copy functionality"_

- [x] 48. Add summary error handling
  - Display error messages from AI service
  - Handle AI unavailable error with clear message
  - Handle user activation required error
  - Handle timeout error
  - Provide retry option
  - Show mock provider notice when fallback is used
  - _Requirements: 2.7, 2.8, 10.1, 10.3_
  - _Commit: "feat: add error handling for summarize operations"_

## Phase 10: React Components - Compare View and Mini Bar

- [ ] 49. Create CompareView component
  - Create `src/components/CompareView.tsx` with component skeleton
  - Define CompareViewProps interface
  - Create two-column layout (50/50 split)
  - Display original text on left (read-only)
  - Display rewritten text on right (read-only)
  - Apply flint-card styles to text areas
  - _Requirements: 4.1_
  - _Commit: "feat: create CompareView component with side-by-side layout"_

- [ ] 50. Add accept and reject actions
  - Create accept button (green, primary style)
  - Create reject button (gray, ghost style)
  - Add copy to clipboard button
  - Implement accept callback to trigger text replacement
  - Implement reject callback to close view
  - Show success feedback after accept
  - _Requirements: 4.2, 4.6_
  - _Commit: "feat: add accept and reject actions to CompareView"_

- [ ] 51. Implement text replacement from CompareView
  - Send REPLACE_TEXT message to content script
  - Pass rewritten text and selection range
  - Handle success response from content script
  - Handle failure response (clipboard fallback)
  - Display appropriate user message
  - Close compare view after successful replacement
  - _Requirements: 4.2, 4.5_
  - _Commit: "feat: implement text replacement from CompareView"_

- [ ] 52. Create MiniBar component
  - Create `src/components/MiniBar.tsx` with component skeleton
  - Define MiniBarProps interface
  - Create horizontal layout with 4 icon buttons
  - Add record button (microphone icon)
  - Add summarize button (list icon)
  - Add rewrite button (edit icon)
  - Add close button (X icon)
  - Apply flint-minibar styles
  - _Requirements: 2.1, 3.1_
  - _Commit: "feat: create MiniBar component with action buttons"_

- [ ] 53. Implement MiniBar button actions
  - Add click handler for record button (open panel to Voice tab)
  - Add click handler for summarize button (open panel to Summary tab with selected text)
  - Add click handler for rewrite button (open panel to Rewrite tab with selected text)
  - Add click handler for close button (hide mini bar)
  - Send messages to background to coordinate with panel
  - _Requirements: 2.2, 3.2_
  - _Commit: "feat: implement MiniBar button actions and panel coordination"_


## Phase 11: React Components - Settings and History

- [ ] 54. Create Settings component structure
  - Create `src/components/Settings.tsx` with component skeleton
  - Define SettingsProps interface
  - Set up component state from app settings
  - Add basic JSX structure with grouped sections
  - Apply flint-card styles to sections
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Commit: "feat: create Settings component structure"_

- [ ] 55. Implement theme toggles
  - Add toggle switch for light mode
  - Toggle .light class on document.documentElement
  - Add toggle switch for complementary accent (blue)
  - Toggle .accent-comp class on document.documentElement
  - Save theme preferences to chrome.storage
  - Apply changes immediately without reload
  - _Requirements: 6.3_
  - _Commit: "feat: add theme toggles for light mode and accent color"_

- [ ] 56. Add language and local-only mode settings
  - Create dropdown for speech recognition language
  - Populate with available language options
  - Add toggle switch for local-only mode
  - Disable network-dependent features when enabled
  - Save preferences to chrome.storage
  - Update speech service with selected language
  - _Requirements: 6.1, 6.2_
  - _Commit: "feat: add language selector and local-only mode toggle"_

- [ ] 57. Implement keyboard shortcuts configuration
  - Create editable fields for keyboard shortcuts
  - Add shortcuts for: open panel, record, summarize, rewrite
  - Validate shortcuts for conflicts
  - Save shortcuts to chrome.storage
  - Register shortcuts with chrome.commands API
  - Show validation errors for invalid shortcuts
  - _Requirements: 6.4_
  - _Commit: "feat: add keyboard shortcuts configuration"_

- [ ] 58. Add privacy notice and pinned notes editor
  - Display privacy notice about Web Speech API
  - Make notice always visible (callout box style)
  - Create pinned notes list with add/edit/delete buttons
  - Implement add note dialog with title and content fields
  - Implement edit note dialog
  - Implement delete note with confirmation
  - Save notes to IndexedDB via storage service
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.5_
  - _Commit: "feat: add privacy notice and pinned notes editor"_

- [ ] 59. Create History component
  - Create `src/components/History.tsx` (can be part of Settings or separate tab)
  - Display list of history items sorted by timestamp (newest first)
  - Show operation type, timestamp, and preview of text
  - Apply flint-card styles to history items
  - Add search field to filter history
  - _Requirements: 7.2, 7.3_
  - _Commit: "feat: create History component with search"_

- [ ] 60. Implement history item details and clear
  - Add click handler to show full history item details in modal
  - Display original text, result text, and metadata
  - Add copy buttons for original and result
  - Create clear all history button
  - Show confirmation dialog before clearing
  - Call storage service to delete history
  - _Requirements: 7.4, 7.5_
  - _Commit: "feat: add history details modal and clear functionality"_


## Phase 12: Main Panel and Integration

- [ ] 61. Create main panel HTML structure
  - Create `src/panel/index.html` with basic HTML structure
  - Add root div for React mounting
  - Link to compiled CSS and JS bundles
  - Add meta tags for viewport and charset
  - Apply flint-bg class to body
  - _Requirements: 8.1_
  - _Commit: "feat: create main panel HTML structure"_

- [ ] 62. Create main panel React app
  - Create `src/panel/panel.tsx` as main entry point
  - Set up React root and render app
  - Wrap app with state provider
  - Create tab navigation (Voice, Rewrite, Summary, History, Settings)
  - Apply flint-toolbar styles to tab bar
  - Implement tab switching logic
  - _Requirements: 8.1_
  - _Commit: "feat: create main panel React app with tab navigation"_

- [ ] 63. Integrate all components into panel
  - Import and render VoiceRecorder in Voice tab
  - Import and render RewritePanel in Rewrite tab
  - Import and render SummaryPanel in Summary tab
  - Import and render History in History tab
  - Import and render Settings in Settings tab
  - Pass necessary props and callbacks to each component
  - _Requirements: 8.1_
  - _Commit: "feat: integrate all components into main panel"_

- [ ] 64. Implement panel-to-content script communication
  - Add message sending functions in panel
  - Send GET_SELECTION message to get selected text
  - Send INSERT_TEXT message to insert transcript
  - Send REPLACE_TEXT message to replace selection
  - Handle responses from content script
  - Update UI based on success/failure
  - _Requirements: 1.6, 4.2_
  - _Commit: "feat: implement panel-to-content script communication"_

- [ ] 65. Add loading states and error boundaries
  - Create loading spinner component
  - Show spinner during AI operations
  - Create error boundary component
  - Catch and display React errors gracefully
  - Add retry option in error boundary
  - Log errors to console for debugging
  - _Requirements: 8.2, 10.5, 10.6_
  - _Commit: "feat: add loading states and error boundaries"_

- [ ] 66. Implement AI availability check on panel load
  - Call aiService.checkAvailability() on panel mount
  - Store availability status in app state
  - Display banner if AI is unavailable
  - Show link to setup instructions
  - Update UI to indicate mock provider is being used
  - _Requirements: 10.1, 10.2_
  - _Commit: "feat: check AI availability on panel load"_

## Phase 13: Accessibility and Polish

- [ ] 67. Add ARIA labels to all interactive elements
  - Add aria-label to all buttons
  - Add aria-describedby for form fields
  - Add role attributes where needed
  - Add aria-live regions for dynamic content
  - Test with screen reader (VoiceOver or NVDA)
  - _Requirements: 9.2, 9.5_
  - _Commit: "a11y: add ARIA labels and live regions"_

- [ ] 68. Implement keyboard navigation
  - Ensure all interactive elements are keyboard accessible
  - Add visible focus indicators (orange glow)
  - Implement tab order for logical navigation
  - Add keyboard shortcuts for common actions
  - Test full keyboard navigation flow
  - _Requirements: 9.1, 9.3_
  - _Commit: "a11y: implement complete keyboard navigation"_

- [ ] 69. Verify color contrast and accessibility
  - Test all text against backgrounds with contrast checker
  - Ensure WCAG 2.1 AA compliance (4.5:1 for text)
  - Test with high contrast mode
  - Verify focus indicators are visible
  - Test with color blindness simulators
  - _Requirements: 9.4_
  - _Commit: "a11y: verify color contrast meets WCAG 2.1 AA"_

- [ ] 70. Add animations and micro-interactions
  - Add button press animation (translateY on active)
  - Add hover glow effect to buttons
  - Add fade transitions between tabs
  - Add pulsing animation to record button when active
  - Add success checkmark animation for copy actions
  - Keep animations under 200ms for responsiveness
  - _Requirements: 8.2_
  - _Commit: "polish: add animations and micro-interactions"_

- [ ] 71. Optimize bundle size
  - Run production build and check bundle size
  - Analyze bundle with Vite's rollup-plugin-visualizer
  - Remove unused dependencies
  - Enable tree-shaking for all imports
  - Compress with terser minification
  - Verify total size is under 1 MB compressed
  - _Requirements: 8.3_
  - _Commit: "perf: optimize bundle size to meet 1 MB budget"_

- [ ] 72. Add performance monitoring
  - Add timing measurements for panel render
  - Measure AI operation latency
  - Measure speech recognition latency
  - Log performance metrics to console
  - Verify panel renders within 3 seconds
  - Verify operations complete within 5 seconds
  - _Requirements: 8.1, 8.4, 8.5_
  - _Commit: "perf: add performance monitoring and verification"_


## Phase 14: Testing (Optional - Only if Requested)

- [ ]* 73. Set up testing infrastructure
  - Install Jest and React Testing Library
  - Install Playwright for E2E tests
  - Create jest.config.js with TypeScript support
  - Create test setup files
  - Add test scripts to package.json
  - Configure coverage reporting
  - _Requirements: 8.1_
  - _Commit: "test: set up Jest and Playwright testing infrastructure"_

- [ ]* 74. Write unit tests for AI service
  - Mock Chrome AI APIs (Prompt, Summarizer, Rewriter)
  - Test availability checks
  - Test session creation and prompt execution
  - Test error handling and fallbacks
  - Test mock provider activation
  - Test pinned notes merging
  - Verify 80% code coverage
  - _Requirements: 2.7, 3.7, 3.8, 10.1_
  - _Commit: "test: add unit tests for AI service"_

- [ ]* 75. Write unit tests for speech service
  - Mock Web Speech API
  - Test recognition start and stop
  - Test partial and final result handling
  - Test error handling for all error types
  - Test confidence score extraction
  - Test language configuration
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9_
  - _Commit: "test: add unit tests for speech service"_

- [ ]* 76. Write unit tests for content script modules
  - Test selection handler text capture
  - Test caret position detection
  - Test text insertion in textarea
  - Test text insertion in contenteditable
  - Test text replacement
  - Test clipboard fallback
  - _Requirements: 1.6, 4.2, 4.3, 4.4, 4.5_
  - _Commit: "test: add unit tests for content script modules"_

- [ ]* 77. Write component tests for VoiceRecorder
  - Test record button click starts recognition
  - Test partial transcript display
  - Test final transcript display
  - Test insert button functionality
  - Test clear button functionality
  - Test error state rendering
  - _Requirements: 1.1, 1.3, 1.4, 1.6_
  - _Commit: "test: add component tests for VoiceRecorder"_

- [ ]* 78. Write component tests for RewritePanel
  - Test preset button selection
  - Test custom instruction input
  - Test rewrite button trigger
  - Test loading state
  - Test error state rendering
  - Test navigation to CompareView
  - _Requirements: 3.3, 3.4, 3.6_
  - _Commit: "test: add component tests for RewritePanel"_

- [ ]* 79. Write component tests for SummaryPanel
  - Test mode selection
  - Test reading level selection
  - Test summarize button trigger
  - Test result display
  - Test copy button functionality
  - Test error state rendering
  - _Requirements: 2.3, 2.4, 2.6_
  - _Commit: "test: add component tests for SummaryPanel"_

- [ ]* 80. Write component tests for CompareView
  - Test side-by-side text display
  - Test accept button functionality
  - Test reject button functionality
  - Test copy button functionality
  - _Requirements: 4.1, 4.2, 4.6_
  - _Commit: "test: add component tests for CompareView"_

- [ ]* 81. Write E2E test for voice to draft flow
  - Open side panel in test browser
  - Click record button
  - Mock speech stream with partial results
  - Verify transcript updates in real-time
  - Click stop button
  - Click insert button
  - Verify text appears in test page textarea
  - _Requirements: 1.1, 1.3, 1.4, 1.6_
  - _Commit: "test: add E2E test for voice to draft flow"_

- [ ]* 82. Write E2E test for summarize selection flow
  - Load test page with long text
  - Select text on page
  - Verify mini bar appears
  - Click summarize button
  - Select bullets mode
  - Mock AI response
  - Verify summary generates
  - Click accept
  - Verify summary appears in page
  - _Requirements: 2.1, 2.2, 2.3, 2.6_
  - _Commit: "test: add E2E test for summarize selection flow"_

- [ ]* 83. Write E2E test for rewrite selection flow
  - Load test page with text
  - Select text on page
  - Click rewrite in mini bar
  - Select formal preset
  - Mock AI response
  - Verify rewrite generates
  - Verify compare view shows both versions
  - Click accept
  - Verify original text is replaced
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_
  - _Commit: "test: add E2E test for rewrite selection flow"_

- [ ]* 84. Write E2E test for fallback handling
  - Disable AI APIs in test environment
  - Trigger rewrite operation
  - Verify mock provider is used
  - Verify user sees appropriate message
  - Verify example output is displayed
  - _Requirements: 10.1, 10.2_
  - _Commit: "test: add E2E test for AI fallback handling"_


## Phase 15: Documentation and Deployment

- [ ] 85. Create comprehensive README
  - Add project overview and description
  - Add installation instructions for development
  - Add build instructions
  - Add instructions for loading as unpacked extension
  - Document Chrome version requirements (128+)
  - Document Gemini Nano setup instructions
  - Add Design section explaining tokens, themes, and toggles
  - Add troubleshooting section
  - _Requirements: 10.1_
  - _Commit: "docs: create comprehensive README with setup instructions"_

- [ ] 86. Add code documentation
  - Add JSDoc comments to all public functions
  - Document all interfaces and types
  - Add inline comments for complex logic
  - Document message types and protocols
  - Create architecture diagram in README
  - _Requirements: 10.5_
  - _Commit: "docs: add JSDoc comments and inline documentation"_

- [ ] 87. Create demo script outline
  - Write 3-minute demo script in DEMO.md
  - Outline voice to draft flow
  - Outline summarize selection flow
  - Outline rewrite selection flow
  - Include talking points for each feature
  - Add notes on what to show in video
  - _Requirements: 8.1_
  - _Commit: "docs: create demo script outline for video recording"_

- [ ] 88. Final build and verification
  - Run `npm run build` for production build
  - Verify TypeScript compiles with zero errors
  - Verify ESLint passes with zero warnings
  - Run Prettier to format all files
  - Check bundle size is under 1 MB compressed
  - Test loading as unpacked extension
  - Verify all features work in Chrome
  - _Requirements: 8.1, 8.3_
  - _Commit: "build: final production build and verification"_

- [ ] 89. Create extension package for submission
  - Navigate to dist folder
  - Create zip file: `zip -r ../flint-extension.zip .`
  - Verify zip contains all necessary files
  - Test installing from zip file
  - Verify extension works after zip installation
  - _Requirements: 8.1_
  - _Commit: "build: create extension package for submission"_

- [ ] 90. Final quality checks
  - Test all user flows end-to-end
  - Verify voice capture works
  - Verify summarize works with all modes
  - Verify rewrite works with all presets
  - Verify text replacement works in textarea and contenteditable
  - Verify clipboard fallback works
  - Verify settings persist across sessions
  - Verify history is saved and searchable
  - Verify pinned notes merge into prompts
  - Verify theme toggles work
  - Verify accessibility features work
  - Verify error messages are clear
  - Verify no console errors in normal operation
  - _Requirements: All_
  - _Commit: "test: final quality checks and verification"_

## Summary

This implementation plan contains 90 tasks organized into 15 phases:

1. **Phase 1-2**: Project setup, build configuration, and design system (Tasks 1-5)
2. **Phase 3**: Core services layer - utilities, storage, AI, speech (Tasks 6-16)
3. **Phase 4**: Content scripts - selection, caret, mini bar (Tasks 17-25)
4. **Phase 5**: Background service worker and message routing (Tasks 26-28)
5. **Phase 6**: State management with React Context (Tasks 29-32)
6. **Phase 7**: VoiceRecorder component (Tasks 33-37)
7. **Phase 8**: RewritePanel component (Tasks 38-43)
8. **Phase 9**: SummaryPanel component (Tasks 44-48)
9. **Phase 10**: CompareView and MiniBar components (Tasks 49-53)
10. **Phase 11**: Settings and History components (Tasks 54-60)
11. **Phase 12**: Main panel integration (Tasks 61-66)
12. **Phase 13**: Accessibility and polish (Tasks 67-72)
13. **Phase 14**: Testing - optional, only if requested (Tasks 73-84)
14. **Phase 15**: Documentation and deployment (Tasks 85-90)

**Key Notes:**
- Tasks marked with `*` (73-84) are optional testing tasks
- Each task is designed to take 1-2 hours
- Tasks build incrementally on previous work
- All tasks reference specific requirements
- Each task includes a suggested commit message
- Testing tasks should only be implemented if explicitly requested

**Estimated Timeline:**
- Core implementation (Tasks 1-72): ~72-144 hours
- Optional testing (Tasks 73-84): ~12-24 hours
- Documentation and deployment (Tasks 85-90): ~6-12 hours
- **Total**: 78-156 hours for core + docs, 90-180 hours with full testing

**Next Steps:**
1. Review this task list with the team
2. Set up development environment
3. Begin with Phase 1 (Project Setup)
4. Work through tasks sequentially
5. Test each feature as it's completed
6. Deploy and submit when all core tasks are done
