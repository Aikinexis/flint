# Requirements Document

## Introduction

This specification defines the unified editor workflow for Flint, transforming the current multi-panel approach into a single shared document editor with inline AI operations, project management, and version history. The goal is to create a seamless writing experience where users can work on one document, apply AI tools inline, manage multiple projects, and track their editing history—all without leaving their workflow.

## Glossary

- **Unified Editor**: A single shared textarea component that persists across all tool tabs (Generate, Rewrite, Summarize)
- **Inline Editing**: AI operations that replace selected text directly in the editor without navigating to separate views
- **Project**: A saved document with its content, metadata, and complete version history
- **Snapshot**: A saved version of the document at a specific point in time, created after each AI operation
- **History Panel**: A collapsible sidebar panel displaying all snapshots for the current project in chronological order
- **Mini Bar**: A floating toolbar that appears on text selection, providing quick access to AI tools
- **Tool Controls**: The options and buttons below the editor that change based on the active tool tab

## Requirements

### Requirement 1: Unified Editor Component

**User Story:** As a user, I want to work in a single editor that persists across all AI tools, so that I can seamlessly switch between different operations without losing my context.

#### Acceptance Criteria

1. THE System SHALL create a new shared textarea component that replaces the individual textareas in Generate, Rewrite, and Summarize panels
2. WHEN the user switches between tool tabs (Generate, Rewrite, Summarize), THE Unified Editor SHALL preserve the document content without clearing or resetting
3. THE Unified Editor SHALL reuse existing textarea styling and behavior from current panels
4. THE Unified Editor SHALL display existing tool-specific controls below the textarea (no changes to control functionality)
5. THE Unified Editor SHALL maintain cursor position and selection state when switching between tabs

### Requirement 2: Inline Text Replacement

**User Story:** As a user, I want AI operations to replace text directly in my document, so that I can see changes immediately without navigating to comparison views.

#### Acceptance Criteria

1. WHEN an AI operation completes successfully, THE System SHALL replace the selected text in the Unified Editor with the generated result (instead of navigating to CompareView)
2. BEFORE replacing text, THE System SHALL save the current document state as a new Snapshot
3. AFTER replacing text, THE System SHALL update the text selection to highlight the newly inserted content
4. IF no text is selected, THE System SHALL insert the generated content at the current cursor position (reusing existing insertion logic)
5. THE System SHALL provide visual feedback (animation or highlight) when text is replaced inline

### Requirement 3: Project Management

**User Story:** As a user, I want to save and manage multiple writing projects, so that I can work on different documents without losing my progress.

#### Acceptance Criteria

1. THE System SHALL provide a Projects button in the sidebar that opens the Project Manager modal
2. THE Project Manager SHALL display all saved projects as cards in a scrollable grid layout
3. WHEN the user clicks a project card, THE System SHALL load that project's content into the Unified Editor and close the Project Manager
4. THE System SHALL provide a "New Project" card that creates a blank project when clicked
5. THE System SHALL auto-save the current project's content to storage whenever changes are made
6. EACH Project SHALL store: unique ID, title, content, creation timestamp, last modified timestamp, and complete Snapshot history

### Requirement 4: Version History Panel

**User Story:** As a user, I want to view and restore previous versions of my document, so that I can undo AI changes or compare different iterations.

#### Acceptance Criteria

1. THE System SHALL provide a collapsible History Panel that slides out from the left side of the sidebar
2. THE History Panel SHALL display all Snapshots for the current project in reverse chronological order (newest first)
3. WHEN the user clicks a Snapshot, THE System SHALL load that version's content into the Unified Editor
4. EACH Snapshot SHALL display: action label (e.g., "Rewrote closing"), timestamp, and preview of the content
5. THE History Panel SHALL highlight the currently active Snapshot
6. THE System SHALL provide a toggle button on the sidebar to show/hide the History Panel

### Requirement 5: Snapshot Creation

**User Story:** As a user, I want the system to automatically save versions of my document, so that I can track my editing history without manual intervention.

#### Acceptance Criteria

1. WHEN an AI operation (Generate, Rewrite, or Summarize) completes successfully, THE System SHALL create a new Snapshot before applying changes
2. EACH Snapshot SHALL store: unique ID, project ID, content, action type, action description, timestamp, and selection range
3. THE System SHALL limit Snapshot storage to the most recent 50 versions per project to manage storage space
4. WHEN a Snapshot is created, THE System SHALL add it to the History Panel immediately
5. THE System SHALL persist all Snapshots to IndexedDB for durability across sessions

### Requirement 6: Mini Bar Integration

**User Story:** As a user, I want to quickly access AI tools from selected text, so that I can perform operations without switching tabs.

#### Acceptance Criteria

1. WHEN the user selects text in the Unified Editor, THE System SHALL display the existing Mini Bar component above or below the selection
2. THE Mini Bar SHALL reuse existing button functionality for Generate, Rewrite, and Summarize operations
3. WHEN the user clicks a Mini Bar button, THE System SHALL execute the corresponding AI operation using existing AI service methods
4. AFTER the operation completes, THE System SHALL replace the selected text inline (new behavior) instead of opening CompareView
5. THE Mini Bar SHALL maintain existing auto-hide behavior (5 seconds of inactivity)

### Requirement 7: Tool Controls Reorganization

**User Story:** As a user, I want consistent tool controls across all AI operations, so that I can learn the interface once and apply it everywhere.

#### Acceptance Criteria

1. THE System SHALL move existing tool controls from each panel to display below the Unified Editor
2. THE Rewrite tab SHALL reuse existing preset buttons and "Rewrite Selection" button (no functional changes)
3. THE Summarize tab SHALL simplify to match Generate/Rewrite layout style (mode selector + action button below editor)
4. THE Generate tab SHALL keep existing prompt input field, tone options, and "Generate Text" button
5. THE Settings tab SHALL remain completely unchanged with all existing functionality

### Requirement 8: History Panel Migration

**User Story:** As a user, I want to access version history through the new collapsible panel, so that I have more space for my document while still having access to all history features.

#### Acceptance Criteria

1. THE System SHALL remove the existing History icon button from the sidebar
2. THE System SHALL preserve all existing history functionality (viewing, searching, clearing history)
3. THE History Panel SHALL display the same information previously shown in the History tab (operation type, timestamp, preview)
4. THE System SHALL migrate existing history data from the old storage format to the new Snapshot format
5. THE System SHALL maintain the ability to view full history item details when clicking a Snapshot

### Requirement 9: Accessibility Enhancements

**User Story:** As a user with accessibility needs, I want the interface to be fully keyboard navigable and screen reader compatible, so that I can use all features effectively.

#### Acceptance Criteria

1. ALL interactive elements (buttons, inputs, tabs) SHALL be keyboard accessible with visible focus indicators
2. THE System SHALL provide ARIA labels for all buttons, inputs, and dynamic content regions
3. THE System SHALL implement ARIA live regions for status updates and AI operation results
4. THE System SHALL ensure all text meets WCAG 2.1 AA color contrast requirements (4.5:1 minimum)
5. THE System SHALL support complete keyboard navigation with logical tab order throughout the interface

### Requirement 10: Performance and Polish

**User Story:** As a user, I want smooth animations and fast response times, so that the interface feels polished and professional.

#### Acceptance Criteria

1. THE System SHALL complete all UI transitions and animations within 300ms
2. THE System SHALL provide visual feedback (loading spinners, progress indicators) for all AI operations
3. THE System SHALL optimize the bundle size to remain under 1 MB compressed
4. THE System SHALL add micro-interactions (button press animations, hover effects) to enhance user experience
5. THE System SHALL measure and log performance metrics for panel render time and AI operation latency
