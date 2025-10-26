/**
 * State management exports
 * Provides centralized state management for the Flint extension
 */

export { AppProvider } from './AppProvider';
export { useAppState, AppContext, initialState } from './store';
export type { AppState, AppActions, AppContextType, Tab } from './store';

// Export action creators and reducer
export {
  ActionType,
  appReducer,
  setActiveTab,
  setIsProcessing,
  setSettings,
  updateSettings,
  setPinnedNotes,
  addPinnedNote,
  updatePinnedNote,
  deletePinnedNote,
  setHistory,
  addHistoryItem,
  clearHistory,
  setCurrentText,
  setCurrentResult,
  setAIAvailability,
  setError,
} from './actions';

export type { Action } from './actions';

// Export selectors
export {
  selectActiveTab,
  selectIsProcessing,
  selectError,
  selectCurrentText,
  selectCurrentResult,
  selectSettings,
  selectTheme,
  selectLanguage,
  selectLocalOnlyMode,
  selectShortcuts,
  selectPinnedNotes,
  selectHistory,
  selectAIAvailability,
  selectIsAIAvailable,
  selectIsSummarizerAvailable,
  selectIsRewriterAvailable,
  selectIsPromptAvailable,
  selectPinnedNotesCount,
  selectHistoryCount,
  selectHasPinnedNotes,
  selectHasHistory,
  selectPinnedNotesContext,
  selectPinnedNotesArray,
  selectPinnedNoteById,
  selectHistoryItemById,
  selectHistoryByType,
  selectFilteredHistory,
  selectRecentHistory,
  selectHistoryStats,
  selectHasActiveOperation,
  selectHasResult,
  selectMostRecentHistoryItem,
  selectPinnedNotesSortedByUpdated,
  selectPinnedNotesSortedByTitle,
  selectHistorySortedByTimestamp,
} from './selectors';
