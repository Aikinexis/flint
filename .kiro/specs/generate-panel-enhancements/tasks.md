# Implementation Plan

This plan adds three enhancements to the existing Flint Generate panel: length presets, prompt history, and context awareness. All tasks extend existing code without duplicating functionality.

## Phase 1: Storage Service Extension

- [x] 1. Add prompt history data models and IndexedDB schema
  - Add PromptHistoryItem interface to `src/services/storage.ts`
  - Add GenerateSettings interface to `src/services/storage.ts`
  - Upgrade IndexedDB schema from v1 to v2 (or current version + 1)
  - Create promptHistory object store with indexes on timestamp and pinned
  - _Requirements: 2.1, 4.6_

- [x] 2. Implement prompt history CRUD methods
  - Add getPromptHistory(limit?: number) method to StorageService
  - Add savePromptToHistory(text: string) method to StorageService
  - Add togglePromptPin(id: string) method to StorageService
  - Add deletePromptFromHistory(id: string) method to StorageService
  - Add cleanupOldPrompts() method to remove items older than 30 days
  - Implement 50-item limit with oldest unpinned deletion
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 3. Implement generate settings methods
  - Add getGenerateSettings() method to StorageService
  - Add saveGenerateSettings(settings: GenerateSettings) method to StorageService
  - Use chrome.storage.local with key 'generateSettings'
  - Provide default values: shortLength=500, mediumLength=1500, contextAwarenessEnabled=true
  - _Requirements: 1.3, 1.4, 1.7, 3.1, 4.6_

## Phase 2: Settings Component Extension

- [x] 4. Add Generate Panel settings section
  - Open `src/components/Settings.tsx`
  - Add new section titled "Generate Panel"
  - Add numeric input for Short length (100-10000 range)
  - Add numeric input for Medium length (100-10000 range)
  - Add toggle switch for "Context awareness" with description explaining it uses output summaries
  - Add validation for length inputs
  - Display error message "Length must be between 100 and 10000 characters" for invalid input
  - Wire up to StorageService.getGenerateSettings() and saveGenerateSettings()
  - _Requirements: 1.4, 1.5, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

## Phase 3: AI Service Extension

- [x] 5. Extend GenerateOptions interface and generate() method
  - Open `src/services/ai.ts`
  - Add length, lengthHint, and context fields to GenerateOptions interface
  - Modify generate() method to prepend context if provided: "Previous request: {context}\n\nNew request: {prompt}"
  - Add length hint to prompt if length is not 'long': "\n\nTarget length: approximately {lengthHint} characters"
  - Update MockAIProvider.generate() to respect length parameter
  - _Requirements: 1.2, 1.6, 3.2, 3.3, 3.4_

## Phase 4: GeneratePanel Component Extension

- [x] 6. Add new state variables to GeneratePanel
  - Open `src/components/GeneratePanel.tsx`
  - Add selectedLength state (default: 'medium')
  - Add promptHistory state (array of PromptHistoryItem)
  - Add currentContext state (string | null)
  - Add generateSettings state (GenerateSettings | null)
  - _Requirements: 1.1, 2.2, 3.2, 3.8_

- [x] 7. Add data loading on component mount
  - Add useEffect to load prompt history from StorageService.getPromptHistory(5)
  - Add useEffect to load generate settings from StorageService.getGenerateSettings()
  - Update promptHistory state with loaded data
  - Update generateSettings state with loaded data
  - _Requirements: 2.2, 4.7_

- [x] 8. Integrate length selector into prompt input field
  - Add showLengthDropdown state (boolean)
  - Add length selector button inside prompt input field (positioned right side, before voice button)
  - Button shows icon representing current length: ⚡ (short), ≈ (medium), ∞ (long)
  - Add length dropdown menu that appears below the button when clicked
  - Dropdown shows three options with icons and descriptions
  - Clicking an option updates selectedLength and closes dropdown
  - Clicking outside dropdown closes it
  - _Requirements: 1.1, 1.2, 5.2, 5.3, 5.4_

- [x] 9. Integrate prompt history dropdown into prompt input field
  - Add showPromptHistory state (boolean)
  - Add handlePromptFocus() method that shows dropdown when field is empty
  - Add prompt history dropdown that appears below input field when focused and empty
  - Dropdown shows up to 5 most recent prompts (full width of input)
  - Each item shows: prompt text, star icon (★/☆), X icon
  - Pinned items appear at top
  - Typing any character closes the dropdown
  - Clicking outside closes the dropdown
  - _Requirements: 2.2, 2.3, 2.4, 2.11, 5.1_

- [x] 10. Implement prompt history dropdown interactions
  - Add selectPrompt(text) method that loads prompt into input and closes dropdown
  - Add handleTogglePin(id) method that calls StorageService.togglePromptPin() and keeps dropdown open
  - Add handleDeletePrompt(id) method that calls StorageService.deletePromptFromHistory() and keeps dropdown open
  - Update promptHistory state after pin/delete operations
  - _Requirements: 2.3, 2.5, 2.6, 2.7_

- [x] 11. Remove context banner UI (keep context logic only)
  - Remove any visible context banner UI from GeneratePanel
  - Keep currentContext state for internal tracking only
  - Context should not be displayed to user
  - _Requirements: 3.8, 5.6_

- [x] 12. Implement output summary generation for context
  - Add generateOutputSummary(text: string) method to AIService
  - Method should use AI to create a one-sentence summary (max 100 chars) of generated output
  - Use fallback of first 100 chars if AI summary fails
  - This summary will be used as context for next generation
  - _Requirements: 3.2, 3.9_

- [x] 13. Modify handleGenerate() for context awareness with output summaries
  - Load generateSettings at start of method
  - Check if contextAwarenessEnabled is true
  - If enabled and currentContext exists, pass context to AIService.generate() with prefix "Previous output summary: "
  - Pass selectedLength and corresponding lengthHint to AIService.generate()
  - After successful generation, call generateOutputSummary() on the result
  - Store the output summary as currentContext (not the user's prompt)
  - Save user's prompt to history via StorageService.savePromptToHistory()
  - Reload promptHistory state to show new item
  - _Requirements: 1.2, 3.2, 3.3, 3.4, 3.5, 3.6, 5.9_

## Phase 5: Mock Provider Update

- [x] 14. Update mock provider to remove default stories
  - Modify MockAIProvider.generate() in `src/services/ai.ts`
  - Remove lighthouse keeper or any other default narrative text
  - Return simple, length-appropriate responses based on the prompt
  - Keep mock responses minimal and relevant to user's prompt
  - _Requirements: 5.9_

## Phase 6: Error Handling and Edge Cases

- [x] 15. Add validation and error handling
  - Validate empty prompt before generation (already exists, verify it works)
  - Handle case where contextAwarenessEnabled is true but currentContext is null (process without context)
  - Handle IndexedDB storage failures gracefully (log error, continue without saving)
  - Handle case where generateSettings is null (use default values)
  - Handle output summary generation failures (use fallback)
  - _Requirements: 6.1, 6.4, 6.6, 6.7_

## Phase 7: Testing and Polish

- [ ] 16. Test storage functionality
  - Verify IndexedDB schema upgrade works
  - Test saving prompts to history
  - Test pin/unpin functionality
  - Test delete functionality
  - Test 30-day cleanup
  - Test 50-item limit enforcement
  - Test settings save/load
  - _Requirements: 2.1, 2.5, 2.6, 2.8, 2.9, 4.6_

- [ ] 17. Test AI service integration
  - Test generation with context prepending
  - Test generation with length hints
  - Test generation without context (first prompt)
  - Test with different length presets
  - Verify mock provider respects length
  - _Requirements: 1.2, 3.2, 3.3, 3.4_

- [ ] 18. Test GeneratePanel UI and interactions
  - Test length selector button and dropdown
  - Test length icon changes based on selection
  - Test prompt history dropdown appears when field is empty and focused
  - Test clicking prompt from history loads it into input
  - Test pin/unpin icons in history dropdown
  - Test delete prompt in history dropdown
  - Test dropdown closes when typing
  - Test dropdown closes when clicking outside
  - Test context awareness toggle in settings
  - Test custom length values in settings
  - _Requirements: 1.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.11, 4.3, 4.5, 5.2, 5.3, 5.4_

- [ ] 19. Test full workflow scenarios
  - Generate with prompt "Make a song", verify output summary stored as context
  - Generate with prompt "Make another", verify AI receives output summary as context
  - Verify prompt appears in history after generation
  - Pin a prompt, generate 50+ more, verify pinned persists
  - Change length settings, verify length selector updates
  - Toggle context awareness off, verify context not used
  - Test that context is based on OUTPUT summary, not user's previous prompt
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 5.9_

- [ ] 20. Test edge cases and error scenarios
  - Test with empty prompt history
  - Test with no context (first use)
  - Test with IndexedDB failure
  - Test with very long prompts
  - Test with invalid length settings
  - Test generation timeout (already handled, verify)
  - Test output summary generation failure (verify fallback works)
  - Test mock provider shows simple responses without default stories
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

## Notes

- All tasks extend existing code - do not recreate GeneratePanel, AI service, or storage service
- GeneratePanel already has: prompt input, voice button, generate button, version carousel, error handling
- AI service already has: generate() method, Writer/Prompt API integration, mock provider
- Storage service already has: IndexedDB setup, history saving, settings persistence
- Focus on adding the three new features with clean, integrated UI:
  - Length selector integrated into prompt input field (not separate dropdown)
  - Prompt history as dropdown inside/below prompt field (not separate list)
  - Context awareness using output summaries (no visible UI)
- Keep the UI minimal and clean - all controls integrated into the prompt input area
- Context is tracked automatically via AI-generated summaries of outputs, not user prompts
