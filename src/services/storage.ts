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
 * Project interface for managing multiple writing projects
 */
export interface Project {
  id: string;
  title: string;
  description?: string; // Optional project description
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Snapshot interface for version history
 */
export interface Snapshot {
  id: string;
  projectId: string;
  content: string;
  actionType: 'generate' | 'rewrite' | 'summarize';
  actionDescription: string;
  timestamp: number;
  selectionRange?: { start: number; end: number };
  liked?: boolean; // Added for favoriting snapshots
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
 * Measurement unit system
 */
export type MeasurementUnit = 'metric' | 'imperial';

/**
 * Settings interface for user preferences
 */
export interface Settings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  localOnlyMode: boolean;
  accentHue: number; // Hue value (0-360) for OKLCH color system
  historyMigrated?: boolean; // Flag to track if history has been migrated to snapshots
  autoCorrectEnabled?: boolean; // Auto-correct spelling and grammar after typing pause
  autoCorrectDelay?: number; // Delay in milliseconds before auto-correct triggers (default 3000)
  undoHistoryLimit?: number; // Maximum number of undo steps to keep (default 50)
  measurementUnit?: MeasurementUnit; // Measurement unit system (metric or imperial)
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  language: 'en-US',
  theme: 'dark',
  localOnlyMode: false,
  accentHue: 255, // Default blue hue
  autoCorrectEnabled: false, // Off by default
  autoCorrectDelay: 3000, // 3 seconds
  undoHistoryLimit: 10, // Default 10 undo steps
  measurementUnit: 'metric', // Default to metric, will be auto-detected on first load
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
        const settings = { ...DEFAULT_SETTINGS, ...result[this.SETTINGS_KEY] };
        
        // Auto-detect measurement unit on first load if not set
        if (!settings.measurementUnit) {
          const { detectMeasurementUnit } = await import('../utils/location');
          settings.measurementUnit = detectMeasurementUnit();
          // Save the detected unit
          await this.saveSettings(settings);
        }
        
        return settings;
      }
      
      // First time setup - detect measurement unit
      const defaultSettings = { ...DEFAULT_SETTINGS };
      const { detectMeasurementUnit } = await import('../utils/location');
      defaultSettings.measurementUnit = detectMeasurementUnit();
      await this.saveSettings(defaultSettings);
      
      return defaultSettings;
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
const DB_VERSION = 4;
const PINNED_NOTES_STORE = 'pinnedNotes';
const HISTORY_STORE = 'history';
const PROMPT_HISTORY_STORE = 'promptHistory';
const PROJECTS_STORE = 'projects';
const SNAPSHOTS_STORE = 'snapshots';
const MAX_STORAGE_MB = 40;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS_PER_PROJECT = 50;

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

        // Create projects store (v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create snapshots store (v4)
        if (oldVersion < 4 && !db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
          const snapshotsStore = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
          snapshotsStore.createIndex('projectId', 'projectId', { unique: false });
          snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
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
      const oldUnpinnedItems = items.filter((item) => !item.pinned && item.timestamp < cutoffTime);

      for (const item of oldUnpinnedItems) {
        await IndexedDBHelper.delete(PROMPT_HISTORY_STORE, item.id);
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
    shortLength: 25, // ~25 words
    mediumLength: 50, // ~50 words
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

  // ===== Project Methods =====

  /**
   * Creates a new project
   * @param title - Project title
   * @param content - Initial project content
   * @returns Promise resolving to the created project
   */
  static async createProject(title: string, content: string = ''): Promise<Project> {
    try {
      const now = Date.now();
      const project: Project = {
        id: generateId(),
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };

      await IndexedDBHelper.put(PROJECTS_STORE, project);
      return project;
    } catch (error) {
      console.error('[Storage] Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Gets all projects sorted by most recently updated
   * @returns Promise resolving to array of projects
   */
  static async getProjects(): Promise<Project[]> {
    try {
      const projects = await IndexedDBHelper.getAll<Project>(PROJECTS_STORE);
      // Sort by most recently updated
      return projects.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('[Storage] Failed to get projects:', error);
      return [];
    }
  }

  /**
   * Gets a single project by ID
   * @param id - Project ID
   * @returns Promise resolving to project or undefined
   */
  static async getProject(id: string): Promise<Project | undefined> {
    try {
      return await IndexedDBHelper.get<Project>(PROJECTS_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to get project:', error);
      return undefined;
    }
  }

  /**
   * Updates a project with partial updates
   * @param id - Project ID
   * @param updates - Partial project updates (title, content, etc.)
   * @returns Promise resolving to updated project or undefined if not found
   */
  static async updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt'>>
  ): Promise<Project | undefined> {
    try {
      const existingProject = await IndexedDBHelper.get<Project>(PROJECTS_STORE, id);
      if (!existingProject) {
        return undefined;
      }

      const updatedProject: Project = {
        ...existingProject,
        ...updates,
        updatedAt: Date.now(),
      };

      await IndexedDBHelper.put(PROJECTS_STORE, updatedProject);
      return updatedProject;
    } catch (error) {
      console.error('[Storage] Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Deletes a project by ID
   * @param id - Project ID
   * @returns Promise resolving when delete is complete
   */
  static async deleteProject(id: string): Promise<void> {
    try {
      await IndexedDBHelper.delete(PROJECTS_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Gets the last used project ID from chrome.storage.local
   * @returns Promise resolving to project ID or null
   */
  static async getLastProjectId(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get('flint.lastProjectId');
      return result['flint.lastProjectId'] || null;
    } catch (error) {
      console.error('[Storage] Failed to get last project ID:', error);
      return null;
    }
  }

  /**
   * Sets the last used project ID in chrome.storage.local
   * @param projectId - Project ID to save
   * @returns Promise resolving when save is complete
   */
  static async setLastProjectId(projectId: string): Promise<void> {
    try {
      await chrome.storage.local.set({ 'flint.lastProjectId': projectId });
    } catch (error) {
      console.error('[Storage] Failed to set last project ID:', error);
    }
  }

  // ===== Snapshot Methods =====

  /**
   * Creates a new snapshot for a project
   * @param projectId - ID of the project this snapshot belongs to
   * @param content - Content of the document at this point in time
   * @param actionType - Type of AI operation that created this snapshot
   * @param actionDescription - Human-readable description of the action
   * @param selectionRange - Optional selection range that was modified
   * @returns Promise resolving to the created snapshot
   */
  static async createSnapshot(
    projectId: string,
    content: string,
    actionType: 'generate' | 'rewrite' | 'summarize',
    actionDescription: string,
    selectionRange?: { start: number; end: number }
  ): Promise<Snapshot> {
    try {
      const snapshot: Snapshot = {
        id: generateId(),
        projectId,
        content,
        actionType,
        actionDescription,
        timestamp: Date.now(),
        selectionRange,
      };

      await IndexedDBHelper.put(SNAPSHOTS_STORE, snapshot);

      // Clean up old snapshots if we exceed the limit
      await this.deleteOldSnapshots(projectId, MAX_SNAPSHOTS_PER_PROJECT);

      return snapshot;
    } catch (error) {
      console.error('[Storage] Failed to create snapshot:', error);
      throw error;
    }
  }

  /**
   * Gets all snapshots for a project, sorted by most recent first
   * @param projectId - ID of the project
   * @returns Promise resolving to array of snapshots
   */
  static async getSnapshots(projectId: string): Promise<Snapshot[]> {
    try {
      const db = await IndexedDBHelper.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SNAPSHOTS_STORE, 'readonly');
        const store = transaction.objectStore(SNAPSHOTS_STORE);
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
          const snapshots = request.result as Snapshot[];
          // Sort by most recent first
          const sorted = snapshots.sort((a, b) => b.timestamp - a.timestamp);
          resolve(sorted);
        };

        request.onerror = () => {
          console.error('[Storage] Failed to get snapshots:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[Storage] Failed to get snapshots:', error);
      return [];
    }
  }

  /**
   * Deletes old snapshots for a project, keeping only the most recent ones
   * @param projectId - ID of the project
   * @param limit - Maximum number of snapshots to keep (default: 50)
   * @returns Promise resolving to number of snapshots deleted
   */
  static async deleteOldSnapshots(
    projectId: string,
    limit: number = MAX_SNAPSHOTS_PER_PROJECT
  ): Promise<number> {
    try {
      const snapshots = await this.getSnapshots(projectId);

      // If we're under the limit, no need to delete anything
      if (snapshots.length <= limit) {
        return 0;
      }

      // Delete the oldest snapshots (those beyond the limit)
      const snapshotsToDelete = snapshots.slice(limit);

      for (const snapshot of snapshotsToDelete) {
        await IndexedDBHelper.delete(SNAPSHOTS_STORE, snapshot.id);
      }

      return snapshotsToDelete.length;
    } catch (error) {
      console.error('[Storage] Failed to delete old snapshots:', error);
      return 0;
    }
  }

  /**
   * Gets a single snapshot by ID
   * @param id - Snapshot ID
   * @returns Promise resolving to snapshot or undefined
   */
  static async getSnapshot(id: string): Promise<Snapshot | undefined> {
    try {
      return await IndexedDBHelper.get<Snapshot>(SNAPSHOTS_STORE, id);
    } catch (error) {
      console.error('[Storage] Failed to get snapshot:', error);
      return undefined;
    }
  }

  /**
   * Updates a snapshot with new data
   * @param id - Snapshot ID
   * @param updates - Partial snapshot data to update
   * @returns Promise resolving to updated snapshot or undefined
   */
  static async updateSnapshot(
    id: string,
    updates: Partial<Snapshot>
  ): Promise<Snapshot | undefined> {
    try {
      const snapshot = await this.getSnapshot(id);
      if (!snapshot) {
        console.error('[Storage] Snapshot not found:', id);
        return undefined;
      }

      const updatedSnapshot: Snapshot = {
        ...snapshot,
        ...updates,
        id: snapshot.id, // Ensure ID doesn't change
        projectId: snapshot.projectId, // Ensure projectId doesn't change
      };

      await IndexedDBHelper.put(SNAPSHOTS_STORE, updatedSnapshot);
      return updatedSnapshot;
    } catch (error) {
      console.error('[Storage] Failed to update snapshot:', error);
      return undefined;
    }
  }

  /**
   * Deletes all snapshots for a project
   * @param projectId - ID of the project
   * @returns Promise resolving when delete is complete
   */
  static async deleteProjectSnapshots(projectId: string): Promise<void> {
    try {
      const snapshots = await this.getSnapshots(projectId);
      for (const snapshot of snapshots) {
        await IndexedDBHelper.delete(SNAPSHOTS_STORE, snapshot.id);
      }
    } catch (error) {
      console.error('[Storage] Failed to delete project snapshots:', error);
      throw error;
    }
  }

  /**
   * Clears all snapshots for a specific project (alias for deleteProjectSnapshots)
   * @param projectId - ID of the project
   * @returns Promise resolving when clear is complete
   */
  static async clearSnapshots(projectId: string): Promise<void> {
    return this.deleteProjectSnapshots(projectId);
  }

  // ===== Migration Methods =====

  /**
   * Migrates existing history items to snapshots format
   * Creates a default project for orphaned history items
   * @returns Promise resolving to migration result
   */
  static async migrateHistoryToSnapshots(): Promise<{
    success: boolean;
    migratedCount: number;
    projectId?: string;
    error?: string;
  }> {
    try {
      // Check if migration has already been completed
      const settings = await this.getSettings();
      if (settings.historyMigrated) {
        return { success: true, migratedCount: 0 };
      }

      // Get all existing history items
      const historyItems = await this.getHistory();

      if (historyItems.length === 0) {
        // Mark migration as complete even if there's nothing to migrate
        await this.updateSettings({ historyMigrated: true });
        return { success: true, migratedCount: 0 };
      }

      // Create a default project for migrated history
      const defaultProject = await this.createProject(
        'Migrated History',
        'This project contains your previous history items converted to snapshots.'
      );

      // Convert each history item to a snapshot
      let migratedCount = 0;
      for (const item of historyItems) {
        try {
          // Generate action description based on history item metadata
          let actionDescription = '';

          switch (item.type) {
            case 'generate':
              actionDescription = 'Generated text';
              break;
            case 'rewrite':
              if (item.metadata?.preset) {
                actionDescription = `Rewrote with ${item.metadata.preset} preset`;
              } else {
                actionDescription = 'Rewrote text';
              }
              break;
            case 'summarize':
              if (item.metadata?.mode) {
                actionDescription = `Summarized as ${item.metadata.mode}`;
              } else {
                actionDescription = 'Summarized text';
              }
              break;
          }

          // Create snapshot from history item
          const snapshot: Snapshot = {
            id: generateId(),
            projectId: defaultProject.id,
            content: item.resultText,
            actionType: item.type,
            actionDescription,
            timestamp: item.timestamp,
            // No selection range for migrated items
          };

          await IndexedDBHelper.put(SNAPSHOTS_STORE, snapshot);
          migratedCount++;
        } catch (error) {
          console.error(`[Storage] Failed to migrate history item ${item.id}:`, error);
          // Continue with other items even if one fails
        }
      }

      // Mark migration as complete
      await this.updateSettings({ historyMigrated: true });

      return {
        success: true,
        migratedCount,
        projectId: defaultProject.id,
      };
    } catch (error) {
      console.error('[Storage] History migration failed:', error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Checks if history migration is needed and runs it if necessary
   * Should be called on app initialization
   * @returns Promise resolving when check is complete
   */
  static async checkAndMigrateHistory(): Promise<void> {
    try {
      const settings = await this.getSettings();

      // Skip if already migrated
      if (settings.historyMigrated) {
        return;
      }

      await this.migrateHistoryToSnapshots();
    } catch (error) {
      console.error('[Storage] Failed to check and migrate history:', error);
      // Don't throw - allow app to continue even if migration fails
    }
  }
}
