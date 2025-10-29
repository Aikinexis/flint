/**
 * Application state store using React Context
 * Provides centralized state management for the Flint extension
 */

import { createContext, useContext } from 'react';
import type { Settings, PinnedNote } from '../services/storage';
import type { AIAvailability } from '../services/ai';

/**
 * Tab types for navigation
 */
export type Tab = 'home' | 'projects' | 'generate' | 'rewrite' | 'summary' | 'settings';

/**
 * Application state interface
 */
export interface AppState {
  // UI state
  activeTab: Tab;
  isProcessing: boolean;
  isHistoryPanelOpen: boolean;

  // Data
  settings: Settings;
  pinnedNotes: PinnedNote[];

  // Current operation
  currentText: string;
  currentResult: string | null;

  // AI availability
  aiAvailability: AIAvailability;

  // Errors
  error: string | null;
}

/**
 * State actions interface
 */
export interface AppActions {
  // UI actions
  setActiveTab: (tab: Tab) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setIsHistoryPanelOpen: (isOpen: boolean) => void;
  toggleHistoryPanel: () => void;

  // Settings actions
  setSettings: (settings: Settings) => void;
  updateSettings: (updates: Partial<Settings>) => void;

  // Pinned notes actions
  setPinnedNotes: (notes: PinnedNote[]) => void;
  addPinnedNote: (note: PinnedNote) => void;
  updatePinnedNote: (id: string, note: Partial<PinnedNote>) => void;
  deletePinnedNote: (id: string) => void;

  // Current operation actions
  setCurrentText: (text: string) => void;
  setCurrentResult: (result: string | null) => void;

  // AI availability actions
  setAIAvailability: (availability: AIAvailability) => void;
  checkAIAvailability: () => Promise<void>;

  // Error actions
  setError: (error: string | null) => void;
}

/**
 * Combined state and actions context type
 */
export interface AppContextType {
  state: AppState;
  actions: AppActions;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  language: 'en-US',
  theme: 'dark',
  localOnlyMode: false,
  accentHue: 255, // Default blue hue
};

/**
 * Initial application state
 */
export const initialState: AppState = {
  // UI state
  activeTab: 'home',
  isProcessing: false,
  isHistoryPanelOpen: false,

  // Data
  settings: DEFAULT_SETTINGS,
  pinnedNotes: [],

  // Current operation
  currentText: '',
  currentResult: null,

  // AI availability
  aiAvailability: {
    promptAPI: 'unavailable',
    summarizerAPI: 'unavailable',
    rewriterAPI: 'unavailable',
    writerAPI: 'unavailable',
  },

  // Errors
  error: null,
};

/**
 * App context - provides state and actions to all components
 */
export const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Hook to access app state and actions
 * @returns App context with state and actions
 * @throws Error if used outside of AppProvider
 */
export function useAppState(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
