/**
 * Enhanced Context Engine with Semantic Awareness
 * Integrates semantic filtering with the existing context engine
 * Provides intelligent content filtering before AI processing
 */

import { SemanticMemoryService } from '../services/semanticMemory';
import type { SemanticSearchOptions } from './semanticEngine';

/**
 * Options for semantic context assembly
 */
export interface SemanticContextOptions {
  enableSemanticFiltering?: boolean;
  semanticSearchOptions?: SemanticSearchOptions;
  maxContextChars?: number;
}

/**
 * Filters pinned notes using semantic relevance
 * Returns only the most relevant notes for the current context
 * @param pinnedNotes - Array of pinned note texts
 * @param query - Current query or context
 * @param options - Semantic search options
 * @returns Filtered and ranked pinned notes
 */
export async function filterPinnedNotesSemanticly(
  pinnedNotes: string[],
  query: string,
  options: SemanticSearchOptions = {}
): Promise<string[]> {
  if (pinnedNotes.length === 0) {
    return [];
  }

  // Convert pinned notes to documents
  const documents = pinnedNotes.map((note, index) => ({
    id: `note-${index}`,
    text: note,
  }));

  // Filter using semantic awareness
  const filtered = await SemanticMemoryService.filterForAI(documents, query, {
    topK: 3, // Return top 3 most relevant notes
    minSemanticScore: 0.1,
    maxJaccardScore: 0.9, // Allow some overlap for notes
    enableJaccardFilter: true,
    ...options,
  });

  // Return filtered note texts in order of relevance
  return filtered.map((result) => result.text);
}

/**
 * Filters document sections using semantic relevance
 * Useful for large documents where only relevant sections should be included
 * @param sections - Array of document sections
 * @param query - Current query or context
 * @param options - Semantic search options
 * @returns Filtered and ranked sections
 */
export async function filterDocumentSections(
  sections: Array<{ id: string; text: string; heading?: string }>,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<Array<{ id: string; text: string; heading?: string; score: number }>> {
  if (sections.length === 0) {
    return [];
  }

  // Filter using semantic awareness
  const filtered = await SemanticMemoryService.filterForAI(sections, query, {
    topK: 5, // Return top 5 most relevant sections
    minSemanticScore: 0.15,
    maxJaccardScore: 0.85,
    enableJaccardFilter: true,
    ...options,
  });

  // Return with original metadata
  return filtered.map((result) => {
    const original = sections.find((s) => s.id === result.id);
    return {
      id: result.id,
      text: result.text,
      heading: original?.heading,
      score: result.score,
    };
  });
}

/**
 * Filters history items using semantic relevance
 * Returns only history items relevant to the current context
 * @param historyItems - Array of history items
 * @param query - Current query or context
 * @param options - Semantic search options
 * @returns Filtered and ranked history items
 */
export async function filterHistorySemanticly(
  historyItems: Array<{ id: string; text: string; type?: string }>,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<Array<{ id: string; text: string; type?: string; score: number }>> {
  if (historyItems.length === 0) {
    return [];
  }

  // Filter using semantic awareness
  const filtered = await SemanticMemoryService.filterForAI(historyItems, query, {
    topK: 5,
    minSemanticScore: 0.2,
    maxJaccardScore: 0.8,
    enableJaccardFilter: true,
    ...options,
  });

  // Return with original metadata
  return filtered.map((result) => {
    const original = historyItems.find((h) => h.id === result.id);
    return {
      id: result.id,
      text: result.text,
      type: original?.type,
      score: result.score,
    };
  });
}

/**
 * Assembles context with semantic filtering
 * Intelligently selects the most relevant content for AI processing
 * @param fullDocument - Complete document text
 * @param cursorPos - Current cursor position
 * @param query - User's query or instruction
 * @param pinnedNotes - Array of pinned notes
 * @param options - Semantic context options
 * @returns Assembled context with semantic filtering applied
 */
export async function assembleSemanticContext(
  fullDocument: string,
  cursorPos: number,
  query: string,
  pinnedNotes: string[] = [],
  options: SemanticContextOptions = {}
): Promise<{
  localContext: string;
  relevantNotes: string[];
  totalChars: number;
}> {
  const { enableSemanticFiltering = true, maxContextChars = 3000 } = options;

  // Extract local context around cursor (always include this)
  const localWindowSize = 1500;
  const start = Math.max(0, cursorPos - localWindowSize);
  const end = Math.min(fullDocument.length, cursorPos + localWindowSize);
  const localContext = fullDocument.slice(start, end);

  let relevantNotes: string[] = [];

  if (enableSemanticFiltering && pinnedNotes.length > 0) {
    // Filter pinned notes using semantic relevance
    relevantNotes = await filterPinnedNotesSemanticly(
      pinnedNotes,
      query + ' ' + localContext, // Combine query and local context for better matching
      options.semanticSearchOptions
    );
  } else {
    // No filtering - use all notes
    relevantNotes = pinnedNotes;
  }

  // Calculate total characters
  const totalChars = localContext.length + relevantNotes.join('\n').length;

  // If we exceed max context, trim notes
  if (totalChars > maxContextChars) {
    const availableForNotes = maxContextChars - localContext.length;
    let currentLength = 0;
    const trimmedNotes: string[] = [];

    for (const note of relevantNotes) {
      if (currentLength + note.length <= availableForNotes) {
        trimmedNotes.push(note);
        currentLength += note.length;
      } else {
        break;
      }
    }

    relevantNotes = trimmedNotes;
  }

  return {
    localContext,
    relevantNotes,
    totalChars: localContext.length + relevantNotes.join('\n').length,
  };
}

/**
 * Formats semantic context for AI prompt
 * @param context - Assembled semantic context
 * @returns Formatted prompt string
 */
export function formatSemanticContextForPrompt(context: {
  localContext: string;
  relevantNotes: string[];
}): string {
  let prompt = '';

  // Add relevant notes first (most important context)
  if (context.relevantNotes.length > 0) {
    prompt += 'RELEVANT CONTEXT AND GUIDANCE:\n';
    context.relevantNotes.forEach((note, index) => {
      prompt += `${index + 1}. ${note}\n`;
    });
    prompt += '\n';
  }

  // Add local document context
  if (context.localContext) {
    prompt += 'DOCUMENT CONTEXT:\n';
    prompt += context.localContext;
    prompt += '\n';
  }

  return prompt;
}

/**
 * Example: Enhanced generate function with semantic filtering
 * This shows how to integrate semantic filtering into AI operations
 */
export async function generateWithSemanticContext(
  prompt: string,
  fullDocument: string,
  cursorPos: number,
  pinnedNotes: string[] = [],
  options: SemanticContextOptions = {}
): Promise<{
  context: string;
  relevantNotesUsed: string[];
  stats: {
    totalNotes: number;
    filteredNotes: number;
    contextChars: number;
  };
}> {
  // Assemble context with semantic filtering
  const semanticContext = await assembleSemanticContext(
    fullDocument,
    cursorPos,
    prompt,
    pinnedNotes,
    options
  );

  // Format for AI prompt
  const formattedContext = formatSemanticContextForPrompt(semanticContext);

  return {
    context: formattedContext,
    relevantNotesUsed: semanticContext.relevantNotes,
    stats: {
      totalNotes: pinnedNotes.length,
      filteredNotes: semanticContext.relevantNotes.length,
      contextChars: semanticContext.totalChars,
    },
  };
}
