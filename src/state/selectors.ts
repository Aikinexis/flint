/**
 * State selectors for accessing and computing derived state
 * Provides memoized selectors for efficient state access
 */

import type { AppState } from './store';
import type { PinnedNote, HistoryItem } from '../services/storage';

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

/**
 * Memoization helper for selectors with additional parameters
 * @param fn - Selector function to memoize
 * @returns Memoized selector function
 */
function memoizeWithParams<T, P, R>(fn: (state: T, params: P) => R): (state: T, params: P) => R {
  const cache = new Map<string, R>();

  return (state: T, params: P): R => {
    const key = JSON.stringify(params);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(state, params);
    cache.set(key, result);
    // Keep cache size reasonable
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value as string;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    return result;
  };
}

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
export const selectShortcuts = (state: AppState) => state.settings.shortcuts;

/**
 * Selects all pinned notes
 * @param state - Application state
 * @returns Array of pinned notes
 */
export const selectPinnedNotes = (state: AppState) => state.pinnedNotes;

/**
 * Selects all history items
 * @param state - Application state
 * @returns Array of history items
 */
export const selectHistory = (state: AppState) => state.history;

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
 * Gets the count of history items
 * @param state - Application state
 * @returns Number of history items
 */
export const selectHistoryCount = (state: AppState): number => {
  return state.history.length;
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
 * Checks if there is any history
 * @param state - Application state
 * @returns True if there are history items
 */
export const selectHasHistory = (state: AppState): boolean => {
  return state.history.length > 0;
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

  return state.pinnedNotes
    .map((note) => `${note.title}:\n${note.content}`)
    .join('\n\n');
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
 * Finds a history item by ID
 * @param state - Application state
 * @param id - History item ID to find
 * @returns History item or undefined
 */
export const selectHistoryItemById = (state: AppState, id: string): HistoryItem | undefined => {
  return state.history.find((item) => item.id === id);
};

/**
 * Filters history by type
 * Memoized with parameters to avoid recomputing
 * @param state - Application state
 * @param type - History item type to filter by
 * @returns Filtered history items
 */
export const selectHistoryByType = memoizeWithParams(
  (state: AppState, type: 'voice' | 'summarize' | 'rewrite'): HistoryItem[] => {
    return state.history.filter((item) => item.type === type);
  }
);

/**
 * Searches history by text content
 * Memoized with parameters to avoid recomputing
 * @param state - Application state
 * @param query - Search query
 * @returns Matching history items
 */
export const selectFilteredHistory = memoizeWithParams(
  (state: AppState, query: string): HistoryItem[] => {
    if (!query.trim()) {
      return state.history;
    }

    const lowerQuery = query.toLowerCase();
    return state.history.filter(
      (item) =>
        item.originalText.toLowerCase().includes(lowerQuery) ||
        item.resultText.toLowerCase().includes(lowerQuery) ||
        item.type.toLowerCase().includes(lowerQuery)
    );
  }
);

/**
 * Gets recent history items (last N items)
 * Memoized with parameters to avoid recomputing
 * @param state - Application state
 * @param limit - Maximum number of items to return
 * @returns Recent history items
 */
export const selectRecentHistory = memoizeWithParams(
  (state: AppState, limit: number): HistoryItem[] => {
    return state.history.slice(0, limit);
  }
);

/**
 * Gets history statistics
 * Memoized to avoid recomputing on every render
 * @param state - Application state
 * @returns History statistics
 */
export const selectHistoryStats = memoize(
  (state: AppState): {
    total: number;
    voice: number;
    summarize: number;
    rewrite: number;
  } => {
    const stats = {
      total: state.history.length,
      voice: 0,
      summarize: 0,
      rewrite: 0,
    };

    for (const item of state.history) {
      stats[item.type]++;
    }

    return stats;
  }
);

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
 * Gets the most recent history item
 * @param state - Application state
 * @returns Most recent history item or undefined
 */
export const selectMostRecentHistoryItem = (state: AppState): HistoryItem | undefined => {
  return state.history[0];
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

/**
 * Gets history items sorted by timestamp (newest first)
 * Already sorted in state, but provided for consistency
 * @param state - Application state
 * @returns Sorted history items
 */
export const selectHistorySortedByTimestamp = (state: AppState): HistoryItem[] => {
  return state.history; // Already sorted newest first
};
