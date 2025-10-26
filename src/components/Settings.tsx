import { useState, useEffect } from 'react';
import type { Settings as SettingsType, PinnedNote } from '../services/storage';
import { StorageService } from '../services/storage';

/**
 * Settings component props
 */
export interface SettingsProps {
  /**
   * Current settings object (optional - will load from storage if not provided)
   */
  settings?: SettingsType;

  /**
   * Array of pinned notes (optional - will load from storage if not provided)
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Callback when settings change (optional)
   */
  onSettingsChange?: (settings: SettingsType) => void;

  /**
   * Callback when pinned notes change (optional)
   */
  onPinnedNotesChange?: (notes: PinnedNote[]) => void;
}

/**
 * Dialog mode for pinned notes
 */
type DialogMode = 'add' | 'edit' | 'delete' | null;

/**
 * Settings component for configuration and preferences
 * Provides theme toggles, language selection, keyboard shortcuts, and pinned notes management
 */
export function Settings({
  settings: propSettings,
  pinnedNotes: propPinnedNotes,
  onSettingsChange,
  onPinnedNotesChange,
}: SettingsProps) {
  // Local state for settings
  const [localSettings, setLocalSettings] = useState<SettingsType | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
  // State for shortcut validation errors
  const [shortcutErrors, setShortcutErrors] = useState<Record<string, string>>({});
  
  // Dialog state for pinned notes
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedNote, setSelectedNote] = useState<PinnedNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Load settings and pinned notes from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings
        const result = await chrome.storage.local.get('settings');
        if (result.settings) {
          setLocalSettings(result.settings);
        } else {
          // Use default settings
          const defaultSettings: SettingsType = {
            language: 'en-US',
            theme: 'dark',
            localOnlyMode: false,
            accentHue: 255, // Default blue hue
            shortcuts: {
              openPanel: 'Ctrl+Shift+F',
              record: 'Ctrl+Shift+R',
              summarize: 'Ctrl+Shift+S',
              rewrite: 'Ctrl+Shift+W',
            },
          };
          setLocalSettings(defaultSettings);
        }

        // Load pinned notes from IndexedDB
        const notes = await StorageService.getPinnedNotes();
        setPinnedNotes(notes);
      } catch (error) {
        console.error('[Settings] Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Use prop settings if provided, otherwise use local state
  const settings = propSettings || localSettings;

  // Sync local state when props change
  useEffect(() => {
    if (propSettings) {
      setLocalSettings(propSettings);
    }
  }, [propSettings]);

  useEffect(() => {
    if (propPinnedNotes) {
      setPinnedNotes(propPinnedNotes);
    }
  }, [propPinnedNotes]);

  // Show loading state while settings are being loaded
  if (!settings) {
    return (
      <div className="flint-section flex flex-col h-full overflow-y-auto">
        <h2 className="flint-section-header">Settings</h2>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  /**
   * Updates a setting and saves to storage
   */
  const updateSetting = async <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setLocalSettings(newSettings);
    
    // Save to chrome.storage
    try {
      await chrome.storage.local.set({ settings: newSettings });
      
      // Notify parent if callback provided
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  };

  /**
   * Validates a keyboard shortcut format and checks for conflicts
   * @param key - The shortcut key being validated
   * @param value - The shortcut value to validate
   * @returns Error message if invalid, empty string if valid
   */
  const validateShortcut = (
    key: keyof SettingsType['shortcuts'],
    value: string
  ): string => {
    if (!settings) return '';
    // Empty check
    if (!value.trim()) {
      return 'Shortcut cannot be empty';
    }

    // Basic format validation (must contain at least one modifier)
    const hasCtrl = value.includes('Ctrl') || value.includes('Command') || value.includes('MacCtrl');
    const hasAlt = value.includes('Alt');
    const hasShift = value.includes('Shift');
    
    if (!hasCtrl && !hasAlt && !hasShift) {
      return 'Shortcut must include at least one modifier key (Ctrl, Alt, or Shift)';
    }

    // Check for conflicts with other shortcuts
    const shortcuts = settings.shortcuts;
    for (const [otherKey, otherValue] of Object.entries(shortcuts)) {
      if (otherKey !== key && otherValue.toLowerCase() === value.toLowerCase()) {
        const keyNames: Record<string, string> = {
          openPanel: 'Open Panel',
          record: 'Record',
          summarize: 'Summarize',
          rewrite: 'Rewrite',
        };
        return `Conflicts with ${keyNames[otherKey] || otherKey} shortcut`;
      }
    }

    return '';
  };

  /**
   * Updates a keyboard shortcut with validation
   */
  const updateShortcut = (
    key: keyof SettingsType['shortcuts'],
    value: string
  ) => {
    // Validate the shortcut
    const error = validateShortcut(key, value);
    
    // Update error state
    setShortcutErrors((prev) => ({
      ...prev,
      [key]: error,
    }));

    // Only save if valid
    if (!error) {
      const newShortcuts = { ...settings.shortcuts, [key]: value };
      updateSetting('shortcuts', newShortcuts);
      
      // Notify background to update command shortcuts
      chrome.runtime.sendMessage({
        type: 'UPDATE_SHORTCUTS',
        payload: newShortcuts,
      }).catch((err) => {
        console.error('[Settings] Failed to update shortcuts in background:', err);
      });
    }
  };

  /**
   * Opens the add note dialog
   */
  const handleAddNote = () => {
    setNoteTitle('');
    setNoteContent('');
    setSelectedNote(null);
    setDialogMode('add');
  };

  /**
   * Opens the edit note dialog
   */
  const handleEditNote = (note: PinnedNote) => {
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setSelectedNote(note);
    setDialogMode('edit');
  };

  /**
   * Opens the delete confirmation dialog
   */
  const handleDeleteNote = (note: PinnedNote) => {
    setSelectedNote(note);
    setDialogMode('delete');
  };

  /**
   * Saves a pinned note (add or edit)
   */
  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      return;
    }

    try {
      const savedNote = await StorageService.savePinnedNote({
        id: selectedNote?.id,
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });

      // Update local state
      if (selectedNote) {
        // Edit existing note
        setPinnedNotes((prev) =>
          prev.map((n) => (n.id === savedNote.id ? savedNote : n))
        );
      } else {
        // Add new note
        setPinnedNotes((prev) => [savedNote, ...prev]);
      }

      // Notify parent if callback provided
      if (onPinnedNotesChange) {
        const updatedNotes = selectedNote
          ? pinnedNotes.map((n) => (n.id === savedNote.id ? savedNote : n))
          : [savedNote, ...pinnedNotes];
        onPinnedNotesChange(updatedNotes);
      }

      // Close dialog
      setDialogMode(null);
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('[Settings] Failed to save pinned note:', error);
    }
  };

  /**
   * Confirms and deletes a pinned note
   */
  const handleConfirmDelete = async () => {
    if (!selectedNote) return;

    try {
      await StorageService.deletePinnedNote(selectedNote.id);

      // Update local state
      setPinnedNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));

      // Notify parent if callback provided
      if (onPinnedNotesChange) {
        const updatedNotes = pinnedNotes.filter((n) => n.id !== selectedNote.id);
        onPinnedNotesChange(updatedNotes);
      }

      // Close dialog
      setDialogMode(null);
      setSelectedNote(null);
    } catch (error) {
      console.error('[Settings] Failed to delete pinned note:', error);
    }
  };

  /**
   * Closes any open dialog
   */
  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
  };

  return (
    <div className="flint-section flex flex-col h-full overflow-y-auto">
      <h2 className="flint-section-header">Settings</h2>

      {/* Theme Section */}
      <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
        <h3
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Appearance
        </h3>

        {/* Light mode toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              htmlFor="light-mode-toggle"
              style={{
                display: 'block',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text)',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Light mode
            </label>
            <p
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                margin: 0,
              }}
            >
              Switch between dark and light themes
            </p>
          </div>
          <label
            className="flint-toggle"
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '28px',
              flexShrink: 0,
              marginLeft: '16px',
            }}
          >
            <input
              id="light-mode-toggle"
              type="checkbox"
              checked={settings.theme === 'light'}
              onChange={(e) => {
                const newTheme = e.target.checked ? 'light' : 'dark';
                updateSetting('theme', newTheme);
                // Apply theme immediately
                if (newTheme === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              }}
              aria-label="Toggle light mode"
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span
              style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  settings.theme === 'light'
                    ? 'var(--primary)'
                    : 'var(--surface-2)',
                transition: '0.2s',
                borderRadius: '28px',
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: settings.theme === 'light' ? '24px' : '4px',
                  bottom: '3px',
                  background: 'white',
                  transition: '0.2s',
                  borderRadius: '50%',
                }}
              />
            </span>
          </label>
        </div>

        {/* Accent hue slider */}
        <div style={{ marginBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label
              htmlFor="accent-hue"
              style={{
                display: 'block',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text)',
                fontWeight: 500,
              }}
            >
              Accent color
            </label>
            <button
              className="flint-btn ghost"
              onClick={() => {
                updateSetting('accentHue', 255);
                // Apply default hue immediately
                document.documentElement.style.setProperty('--accent-hue', '255');
              }}
              style={{
                height: '28px',
                padding: '0 12px',
                fontSize: 'var(--fs-xs)',
              }}
            >
              Reset to Default
            </button>
          </div>
          <p
            style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Adjust the hue to customize your accent color
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              id="accent-hue"
              type="range"
              min="0"
              max="360"
              value={settings.accentHue}
              onChange={(e) => {
                const newHue = parseInt(e.target.value);
                updateSetting('accentHue', newHue);
                // Apply hue immediately by updating CSS variable
                document.documentElement.style.setProperty('--accent-hue', newHue.toString());
              }}
              aria-label="Select accent hue"
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: 'linear-gradient(to right, oklch(60% 0.12 0), oklch(60% 0.12 30), oklch(60% 0.12 60), oklch(60% 0.12 90), oklch(60% 0.12 120), oklch(60% 0.12 150), oklch(60% 0.12 180), oklch(60% 0.12 210), oklch(60% 0.12 240), oklch(60% 0.12 270), oklch(60% 0.12 300), oklch(60% 0.12 330), oklch(60% 0.12 360))',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            />
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: `oklch(60% 0.12 ${settings.accentHue})`,
                flexShrink: 0,
              }}
              aria-label="Current accent color preview"
            />
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
        <h3
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Voice Recognition
        </h3>

        {/* Language selector */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="language-select"
            style={{
              display: 'block',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Language
          </label>
          <select
            id="language-select"
            className="flint-input"
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
            aria-label="Select speech recognition language"
            style={{
              width: '100%',
              height: '48px',
              padding: '12px 40px 12px 16px',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 16px center',
              backgroundSize: '12px',
            }}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish (Spain)</option>
            <option value="es-MX">Spanish (Mexico)</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
            <option value="zh-CN">Chinese (Simplified)</option>
            <option value="zh-TW">Chinese (Traditional)</option>
          </select>
        </div>

        {/* Local-only mode toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              htmlFor="local-only-toggle"
              style={{
                display: 'block',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text)',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Local-only mode
            </label>
            <p
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                margin: 0,
              }}
            >
              Disable network-dependent features
            </p>
          </div>
          <label
            className="flint-toggle"
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '28px',
              flexShrink: 0,
              marginLeft: '16px',
            }}
          >
            <input
              id="local-only-toggle"
              type="checkbox"
              checked={settings.localOnlyMode}
              onChange={(e) => updateSetting('localOnlyMode', e.target.checked)}
              aria-label="Toggle local-only mode"
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span
              style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: settings.localOnlyMode
                  ? 'var(--primary)'
                  : 'var(--surface-2)',
                transition: '0.2s',
                borderRadius: '28px',
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: settings.localOnlyMode ? '24px' : '4px',
                  bottom: '3px',
                  background: 'white',
                  transition: '0.2s',
                  borderRadius: '50%',
                }}
              />
            </span>
          </label>
        </div>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
        <h3
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Keyboard Shortcuts
        </h3>
        <p
          style={{
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          Use modifiers like Ctrl, Alt, Shift with a key (e.g., Ctrl+Shift+F). On Mac, use Command instead of Ctrl.
          These shortcuts are saved as preferences, but Chrome manages the actual key bindings in{' '}
          <a
            href="chrome://extensions/shortcuts"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--primary)',
              textDecoration: 'underline',
            }}
          >
            chrome://extensions/shortcuts
          </a>
          .
        </p>

        {/* Open Panel shortcut */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="shortcut-open-panel"
            style={{
              display: 'block',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Open Panel
          </label>
          <input
            id="shortcut-open-panel"
            type="text"
            className="flint-input"
            value={settings.shortcuts.openPanel}
            onChange={(e) => updateShortcut('openPanel', e.target.value)}
            onBlur={(e) => updateShortcut('openPanel', e.target.value)}
            placeholder="Ctrl+Shift+F"
            aria-label="Open panel keyboard shortcut"
            aria-invalid={!!shortcutErrors.openPanel}
            aria-describedby={shortcutErrors.openPanel ? 'error-open-panel' : undefined}
            style={{
              width: '100%',
              borderColor: shortcutErrors.openPanel ? '#ef4444' : undefined,
            }}
          />
          {shortcutErrors.openPanel && (
            <p
              id="error-open-panel"
              style={{
                fontSize: 'var(--fs-xs)',
                color: '#ef4444',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {shortcutErrors.openPanel}
            </p>
          )}
        </div>

        {/* Record shortcut */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="shortcut-record"
            style={{
              display: 'block',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Record
          </label>
          <input
            id="shortcut-record"
            type="text"
            className="flint-input"
            value={settings.shortcuts.record}
            onChange={(e) => updateShortcut('record', e.target.value)}
            onBlur={(e) => updateShortcut('record', e.target.value)}
            placeholder="Ctrl+Shift+R"
            aria-label="Record keyboard shortcut"
            aria-invalid={!!shortcutErrors.record}
            aria-describedby={shortcutErrors.record ? 'error-record' : undefined}
            style={{
              width: '100%',
              borderColor: shortcutErrors.record ? '#ef4444' : undefined,
            }}
          />
          {shortcutErrors.record && (
            <p
              id="error-record"
              style={{
                fontSize: 'var(--fs-xs)',
                color: '#ef4444',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {shortcutErrors.record}
            </p>
          )}
        </div>

        {/* Summarize shortcut */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="shortcut-summarize"
            style={{
              display: 'block',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Summarize
          </label>
          <input
            id="shortcut-summarize"
            type="text"
            className="flint-input"
            value={settings.shortcuts.summarize}
            onChange={(e) => updateShortcut('summarize', e.target.value)}
            onBlur={(e) => updateShortcut('summarize', e.target.value)}
            placeholder="Ctrl+Shift+S"
            aria-label="Summarize keyboard shortcut"
            aria-invalid={!!shortcutErrors.summarize}
            aria-describedby={shortcutErrors.summarize ? 'error-summarize' : undefined}
            style={{
              width: '100%',
              borderColor: shortcutErrors.summarize ? '#ef4444' : undefined,
            }}
          />
          {shortcutErrors.summarize && (
            <p
              id="error-summarize"
              style={{
                fontSize: 'var(--fs-xs)',
                color: '#ef4444',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {shortcutErrors.summarize}
            </p>
          )}
        </div>

        {/* Rewrite shortcut */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="shortcut-rewrite"
            style={{
              display: 'block',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Rewrite
          </label>
          <input
            id="shortcut-rewrite"
            type="text"
            className="flint-input"
            value={settings.shortcuts.rewrite}
            onChange={(e) => updateShortcut('rewrite', e.target.value)}
            onBlur={(e) => updateShortcut('rewrite', e.target.value)}
            placeholder="Ctrl+Shift+W"
            aria-label="Rewrite keyboard shortcut"
            aria-invalid={!!shortcutErrors.rewrite}
            aria-describedby={shortcutErrors.rewrite ? 'error-rewrite' : undefined}
            style={{
              width: '100%',
              borderColor: shortcutErrors.rewrite ? '#ef4444' : undefined,
            }}
          />
          {shortcutErrors.rewrite && (
            <p
              id="error-rewrite"
              style={{
                fontSize: 'var(--fs-xs)',
                color: '#ef4444',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {shortcutErrors.rewrite}
            </p>
          )}
        </div>
      </section>

      {/* Privacy Notice Section */}
      <section
        style={{
          marginBottom: '24px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-muted)',
          background: 'rgba(251, 191, 36, 0.05)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: '2px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: '#fbbf24',
                marginBottom: '8px',
              }}
            >
              Privacy Notice
            </h3>
            <p
              style={{
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-muted)',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              Speech recognition uses the Web Speech API, which may send audio to
              a network-based service for transcription. All AI text processing
              (summarization and rewriting) happens locally on your device using
              Chrome&apos;s built-in AI.
            </p>
          </div>
        </div>
      </section>

      {/* Pinned Notes Section */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Pinned Notes
          </h3>
          <button
            className="flint-btn ghost"
            onClick={handleAddNote}
            aria-label="Add pinned note"
            style={{
              height: '32px',
              padding: '0 12px',
              fontSize: 'var(--fs-xs)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Note
          </button>
        </div>

        {/* Pinned notes list */}
        {pinnedNotes.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ margin: '0 auto 12px', opacity: 0.5 }}
            >
              <path d="M12 17V3" />
              <path d="m6 11 6 6 6-6" />
              <path d="M19 21H5" />
            </svg>
            <p style={{ margin: 0 }}>
              No pinned notes yet. Add notes to provide context for AI operations.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pinnedNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--stroke)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 'var(--fs-sm)',
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {note.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="flint-btn ghost"
                      onClick={() => handleEditNote(note)}
                      aria-label={`Edit ${note.title}`}
                      style={{
                        height: '24px',
                        width: '24px',
                        padding: 0,
                        minWidth: 'auto',
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="flint-btn ghost"
                      onClick={() => handleDeleteNote(note)}
                      aria-label={`Delete ${note.title}`}
                      style={{
                        height: '24px',
                        width: '24px',
                        padding: 0,
                        minWidth: 'auto',
                        color: '#ef4444',
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Note Dialog */}
      {(dialogMode === 'add' || dialogMode === 'edit') && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={handleCloseDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div
            className="flint-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="dialog-title"
              style={{
                fontSize: 'var(--fs-lg)',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '16px',
              }}
            >
              {dialogMode === 'add' ? 'Add Pinned Note' : 'Edit Pinned Note'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="note-title"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                Title
              </label>
              <input
                id="note-title"
                type="text"
                className="flint-input"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Enter note title"
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="note-content"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                Content
              </label>
              <textarea
                id="note-content"
                className="flint-input"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter note content (e.g., audience, tone, style guidelines)"
                rows={6}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: '120px',
                  padding: '12px 16px',
                }}
              />
              <p
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                  marginBottom: 0,
                }}
              >
                This note will be merged into AI prompts for summarization and rewriting.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="flint-btn ghost"
                onClick={handleCloseDialog}
                style={{ height: '40px', padding: '0 20px' }}
              >
                Cancel
              </button>
              <button
                className="flint-btn primary"
                onClick={handleSaveNote}
                disabled={!noteTitle.trim() || !noteContent.trim()}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  opacity: !noteTitle.trim() || !noteContent.trim() ? 0.5 : 1,
                  cursor: !noteTitle.trim() || !noteContent.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {dialogMode === 'add' ? 'Add Note' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {dialogMode === 'delete' && selectedNote && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={handleCloseDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="flint-card"
            style={{
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <div style={{ flex: 1 }}>
                <h3
                  id="delete-dialog-title"
                  style={{
                    fontSize: 'var(--fs-lg)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Delete Pinned Note?
                </h3>
                <p
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: '1.5',
                  }}
                >
                  Are you sure you want to delete &quot;{selectedNote.title}&quot;? This action cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="flint-btn ghost"
                onClick={handleCloseDialog}
                style={{ height: '40px', padding: '0 20px' }}
              >
                Cancel
              </button>
              <button
                className="flint-btn"
                onClick={handleConfirmDelete}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  background: '#ef4444',
                  color: 'white',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
