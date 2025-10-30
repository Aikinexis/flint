/**
 * State selectors for accessing and computing derived state
 * Provides memoized selectors for efficient state access
 */

import type { AppState } from './store';
import type { PinnedNote } from '../services/storage';

/**
 * Simple memoization helper for single-argument selectors
 * @param fn - Selector function to memoize
 * @returns Memoized selector function
 */
function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  let lastArg: T | undefined;
  let lastResult: R | undefined;

  return (arg: T): R => {
    if (lastArg === arg && lastResult !== undefined) {
      return lastResult;
    }
    lastArg = arg;
    lastResult = fn(arg);
    return lastResult;
  };
}

// memoizeWithParams removed - no longer needed after history selectors removal

// ===== Basic Selectors =====

/**
 * Selects the active tab
 * @param state - Application state
 * @returns Current active tab
 */
export const selectActiveTab = (state: AppState) => state.activeTab;

/**
 * Selects the processing state
 * @param state - Application state
 * @returns Whether an operation is currently processing
 */
export const selectIsProcessing = (state: AppState) => state.isProcessing;

/**
 * Selects the current error
 * @param state - Application state
 * @returns Current error message or null
 */
export const selectError = (state: AppState) => state.error;

/**
 * Selects the current text
 * @param state - Application state
 * @returns Current text being processed
 */
export const selectCurrentText = (state: AppState) => state.currentText;

/**
 * Selects the current result
 * @param state - Application state
 * @returns Current operation result or null
 */
export const selectCurrentResult = (state: AppState) => state.currentResult;

/**
 * Selects the settings
 * @param state - Application state
 * @returns User settings
 */
export const selectSettings = (state: AppState) => state.settings;

/**
 * Selects the theme setting
 * @param state - Application state
 * @returns Current theme setting
 */
export const selectTheme = (state: AppState) => state.settings.theme;

/**
 * Selects the language setting
 * @param state - Application state
 * @returns Current language setting
 */
export const selectLanguage = (state: AppState) => state.settings.language;

/**
 * Selects the local-only mode setting
 * @param state - Application state
 * @returns Whether local-only mode is enabled
 */
export const selectLocalOnlyMode = (state: AppState) => state.settings.localOnlyMode;

/**
 * Selects the keyboard shortcuts
 * @param state - Application state
 * @returns Keyboard shortcuts configuration
 */

/**
 * Selects all pinned notes
 * @param state - Application state
 * @returns Array of pinned notes
 */
export const selectPinnedNotes = (state: AppState) => state.pinnedNotes;

/**
 * Selects AI availability status
 * @param state - Application state
 * @returns AI availability for all APIs
 */
export const selectAIAvailability = (state: AppState) => state.aiAvailability;

// ===== Computed Selectors =====

/**
 * Checks if any AI API is available
 * @param state - Application state
 * @returns True if at least one AI API is available
 */
export const selectIsAIAvailable = memoize((state: AppState): boolean => {
  const { promptAPI, summarizerAPI, rewriterAPI } = state.aiAvailability;
  return promptAPI === 'available' || summarizerAPI === 'available' || rewriterAPI === 'available';
});

/**
 * Checks if the Summarizer API is available
 * @param state - Application state
 * @returns True if Summarizer API is available
 */
export const selectIsSummarizerAvailable = (state: AppState): boolean => {
  return state.aiAvailability.summarizerAPI === 'available';
};

/**
 * Checks if the Rewriter API is available
 * @param state - Application state
 * @returns True if Rewriter API is available
 */
export const selectIsRewriterAvailable = (state: AppState): boolean => {
  return state.aiAvailability.rewriterAPI === 'available';
};

/**
 * Checks if the Prompt API is available
 * @param state - Application state
 * @returns True if Prompt API is available
 */
export const selectIsPromptAvailable = (state: AppState): boolean => {
  return state.aiAvailability.promptAPI === 'available';
};

/**
 * Gets the count of pinned notes
 * @param state - Application state
 * @returns Number of pinned notes
 */
export const selectPinnedNotesCount = (state: AppState): number => {
  return state.pinnedNotes.length;
};

/**
 * Checks if there are any pinned notes
 * @param state - Application state
 * @returns True if there are pinned notes
 */
export const selectHasPinnedNotes = (state: AppState): boolean => {
  return state.pinnedNotes.length > 0;
};

/**
 * Gets pinned notes content as a single string for AI context
 * Memoized to avoid recomputing on every render
 * @param state - Application state
 * @returns Concatenated pinned notes content
 */
export const selectPinnedNotesContext = memoize((state: AppState): string => {
  if (state.pinnedNotes.length === 0) {
    return '';
  }

  return state.pinnedNotes.map((note) => `${note.title}:\n${note.content}`).join('\n\n');
});

/**
 * Gets pinned notes as an array of strings for AI context
 * Memoized to avoid recomputing on every render
 * @param state - Application state
 * @returns Array of pinned note contents
 */
export const selectPinnedNotesArray = memoize((state: AppState): string[] => {
  return state.pinnedNotes.map((note) => `${note.title}: ${note.content}`);
});

/**
 * Finds a pinned note by ID
 * @param state - Application state
 * @param id - Note ID to find
 * @returns Pinned note or undefined
 */
export const selectPinnedNoteById = (state: AppState, id: string): PinnedNote | undefined => {
  return state.pinnedNotes.find((note) => note.id === id);
};

/**
 * Checks if there is an active operation (current text and processing)
 * @param state - Application state
 * @returns True if an operation is active
 */
export const selectHasActiveOperation = (state: AppState): boolean => {
  return state.isProcessing && state.currentText.length > 0;
};

/**
 * Checks if there is a completed operation (current result available)
 * @param state - Application state
 * @returns True if a result is available
 */
export const selectHasResult = (state: AppState): boolean => {
  return state.currentResult !== null && state.currentResult.length > 0;
};

/**
 * Gets pinned notes sorted by most recently updated
 * Memoized to avoid resorting on every render
 * @param state - Application state
 * @returns Sorted pinned notes
 */
export const selectPinnedNotesSortedByUpdated = memoize((state: AppState): PinnedNote[] => {
  return [...state.pinnedNotes].sort((a, b) => b.updatedAt - a.updatedAt);
});

/**
 * Gets pinned notes sorted by title
 * Memoized to avoid resorting on every render
 * @param state - Application state
 * @returns Sorted pinned notes
 */
export const selectPinnedNotesSortedByTitle = memoize((state: AppState): PinnedNote[] => {
  return [...state.pinnedNotes].sort((a, b) => a.title.localeCompare(b.title));
});
