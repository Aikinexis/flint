/**
 * Semantic Memory Service
 * Persistent semantic memory storage with IndexedDB integration
 * Provides context-aware filtering for AI operations
 */

import {
  SemanticMemoryManager,
  LocalEmbedder,
  type SemanticMemoryItem,
  type ScoredMemoryItem,
  type SemanticSearchOptions,
} from '../utils/semanticEngine';
import { generateId } from '../utils/id';

/**
 * IndexedDB configuration for semantic memories
 */
const DB_NAME = 'flint-semantic-db';
const DB_VERSION = 1;
const SEMANTIC_MEMORY_STORE = 'semanticMemories';
const MAX_MEMORIES = 1000; // Limit to prevent storage bloat

/**
 * Semantic memory with persistence metadata
 */
export interface PersistentSemanticMemory extends SemanticMemoryItem {
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

/**
 * Semantic Memory Service
 * Manages persistent semantic memories with automatic training and cleanup
 */
export class SemanticMemoryService {
  private static manager: SemanticMemoryManager | null = null;
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isInitialized = false;

  /**
   * Opens or creates the IndexedDB database
   */
  private static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SemanticMemory] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create semantic memories store
        if (!db.objectStoreNames.contains(SEMANTIC_MEMORY_STORE)) {
          const store = db.createObjectStore(SEMANTIC_MEMORY_STORE, { keyPath: 'id' });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          store.createIndex('accessCount', 'accessCount', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Initializes the semantic memory manager
   * Loads existing memories from IndexedDB and trains the embedder
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[SemanticMemory] Initializing...');

      // Create manager
      this.manager = new SemanticMemoryManager(new LocalEmbedder());

      // Load existing memories from IndexedDB
      const memories = await this.loadAllMemories();
      console.log(`[SemanticMemory] Loaded ${memories.length} memories from storage`);

      // Import memories into manager
      if (memories.length > 0) {
        this.manager.import(memories);
        this.manager.train();
        console.log('[SemanticMemory] Trained embedder on existing memories');
      }

      this.isInitialized = true;
      console.log('[SemanticMemory] Initialization complete');
    } catch (error) {
      console.error('[SemanticMemory] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensures the service is initialized
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Loads all memories from IndexedDB
   */
  private static async loadAllMemories(): Promise<SemanticMemoryItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readonly');
        const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const memories = request.result as PersistentSemanticMemory[];
          // Convert to SemanticMemoryItem format
          resolve(
            memories.map((m) => ({
              id: m.id,
              text: m.text,
              embedding: m.embedding,
              metadata: m.metadata,
            }))
          );
        };

        request.onerror = () => {
          console.error('[SemanticMemory] Failed to load memories:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SemanticMemory] Failed to load memories:', error);
      return [];
    }
  }

  /**
   * Saves a memory to IndexedDB
   */
  private static async saveMemoryToDB(memory: PersistentSemanticMemory): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readwrite');
        const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
        const request = store.put(memory);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('[SemanticMemory] Failed to save memory:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SemanticMemory] Failed to save memory:', error);
      throw error;
    }
  }

  /**
   * Deletes a memory from IndexedDB
   */
  private static async deleteMemoryFromDB(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readwrite');
        const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('[SemanticMemory] Failed to delete memory:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SemanticMemory] Failed to delete memory:', error);
      throw error;
    }
  }

  /**
   * Adds a new semantic memory
   * @param text - Text content to remember
   * @param metadata - Optional metadata
   * @returns The created memory item
   */
  static async addMemory(
    text: string,
    metadata?: SemanticMemoryItem['metadata']
  ): Promise<PersistentSemanticMemory> {
    await this.ensureInitialized();

    if (!this.manager) {
      throw new Error('Semantic memory manager not initialized');
    }

    // Check if we need to cleanup old memories
    const stats = this.manager.getStats();
    if (stats.totalMemories >= MAX_MEMORIES) {
      await this.cleanupOldMemories();
    }

    // Create memory
    const id = generateId();
    const now = Date.now();
    const memory = this.manager.addMemory(id, text, metadata);

    // Create persistent version
    const persistentMemory: PersistentSemanticMemory = {
      ...memory,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    // Save to IndexedDB
    await this.saveMemoryToDB(persistentMemory);

    // Retrain embedder periodically (every 10 memories)
    if (stats.totalMemories % 10 === 0) {
      this.manager.train();
    }

    return persistentMemory;
  }

  /**
   * Searches for semantically similar memories
   * @param query - Query text
   * @param options - Search options
   * @returns Array of scored memory items
   */
  static async search(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<ScoredMemoryItem[]> {
    await this.ensureInitialized();

    if (!this.manager) {
      throw new Error('Semantic memory manager not initialized');
    }

    // Perform search
    const results = this.manager.search(query, options);

    // Update access statistics for returned memories
    const updatePromises = results.map(async (result) => {
      try {
        const db = await this.getDB();
        return new Promise<void>((resolve) => {
          const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readwrite');
          const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
          const getRequest = store.get(result.id);

          getRequest.onsuccess = () => {
            const memory = getRequest.result as PersistentSemanticMemory | undefined;
            if (memory) {
              memory.lastAccessedAt = Date.now();
              memory.accessCount += 1;
              store.put(memory);
            }
            resolve();
          };

          getRequest.onerror = () => resolve(); // Fail silently
        });
      } catch (error) {
        // Fail silently - access tracking is not critical
        return;
      }
    });

    // Update in background (don't wait)
    Promise.all(updatePromises).catch(() => {
      // Ignore errors
    });

    return results;
  }

  /**
   * Removes a memory
   * @param id - Memory ID
   */
  static async removeMemory(id: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.manager) {
      throw new Error('Semantic memory manager not initialized');
    }

    this.manager.removeMemory(id);
    await this.deleteMemoryFromDB(id);
  }

  /**
   * Clears all memories
   */
  static async clearAllMemories(): Promise<void> {
    await this.ensureInitialized();

    if (!this.manager) {
      throw new Error('Semantic memory manager not initialized');
    }

    this.manager.clearMemories();

    // Clear IndexedDB
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readwrite');
        const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SemanticMemory] Failed to clear memories:', error);
      throw error;
    }
  }

  /**
   * Cleans up old, rarely accessed memories
   * Removes the least recently used memories when storage limit is reached
   */
  private static async cleanupOldMemories(): Promise<void> {
    try {
      const db = await this.getDB();
      const memories = await new Promise<PersistentSemanticMemory[]>((resolve, reject) => {
        const transaction = db.transaction(SEMANTIC_MEMORY_STORE, 'readonly');
        const store = transaction.objectStore(SEMANTIC_MEMORY_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sort by last accessed (oldest first)
      memories.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      // Delete oldest 20%
      const toDelete = Math.ceil(memories.length * 0.2);
      const deletePromises = memories.slice(0, toDelete).map((memory) => {
        if (this.manager) {
          this.manager.removeMemory(memory.id);
        }
        return this.deleteMemoryFromDB(memory.id);
      });

      await Promise.all(deletePromises);
      console.log(`[SemanticMemory] Cleaned up ${toDelete} old memories`);
    } catch (error) {
      console.error('[SemanticMemory] Cleanup failed:', error);
    }
  }

  /**
   * Gets memory statistics
   */
  static async getStats(): Promise<{
    totalMemories: number;
    vocabularySize: number;
  }> {
    await this.ensureInitialized();

    if (!this.manager) {
      return { totalMemories: 0, vocabularySize: 0 };
    }

    return this.manager.getStats();
  }

  /**
   * Filters content for AI input using semantic awareness
   * This is the main integration point for context-aware filtering
   * @param documents - Array of documents to filter
   * @param query - Query or context to match against
   * @param options - Search options
   * @returns Filtered and ranked documents
   */
  static async filterForAI(
    documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>,
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<ScoredMemoryItem[]> {
    await this.ensureInitialized();

    if (!this.manager) {
      throw new Error('Semantic memory manager not initialized');
    }

    // Create temporary memories for filtering
    const tempManager = new SemanticMemoryManager(new LocalEmbedder());

    documents.forEach((doc) => {
      tempManager.addMemory(doc.id, doc.text, doc.metadata);
    });

    // Train on the document set
    tempManager.train();

    // Search and return filtered results
    return tempManager.search(query, {
      topK: 10,
      minSemanticScore: 0.1,
      maxJaccardScore: 0.8,
      enableJaccardFilter: true,
      ...options,
    });
  }
}
