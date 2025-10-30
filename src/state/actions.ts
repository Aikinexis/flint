/**
 * State actions and action creators
 * Provides type-safe action creators and reducer logic for state management
 */

import type { AppState, Tab } from './store';
import type { Settings, PinnedNote } from '../services/storage';
import type { AIAvailability } from '../services/ai';

/**
 * Action types enum for type safety
 */
export enum ActionType {
  // UI actions
  SET_ACTIVE_TAB = 'SET_ACTIVE_TAB',
  SET_IS_PROCESSING = 'SET_IS_PROCESSING',
  SET_IS_HISTORY_PANEL_OPEN = 'SET_IS_HISTORY_PANEL_OPEN',
  TOGGLE_HISTORY_PANEL = 'TOGGLE_HISTORY_PANEL',

  // Settings actions
  SET_SETTINGS = 'SET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',

  // Pinned notes actions
  SET_PINNED_NOTES = 'SET_PINNED_NOTES',
  ADD_PINNED_NOTE = 'ADD_PINNED_NOTE',
  UPDATE_PINNED_NOTE = 'UPDATE_PINNED_NOTE',
  DELETE_PINNED_NOTE = 'DELETE_PINNED_NOTE',

  // Current operation actions
  SET_CURRENT_TEXT = 'SET_CURRENT_TEXT',
  SET_CURRENT_RESULT = 'SET_CURRENT_RESULT',

  // AI availability actions
  SET_AI_AVAILABILITY = 'SET_AI_AVAILABILITY',

  // Error actions
  SET_ERROR = 'SET_ERROR',
}

/**
 * Action interfaces for each action type
 */
export interface SetActiveTabAction {
  type: ActionType.SET_ACTIVE_TAB;
  payload: Tab;
}

export interface SetIsProcessingAction {
  type: ActionType.SET_IS_PROCESSING;
  payload: boolean;
}

export interface SetIsHistoryPanelOpenAction {
  type: ActionType.SET_IS_HISTORY_PANEL_OPEN;
  payload: boolean;
}

export interface ToggleHistoryPanelAction {
  type: ActionType.TOGGLE_HISTORY_PANEL;
}

export interface SetSettingsAction {
  type: ActionType.SET_SETTINGS;
  payload: Settings;
}

export interface UpdateSettingsAction {
  type: ActionType.UPDATE_SETTINGS;
  payload: Partial<Settings>;
}

export interface SetPinnedNotesAction {
  type: ActionType.SET_PINNED_NOTES;
  payload: PinnedNote[];
}

export interface AddPinnedNoteAction {
  type: ActionType.ADD_PINNED_NOTE;
  payload: PinnedNote;
}

export interface UpdatePinnedNoteAction {
  type: ActionType.UPDATE_PINNED_NOTE;
  payload: {
    id: string;
    updates: Partial<PinnedNote>;
  };
}

export interface DeletePinnedNoteAction {
  type: ActionType.DELETE_PINNED_NOTE;
  payload: string; // note id
}

export interface SetCurrentTextAction {
  type: ActionType.SET_CURRENT_TEXT;
  payload: string;
}

export interface SetCurrentResultAction {
  type: ActionType.SET_CURRENT_RESULT;
  payload: string | null;
}

export interface SetAIAvailabilityAction {
  type: ActionType.SET_AI_AVAILABILITY;
  payload: AIAvailability;
}

export interface SetErrorAction {
  type: ActionType.SET_ERROR;
  payload: string | null;
}

/**
 * Union type of all actions
 */
export type Action =
  | SetActiveTabAction
  | SetIsProcessingAction
  | SetIsHistoryPanelOpenAction
  | ToggleHistoryPanelAction
  | SetSettingsAction
  | UpdateSettingsAction
  | SetPinnedNotesAction
  | AddPinnedNoteAction
  | UpdatePinnedNoteAction
  | DeletePinnedNoteAction
  | SetCurrentTextAction
  | SetCurrentResultAction
  | SetAIAvailabilityAction
  | SetErrorAction;

/**
 * Action creators
 */

// UI action creators
export const setActiveTab = (tab: Tab): SetActiveTabAction => ({
  type: ActionType.SET_ACTIVE_TAB,
  payload: tab,
});

export const setIsProcessing = (isProcessing: boolean): SetIsProcessingAction => ({
  type: ActionType.SET_IS_PROCESSING,
  payload: isProcessing,
});

export const setIsHistoryPanelOpen = (isOpen: boolean): SetIsHistoryPanelOpenAction => ({
  type: ActionType.SET_IS_HISTORY_PANEL_OPEN,
  payload: isOpen,
});

export const toggleHistoryPanel = (): ToggleHistoryPanelAction => ({
  type: ActionType.TOGGLE_HISTORY_PANEL,
});

// Settings action creators
export const setSettings = (settings: Settings): SetSettingsAction => ({
  type: ActionType.SET_SETTINGS,
  payload: settings,
});

export const updateSettings = (updates: Partial<Settings>): UpdateSettingsAction => ({
  type: ActionType.UPDATE_SETTINGS,
  payload: updates,
});

// Pinned notes action creators
export const setPinnedNotes = (notes: PinnedNote[]): SetPinnedNotesAction => ({
  type: ActionType.SET_PINNED_NOTES,
  payload: notes,
});

export const addPinnedNote = (note: PinnedNote): AddPinnedNoteAction => ({
  type: ActionType.ADD_PINNED_NOTE,
  payload: note,
});

export const updatePinnedNote = (
  id: string,
  updates: Partial<PinnedNote>
): UpdatePinnedNoteAction => ({
  type: ActionType.UPDATE_PINNED_NOTE,
  payload: { id, updates },
});

export const deletePinnedNote = (id: string): DeletePinnedNoteAction => ({
  type: ActionType.DELETE_PINNED_NOTE,
  payload: id,
});

// Current operation action creators
export const setCurrentText = (text: string): SetCurrentTextAction => ({
  type: ActionType.SET_CURRENT_TEXT,
  payload: text,
});

export const setCurrentResult = (result: string | null): SetCurrentResultAction => ({
  type: ActionType.SET_CURRENT_RESULT,
  payload: result,
});

// AI availability action creators
export const setAIAvailability = (availability: AIAvailability): SetAIAvailabilityAction => ({
  type: ActionType.SET_AI_AVAILABILITY,
  payload: availability,
});

// Error action creators
export const setError = (error: string | null): SetErrorAction => ({
  type: ActionType.SET_ERROR,
  payload: error,
});

/**
 * Reducer function to handle state updates
 * @param state - Current application state
 * @param action - Action to process
 * @returns New state after applying action
 */
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // UI actions
    case ActionType.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload,
      };

    case ActionType.SET_IS_PROCESSING:
      return {
        ...state,
        isProcessing: action.payload,
      };

    case ActionType.SET_IS_HISTORY_PANEL_OPEN:
      return {
        ...state,
        isHistoryPanelOpen: action.payload,
      };

    case ActionType.TOGGLE_HISTORY_PANEL:
      return {
        ...state,
        isHistoryPanelOpen: !state.isHistoryPanelOpen,
      };

    // Settings actions
    case ActionType.SET_SETTINGS:
      return {
        ...state,
        settings: action.payload,
      };

    case ActionType.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    // Pinned notes actions
    case ActionType.SET_PINNED_NOTES:
      return {
        ...state,
        pinnedNotes: action.payload,
      };

    case ActionType.ADD_PINNED_NOTE:
      return {
        ...state,
        pinnedNotes: [action.payload, ...state.pinnedNotes],
      };

    case ActionType.UPDATE_PINNED_NOTE: {
      const { id, updates } = action.payload;
      return {
        ...state,
        pinnedNotes: state.pinnedNotes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
        ),
      };
    }

    case ActionType.DELETE_PINNED_NOTE:
      return {
        ...state,
        pinnedNotes: state.pinnedNotes.filter((note) => note.id !== action.payload),
      };

    // Current operation actions
    case ActionType.SET_CURRENT_TEXT:
      return {
        ...state,
        currentText: action.payload,
      };

    case ActionType.SET_CURRENT_RESULT:
      return {
        ...state,
        currentResult: action.payload,
      };

    // AI availability actions
    case ActionType.SET_AI_AVAILABILITY:
      return {
        ...state,
        aiAvailability: action.payload,
      };

    // Error actions
    case ActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    default:
      return state;
  }
}
