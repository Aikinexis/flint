/**
 * AI Service with Semantic Awareness Integration
 * Example showing how to integrate semantic filtering into existing AI operations
 */

import { AIService, type GenerateOptions, type RewriteOptions } from './ai';
import { SemanticMemoryService } from './semanticMemory';
import {
  filterPinnedNotesSemanticly,
  assembleSemanticContext,
} from '../utils/contextEngineWithSemantics';

/**
 * Enhanced generate options with semantic filtering
 */
export interface SemanticGenerateOptions extends GenerateOptions {
  enableSemanticFiltering?: boolean;
  semanticFilterTopK?: number;
  semanticMinScore?: number;
}

/**
 * Enhanced rewrite options with semantic filtering
 */
export interface SemanticRewriteOptions extends RewriteOptions {
  enableSemanticFiltering?: boolean;
  semanticFilterTopK?: number;
}

/**
 * AI Service with Semantic Awareness
 * Wraps the existing AIService with intelligent content filtering
 */
export class AIServiceWithSemantics {
  /**
   * Initializes the semantic memory service
   * Call this once on app startup
   */
  static async initialize(): Promise<void> {
    await SemanticMemoryService.initialize();
    console.log('[AIWithSemantics] Semantic memory service initialized');
  }

  /**
   * Generates text with semantic filtering of pinned notes
   * Only includes the most relevant notes for the current context
   * @param prompt - The generation prompt
   * @param options - Generation options with semantic filtering
   * @returns Promise resolving to generated text
   */
  static async generate(prompt: string, options: SemanticGenerateOptions = {}): Promise<string> {
    const {
      enableSemanticFiltering = true,
      semanticFilterTopK = 3,
      semanticMinScore = 0.1,
      pinnedNotes = [],
      context,
      ...aiOptions
    } = options;

    let filteredNotes = pinnedNotes;

    // Apply semantic filtering to pinned notes if enabled
    if (enableSemanticFiltering && pinnedNotes.length > 0) {
      try {
        // Combine prompt and context for better relevance matching
        const queryContext = context ? `${prompt} ${context}` : prompt;

        filteredNotes = await filterPinnedNotesSemanticly(pinnedNotes, queryContext, {
          topK: semanticFilterTopK,
          minSemanticScore: semanticMinScore,
          maxJaccardScore: 0.9,
          enableJaccardFilter: true,
        });

        console.log(
          `[AIWithSemantics] Filtered ${pinnedNotes.length} notes → ${filteredNotes.length} relevant notes`
        );
      } catch (error) {
        console.error('[AIWithSemantics] Semantic filtering failed, using all notes:', error);
        filteredNotes = pinnedNotes;
      }
    }

    // Call original AI service with filtered notes
    return AIService.generate(prompt, {
      ...aiOptions,
      context,
      pinnedNotes: filteredNotes,
    });
  }

  /**
   * Generates text with full semantic context assembly
   * Intelligently selects relevant content from document and notes
   * @param prompt - The generation prompt
   * @param fullDocument - Complete document text
   * @param cursorPos - Current cursor position
   * @param options - Generation options with semantic filtering
   * @returns Promise resolving to generated text and metadata
   */
  static async generateWithContext(
    prompt: string,
    fullDocument: string,
    cursorPos: number,
    options: SemanticGenerateOptions = {}
  ): Promise<{
    text: string;
    metadata: {
      totalNotes: number;
      filteredNotes: number;
      contextChars: number;
    };
  }> {
    const {
      enableSemanticFiltering = true,
      semanticFilterTopK = 3,
      semanticMinScore = 0.1,
      pinnedNotes = [],
      ...aiOptions
    } = options;

    let assembledContext: string;
    let relevantNotes: string[];
    let stats = {
      totalNotes: pinnedNotes.length,
      filteredNotes: pinnedNotes.length,
      contextChars: 0,
    };

    if (enableSemanticFiltering) {
      try {
        // Assemble context with semantic filtering
        const semanticContext = await assembleSemanticContext(
          fullDocument,
          cursorPos,
          prompt,
          pinnedNotes,
          {
            enableSemanticFiltering: true,
            maxContextChars: 3000,
            semanticSearchOptions: {
              topK: semanticFilterTopK,
              minSemanticScore: semanticMinScore,
              maxJaccardScore: 0.9,
              enableJaccardFilter: true,
            },
          }
        );

        assembledContext = semanticContext.localContext;
        relevantNotes = semanticContext.relevantNotes;
        stats = {
          totalNotes: pinnedNotes.length,
          filteredNotes: relevantNotes.length,
          contextChars: semanticContext.totalChars,
        };

        console.log(
          `[AIWithSemantics] Context assembled: ${stats.contextChars} chars, ${stats.filteredNotes}/${stats.totalNotes} notes`
        );
      } catch (error) {
        console.error('[AIWithSemantics] Context assembly failed, using basic context:', error);
        assembledContext = fullDocument.slice(
          Math.max(0, cursorPos - 1500),
          Math.min(fullDocument.length, cursorPos + 1500)
        );
        relevantNotes = pinnedNotes;
      }
    } else {
      // No semantic filtering - use basic context
      assembledContext = fullDocument.slice(
        Math.max(0, cursorPos - 1500),
        Math.min(fullDocument.length, cursorPos + 1500)
      );
      relevantNotes = pinnedNotes;
    }

    // Generate with filtered context
    const text = await AIService.generate(prompt, {
      ...aiOptions,
      context: assembledContext,
      pinnedNotes: relevantNotes,
    });

    return {
      text,
      metadata: stats,
    };
  }

  /**
   * Rewrites text with semantic filtering of pinned notes
   * @param text - The text to rewrite
   * @param options - Rewrite options with semantic filtering
   * @returns Promise resolving to rewritten text
   */
  static async rewrite(text: string, options: SemanticRewriteOptions = {}): Promise<string> {
    const {
      enableSemanticFiltering = true,
      semanticFilterTopK = 3,
      pinnedNotes = [],
      customPrompt,
      ...aiOptions
    } = options;

    let filteredNotes = pinnedNotes;

    // Apply semantic filtering to pinned notes if enabled
    if (enableSemanticFiltering && pinnedNotes.length > 0) {
      try {
        // Use the text and custom prompt for relevance matching
        const queryContext = customPrompt ? `${customPrompt} ${text}` : text;

        filteredNotes = await filterPinnedNotesSemanticly(pinnedNotes, queryContext, {
          topK: semanticFilterTopK,
          minSemanticScore: 0.1,
          maxJaccardScore: 0.9,
          enableJaccardFilter: true,
        });

        console.log(
          `[AIWithSemantics] Filtered ${pinnedNotes.length} notes → ${filteredNotes.length} relevant notes for rewrite`
        );
      } catch (error) {
        console.error('[AIWithSemantics] Semantic filtering failed, using all notes:', error);
        filteredNotes = pinnedNotes;
      }
    }

    // Call original AI service with filtered notes
    return AIService.rewrite(text, {
      ...aiOptions,
      customPrompt,
      pinnedNotes: filteredNotes,
    });
  }

  /**
   * Adds content to semantic memory for future reference
   * Useful for learning from user's writing style and preferences
   * @param text - Text to remember
   * @param metadata - Optional metadata
   */
  static async rememberContent(
    text: string,
    metadata?: { source?: string; type?: string; [key: string]: unknown }
  ): Promise<void> {
    try {
      await SemanticMemoryService.addMemory(text, {
        timestamp: Date.now(),
        ...metadata,
      });
      console.log('[AIWithSemantics] Content added to semantic memory');
    } catch (error) {
      console.error('[AIWithSemantics] Failed to add to semantic memory:', error);
    }
  }

  /**
   * Searches semantic memory for relevant past content
   * @param query - Search query
   * @param topK - Number of results to return
   * @returns Array of relevant memories
   */
  static async searchMemory(
    query: string,
    topK = 5
  ): Promise<Array<{ text: string; score: number; metadata?: Record<string, unknown> }>> {
    try {
      const results = await SemanticMemoryService.search(query, {
        topK,
        minSemanticScore: 0.2,
        enableJaccardFilter: true,
      });

      return results.map((r) => ({
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      }));
    } catch (error) {
      console.error('[AIWithSemantics] Memory search failed:', error);
      return [];
    }
  }

  /**
   * Gets semantic memory statistics
   */
  static async getMemoryStats(): Promise<{
    totalMemories: number;
    vocabularySize: number;
  }> {
    return SemanticMemoryService.getStats();
  }

  /**
   * Clears all semantic memories
   */
  static async clearMemory(): Promise<void> {
    await SemanticMemoryService.clearAllMemories();
    console.log('[AIWithSemantics] Semantic memory cleared');
  }
}
