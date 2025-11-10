/**
 * Semantic Awareness Engine
 * Local semantic filtering using embeddings, cosine similarity, and Jaccard filtering
 * Provides context-aware memory and relevance scoring without external APIs
 */

/**
 * Simple TF-IDF based embedding for lightweight local semantic analysis
 * This avoids heavy dependencies while providing meaningful semantic vectors
 */
export class LocalEmbedder {
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private documentCount = 0;

  /**
   * Tokenizes text into normalized words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2); // Filter out very short words
  }

  /**
   * Builds vocabulary and IDF scores from a corpus of documents
   * @param documents - Array of text documents to learn from
   */
  train(documents: string[]): void {
    this.documentCount = documents.length;
    const documentFrequency = new Map<string, number>();

    // Count document frequency for each term
    documents.forEach((doc) => {
      const tokens = new Set(this.tokenize(doc));
      tokens.forEach((token) => {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      });
    });

    // Build vocabulary and calculate IDF scores
    let vocabIndex = 0;
    documentFrequency.forEach((docFreq, term) => {
      this.vocabulary.set(term, vocabIndex++);
      // IDF = log(N / df) where N is total docs and df is document frequency
      this.idfScores.set(term, Math.log(this.documentCount / docFreq));
    });
  }

  /**
   * Generates a TF-IDF embedding vector for text
   * @param text - Text to embed
   * @returns Normalized embedding vector
   */
  embed(text: string): number[] {
    const tokens = this.tokenize(text);
    const termFrequency = new Map<string, number>();

    // Calculate term frequency
    tokens.forEach((token) => {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    });

    // Create TF-IDF vector
    const vector = new Array(this.vocabulary.size).fill(0);
    termFrequency.forEach((tf, term) => {
      const vocabIndex = this.vocabulary.get(term);
      const idf = this.idfScores.get(term);
      if (vocabIndex !== undefined && idf !== undefined) {
        vector[vocabIndex] = tf * idf;
      }
    });

    // Normalize vector
    return this.normalize(vector);
  }

  /**
   * Normalizes a vector to unit length
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  /**
   * Gets the vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }
}

/**
 * Calculates cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Calculates Jaccard similarity between two texts
 * Measures literal token overlap to filter near-duplicates
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Jaccard similarity score between 0 and 1
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const tokens2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const intersection = new Set([...tokens1].filter((token) => tokens2.has(token)));
  const union = new Set([...tokens1, ...tokens2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Memory item with semantic embedding
 */
export interface SemanticMemoryItem {
  id: string;
  text: string;
  embedding: number[];
  metadata?: {
    timestamp?: number;
    source?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

/**
 * Scored memory item with relevance score
 */
export interface ScoredMemoryItem extends SemanticMemoryItem {
  score: number;
  jaccardScore?: number;
}

/**
 * Options for semantic search
 */
export interface SemanticSearchOptions {
  topK?: number; // Number of top results to return
  minSemanticScore?: number; // Minimum cosine similarity threshold
  maxJaccardScore?: number; // Maximum Jaccard similarity (to filter duplicates)
  enableJaccardFilter?: boolean; // Whether to apply Jaccard filtering
}

/**
 * Semantic Memory Manager
 * Manages a collection of memory items with semantic search capabilities
 */
export class SemanticMemoryManager {
  private embedder: LocalEmbedder;
  private memories: Map<string, SemanticMemoryItem> = new Map();

  constructor(embedder?: LocalEmbedder) {
    this.embedder = embedder || new LocalEmbedder();
  }

  /**
   * Trains the embedder on existing memories
   * Should be called after adding initial memories or periodically to update
   */
  train(): void {
    const documents = Array.from(this.memories.values()).map((m) => m.text);
    if (documents.length > 0) {
      this.embedder.train(documents);
    }
  }

  /**
   * Adds a memory item
   * @param id - Unique identifier
   * @param text - Text content
   * @param metadata - Optional metadata
   * @returns The created memory item
   */
  addMemory(
    id: string,
    text: string,
    metadata?: SemanticMemoryItem['metadata']
  ): SemanticMemoryItem {
    const embedding = this.embedder.embed(text);
    const memory: SemanticMemoryItem = {
      id,
      text,
      embedding,
      metadata,
    };
    this.memories.set(id, memory);
    return memory;
  }

  /**
   * Removes a memory item
   * @param id - Memory ID to remove
   */
  removeMemory(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * Gets a memory item by ID
   * @param id - Memory ID
   */
  getMemory(id: string): SemanticMemoryItem | undefined {
    return this.memories.get(id);
  }

  /**
   * Gets all memory items
   */
  getAllMemories(): SemanticMemoryItem[] {
    return Array.from(this.memories.values());
  }

  /**
   * Clears all memories
   */
  clearMemories(): void {
    this.memories.clear();
  }

  /**
   * Searches for semantically similar memories
   * @param query - Query text
   * @param options - Search options
   * @returns Array of scored memory items, sorted by relevance
   */
  search(query: string, options: SemanticSearchOptions = {}): ScoredMemoryItem[] {
    const {
      topK = 10,
      minSemanticScore = 0.0,
      maxJaccardScore = 0.8,
      enableJaccardFilter = true,
    } = options;

    // Embed the query
    const queryEmbedding = this.embedder.embed(query);

    // Calculate semantic similarity for all memories
    const scored: ScoredMemoryItem[] = Array.from(this.memories.values()).map((memory) => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding),
      jaccardScore: enableJaccardFilter ? jaccardSimilarity(query, memory.text) : undefined,
    }));

    // Filter by minimum semantic score
    let filtered = scored.filter((item) => item.score >= minSemanticScore);

    // Apply Jaccard filter to remove near-duplicates
    if (enableJaccardFilter) {
      filtered = filtered.filter((item) => (item.jaccardScore || 0) <= maxJaccardScore);
    }

    // Sort by semantic score (descending)
    filtered.sort((a, b) => b.score - a.score);

    // Return top K results
    return filtered.slice(0, topK);
  }

  /**
   * Finds similar memories to a given memory item
   * Useful for clustering and deduplication
   * @param memoryId - ID of the memory to find similar items for
   * @param options - Search options
   * @returns Array of similar memory items
   */
  findSimilar(memoryId: string, options: SemanticSearchOptions = {}): ScoredMemoryItem[] {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      return [];
    }

    const { topK = 10, minSemanticScore = 0.5 } = options;

    // Calculate similarity to all other memories
    const scored: ScoredMemoryItem[] = Array.from(this.memories.values())
      .filter((m) => m.id !== memoryId) // Exclude self
      .map((m) => ({
        ...m,
        score: cosineSimilarity(memory.embedding, m.embedding),
        jaccardScore: jaccardSimilarity(memory.text, m.text),
      }));

    // Filter and sort
    const filtered = scored.filter((item) => item.score >= minSemanticScore);
    filtered.sort((a, b) => b.score - a.score);

    return filtered.slice(0, topK);
  }

  /**
   * Gets memory statistics
   */
  getStats(): {
    totalMemories: number;
    vocabularySize: number;
  } {
    return {
      totalMemories: this.memories.size,
      vocabularySize: this.embedder.getVocabularySize(),
    };
  }

  /**
   * Exports memories for persistence
   */
  export(): SemanticMemoryItem[] {
    return Array.from(this.memories.values());
  }

  /**
   * Imports memories from persistence
   * @param memories - Array of memory items to import
   */
  import(memories: SemanticMemoryItem[]): void {
    this.memories.clear();
    memories.forEach((memory) => {
      this.memories.set(memory.id, memory);
    });
  }
}

/**
 * Creates a semantic filter for context-aware AI input
 * This is the main integration point for filtering content before AI processing
 * @param documents - Array of document texts to filter
 * @param query - Query or context to match against
 * @param options - Search options
 * @returns Filtered and ranked documents
 */
export function createSemanticFilter(
  documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>,
  query: string,
  options: SemanticSearchOptions = {}
): ScoredMemoryItem[] {
  // Create a temporary memory manager
  const manager = new SemanticMemoryManager();

  // Add all documents as memories
  documents.forEach((doc) => {
    manager.addMemory(doc.id, doc.text, doc.metadata);
  });

  // Train the embedder
  manager.train();

  // Search and return results
  return manager.search(query, options);
}
