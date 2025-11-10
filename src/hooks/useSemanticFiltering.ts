/**
 * React Hook for Semantic Filtering
 * Provides easy integration of semantic awareness into React components
 */

import { useState, useEffect, useCallback } from 'react';
import { SemanticMemoryService } from '../services/semanticMemory';
import type { ScoredMemoryItem } from '../utils/semanticEngine';

/**
 * Hook for semantic filtering of content
 * @param enabled - Whether semantic filtering is enabled
 * @returns Filtering functions and state
 */
export function useSemanticFiltering(enabled = true) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize semantic memory service
  useEffect(() => {
    if (!enabled) return;

    const initialize = async () => {
      try {
        setIsLoading(true);
        await SemanticMemoryService.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('[useSemanticFiltering] Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [enabled]);

  /**
   * Filters an array of items by semantic relevance
   */
  const filterItems = useCallback(
    async <T extends { id: string; text: string }>(
      items: T[],
      query: string,
      options?: {
        topK?: number;
        minScore?: number;
        maxJaccardScore?: number;
      }
    ): Promise<Array<T & { score: number }>> => {
      if (!enabled || !isInitialized || items.length === 0) {
        return items.map((item) => ({ ...item, score: 1.0 }));
      }

      try {
        const results = await SemanticMemoryService.filterForAI(items, query, {
          topK: options?.topK ?? 10,
          minSemanticScore: options?.minScore ?? 0.1,
          maxJaccardScore: options?.maxJaccardScore ?? 0.8,
          enableJaccardFilter: true,
        });

        // Map back to original items with scores
        return results.map((result) => {
          const original = items.find((item) => item.id === result.id);
          return {
            ...original!,
            score: result.score,
          };
        });
      } catch (err) {
        console.error('[useSemanticFiltering] Filtering failed:', err);
        return items.map((item) => ({ ...item, score: 1.0 }));
      }
    },
    [enabled, isInitialized]
  );

  /**
   * Filters pinned notes by relevance to a query
   */
  const filterPinnedNotes = useCallback(
    async (
      notes: string[],
      query: string,
      topK = 3
    ): Promise<Array<{ text: string; score: number; index: number }>> => {
      if (!enabled || !isInitialized || notes.length === 0) {
        return notes.map((text, index) => ({ text, score: 1.0, index }));
      }

      try {
        const items = notes.map((text, index) => ({
          id: `note-${index}`,
          text,
          index,
        }));

        const results = await SemanticMemoryService.filterForAI(items, query, {
          topK,
          minSemanticScore: 0.1,
          maxJaccardScore: 0.9,
          enableJaccardFilter: true,
        });

        return results.map((result) => {
          const original = items.find((item) => item.id === result.id);
          return {
            text: result.text,
            score: result.score,
            index: original?.index ?? 0,
          };
        });
      } catch (err) {
        console.error('[useSemanticFiltering] Note filtering failed:', err);
        return notes.map((text, index) => ({ text, score: 1.0, index }));
      }
    },
    [enabled, isInitialized]
  );

  /**
   * Searches semantic memory
   */
  const searchMemory = useCallback(
    async (query: string, topK = 5): Promise<ScoredMemoryItem[]> => {
      if (!enabled || !isInitialized) {
        return [];
      }

      try {
        return await SemanticMemoryService.search(query, {
          topK,
          minSemanticScore: 0.2,
          enableJaccardFilter: true,
        });
      } catch (err) {
        console.error('[useSemanticFiltering] Memory search failed:', err);
        return [];
      }
    },
    [enabled, isInitialized]
  );

  /**
   * Adds content to semantic memory
   */
  const rememberContent = useCallback(
    async (text: string, metadata?: Record<string, unknown>): Promise<void> => {
      if (!enabled || !isInitialized) {
        return;
      }

      try {
        await SemanticMemoryService.addMemory(text, {
          timestamp: Date.now(),
          ...metadata,
        });
      } catch (err) {
        console.error('[useSemanticFiltering] Failed to remember content:', err);
      }
    },
    [enabled, isInitialized]
  );

  return {
    isInitialized,
    isLoading,
    error,
    filterItems,
    filterPinnedNotes,
    searchMemory,
    rememberContent,
  };
}

/**
 * Hook for semantic memory statistics
 */
export function useSemanticMemoryStats() {
  const [stats, setStats] = useState<{
    totalMemories: number;
    vocabularySize: number;
  }>({ totalMemories: 0, vocabularySize: 0 });

  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const newStats = await SemanticMemoryService.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('[useSemanticMemoryStats] Failed to get stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    isLoading,
    refresh,
  };
}
