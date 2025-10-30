/**
 * Custom undo/redo hook for editor content
 * Tracks all content changes (manual and AI-generated) to provide reliable undo/redo
 */

import { useRef, useCallback } from 'react';

export interface UndoRedoState {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface UseUndoRedoReturn {
  pushState: (state: UndoRedoState) => void;
  undo: () => UndoRedoState | null;
  redo: () => UndoRedoState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

/**
 * Hook for managing undo/redo history
 * @param maxHistorySize - Maximum number of states to keep in history (default: 100)
 */
export function useUndoRedo(maxHistorySize: number = 100): UseUndoRedoReturn {
  // History stack: array of states
  const historyRef = useRef<UndoRedoState[]>([]);
  
  // Current position in history (-1 means no history)
  const currentIndexRef = useRef<number>(-1);

  /**
   * Push a new state to history
   * Clears any redo history when a new state is added
   */
  const pushState = useCallback(
    (state: UndoRedoState) => {
      // Remove any redo history (everything after current index)
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);

      // Add new state
      historyRef.current.push(state);

      // Limit history size
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift();
      } else {
        currentIndexRef.current++;
      }

      console.log('[UndoRedo] Pushed state. History size:', historyRef.current.length, 'Index:', currentIndexRef.current);
    },
    [maxHistorySize]
  );

  /**
   * Undo to previous state
   * @returns Previous state or null if can't undo
   */
  const undo = useCallback((): UndoRedoState | null => {
    if (currentIndexRef.current <= 0) {
      console.log('[UndoRedo] Cannot undo - at beginning of history');
      return null;
    }

    currentIndexRef.current--;
    const state = historyRef.current[currentIndexRef.current];
    console.log('[UndoRedo] Undo to index:', currentIndexRef.current);
    return state ?? null;
  }, []);

  /**
   * Redo to next state
   * @returns Next state or null if can't redo
   */
  const redo = useCallback((): UndoRedoState | null => {
    if (currentIndexRef.current >= historyRef.current.length - 1) {
      console.log('[UndoRedo] Cannot redo - at end of history');
      return null;
    }

    currentIndexRef.current++;
    const state = historyRef.current[currentIndexRef.current];
    console.log('[UndoRedo] Redo to index:', currentIndexRef.current);
    return state ?? null;
  }, []);

  /**
   * Check if undo is available
   */
  const canUndo = useCallback((): boolean => {
    return currentIndexRef.current > 0;
  }, []);

  /**
   * Check if redo is available
   */
  const canRedo = useCallback((): boolean => {
    return currentIndexRef.current < historyRef.current.length - 1;
  }, []);

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    console.log('[UndoRedo] History cleared');
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
