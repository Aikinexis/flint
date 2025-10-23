/**
 * Tests for storage service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StorageService, Settings } from './storage.js';

// Mock chrome.storage API
const mockStorage = {
  local: {
    get: jest.fn<(keys?: string | string[] | Record<string, any> | null) => Promise<any>>(),
    set: jest.fn<(items: Record<string, any>) => Promise<void>>(),
    remove: jest.fn<(keys: string | string[]) => Promise<void>>(),
  },
  onChanged: {
    addListener: jest.fn<(callback: (changes: any, areaName: string) => void) => void>(),
    removeListener: jest.fn<(callback: (changes: any, areaName: string) => void) => void>(),
  },
};

(global as any).chrome = {
  storage: mockStorage,
};

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when no settings exist', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const settings = await StorageService.getSettings();

      expect(settings).toEqual({
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      });
      expect(mockStorage.local.get).toHaveBeenCalledWith('settings');
    });

    it('should return stored settings when they exist', async () => {
      const storedSettings: Settings = {
        language: 'es-ES',
        theme: 'light',
        localOnlyMode: true,
        shortcuts: {
          openPanel: 'Ctrl+Alt+F',
          record: 'Ctrl+Alt+R',
          summarize: 'Ctrl+Alt+S',
          rewrite: 'Ctrl+Alt+W',
        },
      };

      mockStorage.local.get.mockResolvedValue({ settings: storedSettings });

      const settings = await StorageService.getSettings();

      expect(settings).toEqual(storedSettings);
    });

    it('should merge stored settings with defaults for backward compatibility', async () => {
      const partialSettings = {
        language: 'fr-FR',
        theme: 'light',
      };

      mockStorage.local.get.mockResolvedValue({ settings: partialSettings });

      const settings = await StorageService.getSettings();

      expect(settings.language).toBe('fr-FR');
      expect(settings.theme).toBe('light');
      expect(settings.localOnlyMode).toBe(false); // from defaults
      expect(settings.shortcuts).toBeDefined(); // from defaults
    });

    it('should return defaults on error', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const settings = await StorageService.getSettings();

      expect(settings).toEqual({
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      });
    });
  });

  describe('saveSettings', () => {
    it('should save settings to chrome.storage.local', async () => {
      const settings: Settings = {
        language: 'de-DE',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      mockStorage.local.set.mockResolvedValue(undefined);

      await StorageService.saveSettings(settings);

      expect(mockStorage.local.set).toHaveBeenCalledWith({ settings });
    });

    it('should throw quota exceeded error with helpful message', async () => {
      const settings: Settings = {
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      mockStorage.local.set.mockRejectedValue(new Error('QUOTA_BYTES exceeded'));

      await expect(StorageService.saveSettings(settings)).rejects.toThrow(
        'Storage quota exceeded. Please clear some data.'
      );
    });

    it('should rethrow other errors', async () => {
      const settings: Settings = {
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      const error = new Error('Network error');
      mockStorage.local.set.mockRejectedValue(error);

      await expect(StorageService.saveSettings(settings)).rejects.toThrow('Network error');
    });
  });

  describe('updateSettings', () => {
    it('should update only specified settings', async () => {
      const existingSettings: Settings = {
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      mockStorage.local.get.mockResolvedValue({ settings: existingSettings });
      mockStorage.local.set.mockResolvedValue(undefined);

      await StorageService.updateSettings({ theme: 'light', localOnlyMode: true });

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        settings: {
          ...existingSettings,
          theme: 'light',
          localOnlyMode: true,
        },
      });
    });

    it('should handle partial shortcut updates', async () => {
      const existingSettings: Settings = {
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      mockStorage.local.get.mockResolvedValue({ settings: existingSettings });
      mockStorage.local.set.mockResolvedValue(undefined);

      await StorageService.updateSettings({
        shortcuts: {
          openPanel: 'Alt+F',
          record: 'Alt+R',
          summarize: 'Alt+S',
          rewrite: 'Alt+W',
        },
      });

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        settings: {
          ...existingSettings,
          shortcuts: {
            openPanel: 'Alt+F',
            record: 'Alt+R',
            summarize: 'Alt+S',
            rewrite: 'Alt+W',
          },
        },
      });
    });
  });

  describe('clearSettings', () => {
    it('should remove settings from storage', async () => {
      mockStorage.local.remove.mockResolvedValue(undefined);

      await StorageService.clearSettings();

      expect(mockStorage.local.remove).toHaveBeenCalledWith('settings');
    });

    it('should throw error on failure', async () => {
      const error = new Error('Remove failed');
      mockStorage.local.remove.mockRejectedValue(error);

      await expect(StorageService.clearSettings()).rejects.toThrow('Remove failed');
    });
  });

  describe('onSettingsChange', () => {
    it('should register listener for settings changes', () => {
      const callback = jest.fn();

      StorageService.onSettingsChange(callback);

      expect(mockStorage.onChanged.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should call callback when settings change', () => {
      const callback = jest.fn();
      let registeredListener: any;

      mockStorage.onChanged.addListener.mockImplementation((listener) => {
        registeredListener = listener;
      });

      StorageService.onSettingsChange(callback);

      const oldSettings: Settings = {
        language: 'en-US',
        theme: 'dark',
        localOnlyMode: false,
        shortcuts: {
          openPanel: 'Ctrl+Shift+F',
          record: 'Ctrl+Shift+R',
          summarize: 'Ctrl+Shift+S',
          rewrite: 'Ctrl+Shift+W',
        },
      };

      const newSettings: Settings = {
        ...oldSettings,
        theme: 'light',
      };

      const changes = {
        settings: {
          oldValue: oldSettings,
          newValue: newSettings,
        },
      };

      registeredListener(changes, 'local');

      expect(callback).toHaveBeenCalledWith(newSettings, oldSettings);
    });

    it('should not call callback for non-local storage changes', () => {
      const callback = jest.fn();
      let registeredListener: any;

      mockStorage.onChanged.addListener.mockImplementation((listener) => {
        registeredListener = listener;
      });

      StorageService.onSettingsChange(callback);

      const changes = {
        settings: {
          oldValue: {},
          newValue: {},
        },
      };

      registeredListener(changes, 'sync');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback for non-settings changes', () => {
      const callback = jest.fn();
      let registeredListener: any;

      mockStorage.onChanged.addListener.mockImplementation((listener) => {
        registeredListener = listener;
      });

      StorageService.onSettingsChange(callback);

      const changes = {
        otherKey: {
          oldValue: 'old',
          newValue: 'new',
        },
      };

      registeredListener(changes, 'local');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return cleanup function that removes listener', () => {
      const callback = jest.fn();

      const cleanup = StorageService.onSettingsChange(callback);

      cleanup();

      expect(mockStorage.onChanged.removeListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should not call callback when oldValue or newValue is missing', () => {
      const callback = jest.fn();
      let registeredListener: any;

      mockStorage.onChanged.addListener.mockImplementation((listener) => {
        registeredListener = listener;
      });

      StorageService.onSettingsChange(callback);

      // Missing oldValue
      registeredListener(
        {
          settings: {
            newValue: {},
          },
        },
        'local'
      );

      expect(callback).not.toHaveBeenCalled();

      // Missing newValue
      registeredListener(
        {
          settings: {
            oldValue: {},
          },
        },
        'local'
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
