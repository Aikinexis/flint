# Requirements Document

## Introduction

This specification defines enhancements to the Flint Chrome extension's Generate panel. The Generate panel allows users to create text content using Chrome's built-in AI APIs with configurable length options, prompt history management, and context-aware follow-up requests. These features enable users to iteratively refine AI-generated content while maintaining a streamlined workflow.

## Glossary

- **Generate Panel**: The user interface tab in Flint's side panel for creating new text content using AI
- **Prompt**: User input text that instructs the AI what content to generate
- **Context Awareness**: The system's ability to reference previous prompts when processing new requests
- **Prompt History**: A stored list of recent user prompts with management capabilities
- **Length Preset**: Predefined character length targets (Short, Medium, Long) for AI-generated content
- **Pinned Prompt**: A user-marked prompt saved for quick reuse
- **Chrome Built-in AI**: Local AI APIs provided by Chrome (Prompt API, Writer API)
- **Flint System**: The complete Chrome extension including side panel, content scripts, and background service worker

## Requirements

### Requirement 1: Length Configuration for Generated Content

**User Story:** As a content creator, I want to specify the desired length of AI-generated text so that the output matches my needs without manual editing.

#### Acceptance Criteria

1.1 THE Generate Panel SHALL display a length dropdown with three options: Short, Medium, and Long

1.2 WHEN the user selects a length option, THE Flint System SHALL pass the corresponding character length hint to the AI generation request

1.3 THE Flint System SHALL provide default character length targets: Short (500 characters), Medium (1500 characters), Long (unlimited)

1.4 THE Flint System SHALL allow users to customize character length values for Short and Medium presets in Settings

1.5 WHEN the user sets a custom length value, THE Flint System SHALL validate the input is between 100 and 10000 characters

1.6 WHEN the user selects Long preset, THE Flint System SHALL not impose a character limit on the AI generation

1.7 THE Flint System SHALL store length preset customizations in chrome.storage.local for persistence across sessions

### Requirement 2: Prompt History Management

**User Story:** As a frequent user, I want to see my recent prompts and quickly reuse them so that I can iterate on content without retyping.

#### Acceptance Criteria

2.1 WHEN the user submits a prompt, THE Flint System SHALL save the prompt text to IndexedDB with a timestamp and unique identifier

2.2 WHEN the user clicks on the empty prompt input field, THE Generate Panel SHALL display a dropdown overlay showing the 5 most recent prompts

2.3 WHEN the user clicks a prompt from the dropdown, THE Flint System SHALL populate the prompt input field with the selected text and close the dropdown

2.4 WHEN the user types any character in the prompt field, THE Flint System SHALL close the prompt history dropdown

2.5 THE Flint System SHALL display each history item in the dropdown with a star icon for pinning and an X icon for deletion

2.6 WHEN the user clicks the star icon, THE Flint System SHALL mark the prompt as pinned and move it to the top of the history list

2.7 WHEN the user clicks the X icon, THE Flint System SHALL remove the prompt from history without confirmation

2.8 WHERE a prompt is pinned, THE Flint System SHALL persist the pinned status and exclude it from automatic cleanup

2.9 THE Flint System SHALL automatically delete unpinned prompts older than 30 days

2.10 THE Flint System SHALL limit stored prompt history to 50 items, removing the oldest unpinned prompts when the limit is exceeded

2.11 WHEN the user clicks outside the prompt history dropdown, THE Flint System SHALL close the dropdown

### Requirement 3: Context-Aware Prompt Processing

**User Story:** As a user refining content, I want the AI to understand follow-up requests like "make another" by referencing what was previously generated so that I can iterate naturally.

#### Acceptance Criteria

3.1 THE Flint System SHALL provide a context awareness toggle in Settings with default state enabled

3.2 WHEN context awareness is enabled and a generation completes successfully, THE Flint System SHALL create a brief summary of the generated output

3.3 THE Flint System SHALL store the output summary as the current context for the next generation request

3.4 WHEN context awareness is enabled and the user submits a subsequent prompt, THE Flint System SHALL prepend the output summary to the AI request with the prefix "Previous output summary: "

3.5 THE Flint System SHALL only maintain the single most recent output summary as context, not a full conversation history

3.6 WHEN a new generation completes, THE Flint System SHALL replace the stored context with the new output summary

3.7 WHEN context awareness is disabled, THE Flint System SHALL process each prompt independently without referencing previous outputs

3.8 THE Flint System SHALL NOT display any visible context UI to the user

3.9 THE Flint System SHALL generate the output summary by requesting the AI to create a concise one-sentence description of what was generated

### Requirement 4: Settings Integration

**User Story:** As a power user, I want to customize length presets and context behavior so that the Generate panel matches my workflow preferences.

#### Acceptance Criteria

4.1 THE Settings panel SHALL include a "Generate Panel" section with length and context configuration options

4.2 THE Settings panel SHALL display input fields for Short length (100-10000 characters) and Medium length (100-10000 characters)

4.3 WHEN the user enters a custom length value, THE Flint System SHALL validate the input is numeric and within the allowed range

4.4 IF the user enters an invalid length value, THEN THE Flint System SHALL display the message "Length must be between 100 and 10000 characters"

4.5 THE Settings panel SHALL display a toggle switch for context awareness with label "Use previous prompt as context"

4.6 WHEN the user changes any Generate panel setting, THE Flint System SHALL save the changes to chrome.storage.local immediately

4.7 THE Flint System SHALL apply setting changes to the Generate panel without requiring a page reload

### Requirement 5: Generate Panel UI and Workflow

**User Story:** As a user, I want a clear and intuitive interface for generating content with all options easily accessible so that I can focus on creating content.

#### Acceptance Criteria

5.1 THE Generate Panel SHALL display a single-line text input field for the user prompt with placeholder text "Ask anything..."

5.2 THE Generate Panel SHALL display a length selector icon inside the prompt input field on the right side

5.3 WHEN the user clicks the length selector icon, THE Flint System SHALL display a dropdown menu with Short, Medium, and Long options

5.4 THE length selector icon SHALL visually indicate the currently selected length option

5.5 THE Generate Panel SHALL display a voice input button and generate button inside the prompt input field on the right side

5.6 THE Generate Panel SHALL NOT display any visible context awareness UI

5.7 WHEN the user clicks Generate, THE Flint System SHALL disable the button and show a loading spinner until the operation completes

5.8 WHEN generation completes, THE Generate Panel SHALL display the result in the version carousel component

5.9 THE Generate Panel SHALL save the prompt to history and create an output summary for context after successful generation

5.10 THE Generate Panel SHALL maintain a clean, minimal interface with all controls integrated into the prompt input field

### Requirement 6: Error Handling and Edge Cases

**User Story:** As a user, I want clear feedback when something goes wrong so that I understand what happened and how to proceed.

#### Acceptance Criteria

6.1 IF the user submits an empty prompt, THEN THE Flint System SHALL display the message "Please enter a prompt"

6.2 IF the AI generation fails, THEN THE Flint System SHALL display the error message from the AI service and provide a retry button

6.3 IF the AI generation exceeds 10 seconds, THEN THE Flint System SHALL cancel the request and display the message "Generation timed out. Please try a shorter prompt."

6.4 IF context awareness is enabled but no previous prompt exists, THEN THE Flint System SHALL process the prompt without context

6.5 IF the user deletes all prompts from history, THEN THE Flint System SHALL display the message "No recent prompts" in the history dropdown

6.6 IF IndexedDB storage fails, THEN THE Flint System SHALL log the error and continue operation without saving history

6.7 THE Flint System SHALL handle all errors gracefully without crashing the Generate panel or leaving the UI in a broken state
