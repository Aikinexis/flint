/**
 * Storage service for managing persistent data
 * Uses chrome.storage.local for settings and IndexedDB for larger data
 */

import { generateId } from '../utils/id';

/**
 * Pinned note interface
 */
export interface PinnedNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * History item interface
 */
export interface HistoryItem {
  id: string;
  type: 'generate' | 'summarize' | 'rewrite';
  originalText: string;
  resultText: string;
  timestamp: number;
  liked?: boolean;
  metadata?: {
    mode?: string;
    preset?: string;
    confidence?: number;
  };
}

/**
 * Prompt history item interface for Generate panel
 */
export interface PromptHistoryItem {
  id: string;
  text: string;
  timestamp: number;
  pinned: boolean;
}

/**
 * Generate settings interface for Generate panel configuration
 */
export interface GenerateSettings {
  shortLength: number; // Word count target
  mediumLength: number; // Word count target
  contextAwarenessEnabled: boolean;
}

/**
 * Settings interface for user preferences
 */
export interface Settings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  localOnlyMode: boolean;
  accentHue: number; // Hue value (0-360) for OKLCH color system
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
 * Storage service base class
 */
class StorageServiceBase {
  private static readonly SETTINGS_KEY = 'settings';

  /**
   * Gets user settings from chrome.storage.local
   * @returns Promise resolving to settings object
   */
  static async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      if (result[this.SETTINGS_KEY]) {
        // Merge with defaults to handle new settings added in updates
        return { ...DEFAULT_SETTINGS, ...result[this.SETTINGS_KEY] };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[Storage] Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Saves user settings to chrome.storage.local
   * @param settings - The settings object to save
   * @returns Promise resolving when save is complete
   */
  static async saveSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings });
    } catch (error) {
      console.error('[Storage] Failed to save settings:', error);
      // Check if quota exceeded
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        throw new Error('Storage quota exceeded. Please clear some data.');
      }
      throw error;
    }
  }

  /**
   * Updates specific settings without overwriting all settings
   * @param updates - Partial settings object with values to update
   * @returns Promise resolving when update is complete
   */
  static async updateSettings(updates: Partial<Settings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    await this.saveSettings(newSettings);
  }

  /**
   * Clears all settings and resets to defaults
   * @returns Promise resolving when clear is complete
   */
  static async clearSettings(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.SETTINGS_KEY);
    } catch (error) {
      console.error('[Storage] Failed to clear settings:', error);
      throw error;
    }
  }

  /**
   * Listens for settings changes
   * @param callback - Function to call when settings change
   * @returns Cleanup function to remove listener
   */
  static onSettingsChange(
    callback: (newSettings: Settings, oldSettings: Settings) => void
  ): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[this.SETTINGS_KEY]) {
        const change = changes[this.SETTINGS_KEY];
        if (!change) return;

        const oldValue = change.oldValue as Settings | undefined;
        const newValue = change.newValue as Settings | undefined;
        if (oldValue && newValue) {
          callback(newValue, oldValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return cleanup function
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
}

/**
 * IndexedDB database name and version
 */
const DB_NAME = 'flint-db';
const DB_VERSION = 2;
const PINNED_NOTES_STORE = 'pinnedNotes';
const HISTORY_STORE = 'history';
const PROMPT_HISTORY_STORE = 'promptHistory';
const MAX_STORAGE_MB = 40;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * IndexedDB helper class
 */
class IndexedDBHelper {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Opens or creates the IndexedDB database
   * @returns Promise resolving to database instance
   */
  static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create pinned notes store (v1)
        if (!db.objectStoreNames.contains(PINNED_NOTES_STORE)) {
          const notesStore = db.createObjectStore(PINNED_NOTES_STORE, { keyPath: 'id' });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create history store (v1)
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('type', 'type', { unique: false });
        }

        // Create prompt history store (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains(PROMPT_HISTORY_STORE)) {
          const promptStore = db.createObjectStore(PROMPT_HISTORY_STORE, { keyPath: 'id' });
          promptStore.createIndex('timestamp', 'timestamp', { unique: false });
          promptStore.createIndex('pinned', 'pinned', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Performs a transaction on a store
   * @param storeName - Name of the object store
   * @param mode - Transaction mode
   * @param callback - Callback function with store access
   * @returns Promise resolving with callback result
   */
  static async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error(`[IndexedDB] Transaction failed on ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Gets all items from a store
   * @param storeName - Name of the object store
   * @returns Promise resolving to array of items
   */
  static async getAll<T>(storeName: string): Promise<T[]> {
    return this.transaction(storeName, 'readonly', (store) => store.getAll());
  }

  /**
   * Gets a single item by ID
   * @param storeName - Name of the object store
   * @param id - Item ID
   * @returns Promise resolving to item or undefined
   */
  static async get<T>(storeName: string, id: string): Promise<T | undefined> {
    return this.transaction(storeName, 'readonly', (store) => store.get(id));
  }

  /**
   * Adds or updates an item
   * @param storeName - Name of the object store
   * @param item - Item to save
   * @returns Promise resolving when save is complete
   */
  static async put<T>(storeName: string, item: T): Promise<void> {
    await this.transaction(storeName, 'readwrite', (store) => store.put(item));
  }

  /**
   * Deletes an item by ID
   * @param storeName - Name of the object store
   * @param id - Item ID
   * @returns Promise resolving when delete is complete
   */
  static async delete(storeName: string, id: string): Promise<void> {
    await this.transaction(storeName, 'readwrite', (store) => store.delete(id));
  }

  /**
   * Clears all items from a store
   * @param storeName - Name of the object store
   * @returns Promise resolving when clear is complete
   */
  static async clear(storeName: string): Promise<void> {
    await this.transaction(storeName, 'readwrite', (store) => store.clear());
  }
}

/**
 * Extends StorageServiceBase with IndexedDB methods
 */
export class StorageService extends StorageServiceBase {
  // ===== Pinned Notes Methods =====

  /**
   * Gets all pinned notes
   * @returns Promise resolving to array of pinned notes
   */
  static async getPinnedNotes(): Promise<PinnedNote[]> {
    try {
      const notes = await IndexedDBHelper.getAll<PinnedNote>(PINNED_NOTES_STORE);
      // Sort by most recently updated
      return notes.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('[Storage] Failed to get pinned notes:', error);
      return [];
    }
  }

  /**
   * Saves a pinned note
   * @param note - The note to save (without id if new)
   * @returns Promise resolving to the saved note with ID
   */
  static async savePinnedNote(
    note: Omit<PinnedNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<PinnedNote> {
    try {
      const now = Date.now();
      const fullNote: PinnedNote = {
        id: note.id || generateId(),
        title: note.title,
        content: note.content,
        createdAt: note.id ? (await this.getPinnedNote(note.id))?.createdAt || now : now,
        updatedAt: now,
      };

      await IndexedDBHelper.put(PINNED_NOTES_STORE, fullNote);
      return fullNote;
    } catch (error) {
      console.error('[Storage] Failed to save pinned note:', error);
      throw error;
    }
  }

  /**
   * Gets a single pinned note by ID
   * @param id - Note ID
   * @returns Promise resolving to note or undefined
   */
  static async getPinnedNote(id: string): Promise<PinnedNote | undefined> {
    try {
      return await IndexedDBHelper.get<PinnedNote>(PINNED_NOTES_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to get pinned note:', error);
      return undefined;
    }
  }

  /**
   * Deletes a pinned note
   * @param id - Note ID
   * @returns Promise resolving when delete is complete
   */
  static async deletePinnedNote(id: string): Promise<void> {
    try {
      await IndexedDBHelper.delete(PINNED_NOTES_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to delete pinned note:', error);
      throw error;
    }
  }

  // ===== History Methods =====

  /**
   * Gets history items with optional limit
   * @param limit - Maximum number of items to return
   * @returns Promise resolving to array of history items
   */
  static async getHistory(limit?: number): Promise<HistoryItem[]> {
    try {
      const items = await IndexedDBHelper.getAll<HistoryItem>(HISTORY_STORE);
      // Sort by most recent
      const sorted = items.sort((a, b) => b.timestamp - a.timestamp);
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('[Storage] Failed to get history:', error);
      return [];
    }
  }

  /**
   * Saves a history item
   * @param item - The history item to save (without id and timestamp if new)
   * @returns Promise resolving to the saved item with ID
   */
  static async saveHistoryItem(
    item: Omit<HistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
  ): Promise<HistoryItem> {
    try {
      const fullItem: HistoryItem = {
        id: item.id || generateId(),
        type: item.type,
        originalText: item.originalText,
        resultText: item.resultText,
        timestamp: item.timestamp || Date.now(),
        metadata: item.metadata,
      };

      await IndexedDBHelper.put(HISTORY_STORE, fullItem);

      // Check storage size and cleanup if needed
      await this.checkAndCleanupStorage();

      return fullItem;
    } catch (error) {
      console.error('[Storage] Failed to save history item:', error);
      throw error;
    }
  }

  /**
   * Searches history by text content
   * @param query - Search query
   * @returns Promise resolving to matching history items
   */
  static async searchHistory(query: string): Promise<HistoryItem[]> {
    try {
      const items = await this.getHistory();
      const lowerQuery = query.toLowerCase();
      return items.filter(
        (item) =>
          item.originalText.toLowerCase().includes(lowerQuery) ||
          item.resultText.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('[Storage] Failed to search history:', error);
      return [];
    }
  }

  /**
   * Toggles the liked status of a history item
   * @param id - History item ID
   * @returns Promise resolving to updated item
   */
  static async toggleHistoryLiked(id: string): Promise<HistoryItem | undefined> {
    try {
      const item = await IndexedDBHelper.get<HistoryItem>(HISTORY_STORE, id);
      if (!item) return undefined;

      const updatedItem: HistoryItem = {
        ...item,
        liked: !item.liked,
      };

      await IndexedDBHelper.put(HISTORY_STORE, updatedItem);
      return updatedItem;
    } catch (error) {
      console.error('[Storage] Failed to toggle history liked:', error);
      throw error;
    }
  }

  /**
   * Clears all history items
   * @returns Promise resolving when clear is complete
   */
  static async clearHistory(): Promise<void> {
    try {
      await IndexedDBHelper.clear(HISTORY_STORE);
    } catch (error) {
      console.error('[Storage] Failed to clear history:', error);
      throw error;
    }
  }

  /**
   * Cleans up old history items (older than 30 days)
   * @returns Promise resolving to number of items deleted
   */
  static async cleanupOldHistory(): Promise<number> {
    try {
      const items = await IndexedDBHelper.getAll<HistoryItem>(HISTORY_STORE);
      const cutoffTime = Date.now() - THIRTY_DAYS_MS;
      const oldItems = items.filter((item) => item.timestamp < cutoffTime);

      for (const item of oldItems) {
        await IndexedDBHelper.delete(HISTORY_STORE, item.id);
      }

      return oldItems.length;
    } catch (error) {
      console.error('[Storage] Failed to cleanup old history:', error);
      return 0;
    }
  }

  /**
   * Checks storage size and cleans up if over limit
   * @returns Promise resolving when check is complete
   */
  private static async checkAndCleanupStorage(): Promise<void> {
    try {
      // Estimate storage usage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage || 0) / (1024 * 1024);

        if (usageMB > MAX_STORAGE_MB) {
          // Delete oldest history items until under limit
          const items = await IndexedDBHelper.getAll<HistoryItem>(HISTORY_STORE);
          const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
          const toDelete = Math.ceil(sorted.length * 0.2); // Delete oldest 20%

          for (let i = 0; i < toDelete && i < sorted.length; i++) {
            await IndexedDBHelper.delete(HISTORY_STORE, sorted[i]!.id);
          }

          console.warn(`[Storage] Cleaned up ${toDelete} old history items due to storage limit`);
        }
      }
    } catch (error) {
      console.error('[Storage] Failed to check storage:', error);
    }
  }

  // ===== Prompt History Methods =====

  /**
   * Gets prompt history items with optional limit
   * @param limit - Maximum number of items to return (default: all)
   * @returns Promise resolving to array of prompt history items, sorted by pinned then timestamp
   */
  static async getPromptHistory(limit?: number): Promise<PromptHistoryItem[]> {
    try {
      const items = await IndexedDBHelper.getAll<PromptHistoryItem>(PROMPT_HISTORY_STORE);
      // Sort by pinned (true first), then by most recent timestamp
      const sorted = items.sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return b.timestamp - a.timestamp;
      });
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('[Storage] Failed to get prompt history:', error);
      return [];
    }
  }

  /**
   * Saves a prompt to history
   * @param text - The prompt text to save
   * @returns Promise resolving when save is complete
   */
  static async savePromptToHistory(text: string): Promise<void> {
    try {
      // Get current items before adding new one
      const allItems = await IndexedDBHelper.getAll<PromptHistoryItem>(PROMPT_HISTORY_STORE);
      
      // Check if we need to make room (max 4 items in recent history)
      // If all 4 slots are pinned, don't save the new prompt
      const pinnedCount = allItems.filter((item) => item.pinned).length;
      if (allItems.length >= 4 && pinnedCount >= 4) {
        console.log('[Storage] All 4 slots are pinned, not saving new prompt');
        return;
      }
      
      // If we have 4 items and at least one is unpinned, delete the oldest unpinned
      if (allItems.length >= 4) {
        const unpinnedItems = allItems
          .filter((item) => !item.pinned)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        if (unpinnedItems.length > 0) {
          await IndexedDBHelper.delete(PROMPT_HISTORY_STORE, unpinnedItems[0]!.id);
        }
      }

      const newItem: PromptHistoryItem = {
        id: generateId(),
        text: text,
        timestamp: Date.now(),
        pinned: false,
      };

      await IndexedDBHelper.put(PROMPT_HISTORY_STORE, newItem);
    } catch (error) {
      console.error('[Storage] Failed to save prompt to history:', error);
      // Don't throw - allow operation to continue without saving history
    }
  }

  /**
   * Toggles the pinned status of a prompt
   * @param id - Prompt history item ID
   * @returns Promise resolving when toggle is complete
   */
  static async togglePromptPin(id: string): Promise<void> {
    try {
      const item = await IndexedDBHelper.get<PromptHistoryItem>(PROMPT_HISTORY_STORE, id);
      if (!item) {
        console.warn('[Storage] Prompt history item not found:', id);
        return;
      }

      const updatedItem: PromptHistoryItem = {
        ...item,
        pinned: !item.pinned,
      };

      await IndexedDBHelper.put(PROMPT_HISTORY_STORE, updatedItem);
    } catch (error) {
      console.error('[Storage] Failed to toggle prompt pin:', error);
      throw error;
    }
  }

  /**
   * Deletes a prompt from history
   * @param id - Prompt history item ID
   * @returns Promise resolving when delete is complete
   */
  static async deletePromptFromHistory(id: string): Promise<void> {
    try {
      await IndexedDBHelper.delete(PROMPT_HISTORY_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to delete prompt from history:', error);
      throw error;
    }
  }

  /**
   * Cleans up old unpinned prompts (older than 30 days)
   * @returns Promise resolving to number of items deleted
   */
  static async cleanupOldPrompts(): Promise<number> {
    try {
      const items = await IndexedDBHelper.getAll<PromptHistoryItem>(PROMPT_HISTORY_STORE);
      const cutoffTime = Date.now() - THIRTY_DAYS_MS;
      
      // Only delete unpinned items older than 30 days
      const oldUnpinnedItems = items.filter(
        (item) => !item.pinned && item.timestamp < cutoffTime
      );

      for (const item of oldUnpinnedItems) {
        await IndexedDBHelper.delete(PROMPT_HISTORY_STORE, item.id);
      }

      if (oldUnpinnedItems.length > 0) {
        console.log(`[Storage] Cleaned up ${oldUnpinnedItems.length} old prompts`);
      }

      return oldUnpinnedItems.length;
    } catch (error) {
      console.error('[Storage] Failed to cleanup old prompts:', error);
      return 0;
    }
  }

  // ===== Generate Settings Methods =====

  /**
   * Default generate settings (word counts)
   */
  private static readonly DEFAULT_GENERATE_SETTINGS: GenerateSettings = {
    shortLength: 100, // ~100 words
    mediumLength: 300, // ~300 words
    contextAwarenessEnabled: true,
  };

  /**
   * Gets generate settings from chrome.storage.local
   * @returns Promise resolving to generate settings
   */
  static async getGenerateSettings(): Promise<GenerateSettings> {
    try {
      const result = await chrome.storage.local.get('generateSettings');
      if (result.generateSettings) {
        // Merge with defaults to handle new settings added in updates
        return { ...this.DEFAULT_GENERATE_SETTINGS, ...result.generateSettings };
      }
      return this.DEFAULT_GENERATE_SETTINGS;
    } catch (error) {
      console.error('[Storage] Failed to get generate settings:', error);
      return this.DEFAULT_GENERATE_SETTINGS;
    }
  }

  /**
   * Saves generate settings to chrome.storage.local
   * @param settings - The generate settings to save
   * @returns Promise resolving when save is complete
   */
  static async saveGenerateSettings(settings: GenerateSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ generateSettings: settings });
    } catch (error) {
      console.error('[Storage] Failed to save generate settings:', error);
      throw error;
    }
  }
}


