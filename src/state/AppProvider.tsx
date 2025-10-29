/**
 * App Provider component
 * Wraps the application with state context
 */

import { ReactNode, useState, useCallback, useEffect } from 'react';
import { AppContext, initialState, type AppState, type AppActions, type Tab } from './store';
import { StorageService, type Settings, type PinnedNote } from '../services/storage';
import { AIService, type AIAvailability } from '../services/ai';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * App Provider component that manages application state
 */
export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(initialState);

  // ===== UI Actions =====

  const setActiveTab = useCallback((tab: Tab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    setState((prev) => ({ ...prev, isProcessing }));
  }, []);

  const setIsHistoryPanelOpen = useCallback((isOpen: boolean) => {
    setState((prev) => ({ ...prev, isHistoryPanelOpen: isOpen }));
  }, []);

  const toggleHistoryPanel = useCallback(() => {
    setState((prev) => ({ ...prev, isHistoryPanelOpen: !prev.isHistoryPanelOpen }));
  }, []);

  // ===== Settings Actions =====

  const setSettings = useCallback((settings: Settings) => {
    setState((prev) => ({ ...prev, settings }));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));

    // Persist to storage
    try {
      await StorageService.updateSettings(updates);
    } catch (error) {
      console.error('[AppProvider] Failed to update settings:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save settings',
      }));
    }
  }, []);

  // ===== Pinned Notes Actions =====

  const setPinnedNotes = useCallback((pinnedNotes: PinnedNote[]) => {
    setState((prev) => ({ ...prev, pinnedNotes }));
  }, []);

  const addPinnedNote = useCallback(async (note: PinnedNote) => {
    // Optimistically update state
    setState((prev) => ({
      ...prev,
      pinnedNotes: [note, ...prev.pinnedNotes],
    }));

    // Persist to storage
    try {
      await StorageService.savePinnedNote(note);
    } catch (error) {
      console.error('[AppProvider] Failed to add pinned note:', error);
      // Revert optimistic update on error
      setState((prev) => ({
        ...prev,
        pinnedNotes: prev.pinnedNotes.filter((n) => n.id !== note.id),
        error: error instanceof Error ? error.message : 'Failed to save pinned note',
      }));
    }
  }, []);

  const updatePinnedNote = useCallback(async (id: string, updates: Partial<PinnedNote>) => {
    // Store old note for rollback
    let oldNote: PinnedNote | undefined;
    setState((prev) => {
      oldNote = prev.pinnedNotes.find((n) => n.id === id);
      return {
        ...prev,
        pinnedNotes: prev.pinnedNotes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
        ),
      };
    });

    // Persist to storage
    try {
      const noteToUpdate = oldNote ? { ...oldNote, ...updates } : undefined;
      if (noteToUpdate) {
        await StorageService.savePinnedNote(noteToUpdate);
      }
    } catch (error) {
      console.error('[AppProvider] Failed to update pinned note:', error);
      // Revert to old note on error
      if (oldNote) {
        setState((prev) => ({
          ...prev,
          pinnedNotes: prev.pinnedNotes.map((note) => (note.id === id ? oldNote! : note)),
          error: error instanceof Error ? error.message : 'Failed to update pinned note',
        }));
      }
    }
  }, []);

  const deletePinnedNote = useCallback(async (id: string) => {
    // Store old note for rollback
    let oldNote: PinnedNote | undefined;
    setState((prev) => {
      oldNote = prev.pinnedNotes.find((n) => n.id === id);
      return {
        ...prev,
        pinnedNotes: prev.pinnedNotes.filter((note) => note.id !== id),
      };
    });

    // Persist to storage
    try {
      await StorageService.deletePinnedNote(id);
    } catch (error) {
      console.error('[AppProvider] Failed to delete pinned note:', error);
      // Revert deletion on error
      if (oldNote) {
        setState((prev) => ({
          ...prev,
          pinnedNotes: [oldNote!, ...prev.pinnedNotes],
          error: error instanceof Error ? error.message : 'Failed to delete pinned note',
        }));
      }
    }
  }, []);

  // ===== Current Operation Actions =====

  const setCurrentText = useCallback((currentText: string) => {
    setState((prev) => ({ ...prev, currentText }));
  }, []);

  const setCurrentResult = useCallback((currentResult: string | null) => {
    setState((prev) => ({ ...prev, currentResult }));
  }, []);

  // ===== AI Availability Actions =====

  const setAIAvailability = useCallback((aiAvailability: AIAvailability) => {
    setState((prev) => ({ ...prev, aiAvailability }));
  }, []);

  const checkAIAvailability = useCallback(async () => {
    try {
      const availability = await AIService.checkAvailability();
      setAIAvailability(availability);
    } catch (error) {
      console.error('[AppProvider] Failed to check AI availability:', error);
      // Set all to unavailable on error
      setAIAvailability({
        promptAPI: 'unavailable',
        summarizerAPI: 'unavailable',
        rewriterAPI: 'unavailable',
        writerAPI: 'unavailable',
      });
    }
  }, [setAIAvailability]);

  // ===== Error Actions =====

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // ===== Actions Object =====

  const actions: AppActions = {
    setActiveTab,
    setIsProcessing,
    setIsHistoryPanelOpen,
    toggleHistoryPanel,
    setSettings,
    updateSettings,
    setPinnedNotes,
    addPinnedNote,
    updatePinnedNote,
    deletePinnedNote,
    setCurrentText,
    setCurrentResult,
    setAIAvailability,
    checkAIAvailability,
    setError,
  };

  // ===== Initialization =====

  useEffect(() => {
    // Load initial data from storage
    const loadInitialData = async () => {
      try {
        console.log('[AppProvider] Loading initial data from storage...');

        // Load settings from chrome.storage.local
        const settings = await StorageService.getSettings();
        console.log('[AppProvider] Loaded settings:', settings);
        setSettings(settings);

        // Apply theme from settings
        if (settings.theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }

        // Load pinned notes from IndexedDB
        const notes = await StorageService.getPinnedNotes();
        console.log('[AppProvider] Loaded pinned notes:', notes.length);
        setPinnedNotes(notes);

        // Check AI availability
        await checkAIAvailability();

        console.log('[AppProvider] Initial data loaded successfully');
      } catch (error) {
        console.error('[AppProvider] Failed to load initial data:', error);
        setError('Failed to load application data');
      }
    };

    loadInitialData();
  }, [setSettings, setPinnedNotes, checkAIAvailability, setError]);

  // ===== Storage Listeners =====

  useEffect(() => {
    // Listen for settings changes from other contexts
    const cleanup = StorageService.onSettingsChange((newSettings) => {
      setSettings(newSettings);
    });

    return cleanup;
  }, [setSettings]);

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>;
}
