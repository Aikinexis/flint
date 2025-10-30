import { useState, useEffect } from 'react';
import type { Settings as SettingsType, PinnedNote, GenerateSettings } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIAvailabilityBanner } from './AIAvailabilityBanner';
import { useAppState } from '../state';

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
 * Provides theme toggles, language selection, and pinned notes management
 */
export function Settings({
  settings: propSettings,
  pinnedNotes: propPinnedNotes,
  onSettingsChange,
  onPinnedNotesChange,
}: SettingsProps) {
  // Get AI availability from app state
  const { state } = useAppState();
  const aiAvailability = state.aiAvailability;

  // Local state for settings
  const [localSettings, setLocalSettings] = useState<SettingsType | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
  
  // Dialog state for pinned notes
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedNote, setSelectedNote] = useState<PinnedNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Collapsible section state - only Data Management open by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dataManagement: true,
    appearance: false,
    voiceRecognition: false,
    shortcuts: false,
    generatePanel: false,
    privacy: false,
    pinnedNotes: false,
  });

  /**
   * Toggles a section's expanded state
   */
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Generate panel settings state
  const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
  const [lengthErrors, setLengthErrors] = useState<{ short?: string; medium?: string }>({});
  
  // Local input state to allow temporary empty values
  const [shortLengthInput, setShortLengthInput] = useState<string>('');
  const [mediumLengthInput, setMediumLengthInput] = useState<string>('');
  const [shortCharsInput, setShortCharsInput] = useState<string>('');
  const [mediumCharsInput, setMediumCharsInput] = useState<string>('');

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
          };
          setLocalSettings(defaultSettings);
        }

        // Load pinned notes from IndexedDB
        const notes = await StorageService.getPinnedNotes();
        setPinnedNotes(notes);

        // Load generate settings
        const genSettings = await StorageService.getGenerateSettings();
        setGenerateSettings(genSettings);
        
        // Initialize local input state
        setShortLengthInput(genSettings.shortLength.toString());
        setMediumLengthInput(genSettings.mediumLength.toString());
        // Initialize char inputs (approximate: 5 chars per word)
        setShortCharsInput((genSettings.shortLength * 5).toString());
        setMediumCharsInput((genSettings.mediumLength * 5).toString());
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
  /**
   * Clamps a value between min and max (word counts)
   */
  const clampLength = (value: number): number => {
    if (isNaN(value) || value < 5) return 5;
    if (value > 2000) return 2000;
    return value;
  };

  /**
   * Updates generate settings
   */
  const updateGenerateSettings = async (updates: Partial<GenerateSettings>) => {
    if (!generateSettings) return;

    const newSettings = { ...generateSettings, ...updates };
    setGenerateSettings(newSettings);

    try {
      await StorageService.saveGenerateSettings(newSettings);
    } catch (error) {
      console.error('[Settings] Failed to save generate settings:', error);
    }
  };

  /**
   * Updates short length during typing (no validation)
   */
  const updateShortLength = (value: string) => {
    // Update local input state to allow empty values
    setShortLengthInput(value);
    setLengthErrors((prev) => ({ ...prev, short: '' }));
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      updateGenerateSettings({ shortLength: numValue });
      // Update char input (approximate: 5 chars per word)
      setShortCharsInput((numValue * 5).toString());
    }
  };

  /**
   * Clamps short length on blur
   */
  const clampShortLength = (value: string) => {
    const numValue = parseInt(value);
    const clamped = clampLength(numValue);
    
    setShortLengthInput(clamped.toString());
    setShortCharsInput((clamped * 5).toString());
    setLengthErrors((prev) => ({ ...prev, short: '' }));
    updateGenerateSettings({ shortLength: clamped });
  };

  /**
   * Updates short chars during typing (no validation)
   */
  const updateShortChars = (value: string) => {
    setShortCharsInput(value);
    setLengthErrors((prev) => ({ ...prev, short: '' }));
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      // Convert chars to words (approximate: 5 chars per word)
      const words = Math.round(numValue / 5);
      setShortLengthInput(words.toString());
      updateGenerateSettings({ shortLength: words });
    }
  };

  /**
   * Clamps short chars on blur
   */
  const clampShortChars = (value: string) => {
    const numValue = parseInt(value);
    const clampedChars = Math.max(25, Math.min(10000, numValue)); // 5 words min, 2000 words max
    const words = Math.round(clampedChars / 5);
    const clamped = clampLength(words);
    
    setShortLengthInput(clamped.toString());
    setShortCharsInput((clamped * 5).toString());
    setLengthErrors((prev) => ({ ...prev, short: '' }));
    updateGenerateSettings({ shortLength: clamped });
  };

  /**
   * Updates medium length during typing (no validation)
   */
  const updateMediumLength = (value: string) => {
    // Update local input state to allow empty values
    setMediumLengthInput(value);
    setLengthErrors((prev) => ({ ...prev, medium: '' }));
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      updateGenerateSettings({ mediumLength: numValue });
      // Update char input (approximate: 5 chars per word)
      setMediumCharsInput((numValue * 5).toString());
    }
  };

  /**
   * Clamps medium length on blur
   */
  const clampMediumLength = (value: string) => {
    const numValue = parseInt(value);
    const clamped = clampLength(numValue);
    
    setMediumLengthInput(clamped.toString());
    setMediumCharsInput((clamped * 5).toString());
    setLengthErrors((prev) => ({ ...prev, medium: '' }));
    updateGenerateSettings({ mediumLength: clamped });
  };

  /**
   * Updates medium chars during typing (no validation)
   */
  const updateMediumChars = (value: string) => {
    setMediumCharsInput(value);
    setLengthErrors((prev) => ({ ...prev, medium: '' }));
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      // Convert chars to words (approximate: 5 chars per word)
      const words = Math.round(numValue / 5);
      setMediumLengthInput(words.toString());
      updateGenerateSettings({ mediumLength: words });
    }
  };

  /**
   * Clamps medium chars on blur
   */
  const clampMediumChars = (value: string) => {
    const numValue = parseInt(value);
    const clampedChars = Math.max(25, Math.min(10000, numValue)); // 5 words min, 2000 words max
    const words = Math.round(clampedChars / 5);
    const clamped = clampLength(words);
    
    setMediumLengthInput(clamped.toString());
    setMediumCharsInput((clamped * 5).toString());
    setLengthErrors((prev) => ({ ...prev, medium: '' }));
    updateGenerateSettings({ mediumLength: clamped });
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

      {/* AI Availability Banner */}
      <AIAvailabilityBanner availability={aiAvailability} />

      {/* Theme Section */}
      <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
        <button
          onClick={() => toggleSection('appearance')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: 0,
            marginBottom: expandedSections.appearance ? '16px' : '0',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
          aria-expanded={expandedSections.appearance}
          aria-controls="appearance-content"
        >
          <h3
            style={{
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Appearance
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              transform: expandedSections.appearance ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {expandedSections.appearance && (
          <div id="appearance-content">

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
              role="img"
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
          </div>
        )}
      </section>

      {/* Generate Panel Settings Section */}
      {generateSettings && (
        <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
          <button
            onClick={() => toggleSection('generatePanel')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.generatePanel ? '16px' : '0',
              cursor: 'pointer',
              color: 'var(--text)',
            }}
            aria-expanded={expandedSections.generatePanel}
            aria-controls="generate-panel-content"
          >
            <h3
              style={{
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              AI Settings
            </h3>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                transform: expandedSections.generatePanel ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {expandedSections.generatePanel && (
            <div id="generate-panel-content">

          {/* Short length inputs */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              Short length
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  id="short-length"
                  type="number"
                  className="flint-input"
                  min="5"
                  max="2000"
                  value={shortLengthInput}
                  onChange={(e) => updateShortLength(e.target.value)}
                  onBlur={(e) => clampShortLength(e.target.value)}
                  placeholder="Words"
                  aria-label="Short length in words"
                  aria-invalid={!!lengthErrors.short}
                  style={{
                    width: '100%',
                    borderColor: lengthErrors.short ? '#ef4444' : undefined,
                  }}
                />
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  words
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  id="short-chars"
                  type="number"
                  className="flint-input"
                  min="25"
                  max="10000"
                  value={shortCharsInput}
                  onChange={(e) => updateShortChars(e.target.value)}
                  onBlur={(e) => clampShortChars(e.target.value)}
                  placeholder="Characters"
                  aria-label="Short length in characters"
                  style={{
                    width: '100%',
                  }}
                />
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  chars
                </p>
              </div>
            </div>
            {lengthErrors.short && (
              <p
                id="error-short-length"
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: '#ef4444',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                {lengthErrors.short}
              </p>
            )}
          </div>

          {/* Medium length inputs */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              Medium length
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  id="medium-length"
                  type="number"
                  className="flint-input"
                  min="5"
                  max="2000"
                  value={mediumLengthInput}
                  onChange={(e) => updateMediumLength(e.target.value)}
                  onBlur={(e) => clampMediumLength(e.target.value)}
                  placeholder="Words"
                  aria-label="Medium length in words"
                  aria-invalid={!!lengthErrors.medium}
                  style={{
                    width: '100%',
                    borderColor: lengthErrors.medium ? '#ef4444' : undefined,
                  }}
                />
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  words
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  id="medium-chars"
                  type="number"
                  className="flint-input"
                  min="25"
                  max="10000"
                  value={mediumCharsInput}
                  onChange={(e) => updateMediumChars(e.target.value)}
                  onBlur={(e) => clampMediumChars(e.target.value)}
                  placeholder="Characters"
                  aria-label="Medium length in characters"
                  style={{
                    width: '100%',
                  }}
                />
                <p
                  style={{
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  chars
                </p>
              </div>
            </div>
            {lengthErrors.medium && (
              <p
                id="error-medium-length"
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: '#ef4444',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                {lengthErrors.medium}
              </p>
            )}
          </div>

          {/* Context awareness toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                htmlFor="context-awareness-toggle"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text)',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Context aware
              </label>
              <p
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                When enabled, the AI will reference your last prompt to understand follow-up requests
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
                id="context-awareness-toggle"
                type="checkbox"
                checked={generateSettings.contextAwarenessEnabled}
                onChange={(e) => updateGenerateSettings({ contextAwarenessEnabled: e.target.checked })}
                aria-label="Toggle context awareness"
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
                  background: generateSettings.contextAwarenessEnabled
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
                    left: generateSettings.contextAwarenessEnabled ? '24px' : '4px',
                    bottom: '3px',
                    background: 'white',
                    transition: '0.2s',
                    borderRadius: '50%',
                  }}
                />
              </span>
            </label>
          </div>
            </div>
          )}
        </section>
      )}

      {/* Language Section */}
      <section style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-muted)' }}>
        <button
          onClick={() => toggleSection('voiceRecognition')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: 0,
            marginBottom: expandedSections.voiceRecognition ? '16px' : '0',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
          aria-expanded={expandedSections.voiceRecognition}
          aria-controls="voice-recognition-content"
        >
          <h3
            style={{
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Voice Recognition
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              transform: expandedSections.voiceRecognition ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {expandedSections.voiceRecognition && (
          <div id="voice-recognition-content">

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
          </div>
        )}
      </section>

      {/* Keyboard Shortcuts Section */}
      <section
        style={{
          marginBottom: '24px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <button
          onClick={() => toggleSection('shortcuts')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: 0,
            marginBottom: expandedSections.shortcuts ? '16px' : '0',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
          aria-expanded={expandedSections.shortcuts}
          aria-controls="shortcuts-content"
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
            Keyboard Shortcuts
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              transform: expandedSections.shortcuts ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {expandedSections.shortcuts && (
          <div id="shortcuts-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Undo</span>
                <code style={{ 
                  padding: '4px 12px', 
                  background: 'var(--surface)', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-muted)',
                  fontSize: 'var(--fs-sm)',
                  fontFamily: 'monospace',
                  color: 'var(--text)'
                }}>
                  {navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z'}
                </code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Redo</span>
                <code style={{ 
                  padding: '4px 12px', 
                  background: 'var(--surface)', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-muted)',
                  fontSize: 'var(--fs-sm)',
                  fontFamily: 'monospace',
                  color: 'var(--text)'
                }}>
                  {navigator.platform.includes('Mac') ? '⌘⇧Z' : 'Ctrl+Y'}
                </code>
              </div>
            </div>
          </div>
        )}
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
        <button
          onClick={() => toggleSection('privacy')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text)',
            textAlign: 'left',
          }}
          aria-expanded={expandedSections.privacy}
          aria-controls="privacy-content"
        >
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                style={{
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 600,
                  color: '#fbbf24',
                  margin: 0,
                }}
              >
                Privacy Notice
              </h3>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  transform: expandedSections.privacy ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  marginLeft: '8px',
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            {expandedSections.privacy && (
              <p
                id="privacy-content"
                style={{
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                  margin: '8px 0 0 0',
                  lineHeight: '1.5',
                }}
              >
                Speech recognition uses the Web Speech API, which may send audio to
                a network-based service for transcription. All AI text processing
                (summarization and rewriting) happens locally on your device using
                Chrome&apos;s built-in AI.
              </p>
            )}
          </div>
        </button>
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
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0',
          }}
          onClick={handleCloseDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              height: '100vh',
              background: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--stroke)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--surface)',
                    color: 'var(--primary)',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <h3
                  id="dialog-title"
                  style={{
                    fontSize: 'var(--fs-lg)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {dialogMode === 'add' ? 'Add Pinned Note' : 'Edit Pinned Note'}
                </h3>
              </div>
              <button
                onClick={handleCloseDialog}
                aria-label="Close dialog"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                overflow: 'hidden',
              }}
            >
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
                  style={{ width: '100%', background: 'transparent', border: 'none' }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                  style={{
                    width: '100%',
                    flex: 1,
                    resize: 'none',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    overflowY: 'auto',
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  marginTop: '16px',
                  marginBottom: 0,
                  textAlign: 'center',
                }}
              >
                This note will be merged into AI prompts for summarization and rewriting.
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid var(--stroke)',
                flexShrink: 0,
              }}
            >
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
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0',
          }}
          onClick={handleCloseDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              height: '100vh',
              background: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--stroke)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h3
                  id="delete-dialog-title"
                  style={{
                    fontSize: 'var(--fs-lg)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Delete Pinned Note?
                </h3>
              </div>
              <button
                onClick={handleCloseDialog}
                aria-label="Close dialog"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--fs-base)',
                  color: 'var(--text-muted)',
                  margin: 0,
                  lineHeight: '1.6',
                }}
              >
                Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>&quot;{selectedNote.title}&quot;</strong>? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid var(--stroke)',
                flexShrink: 0,
              }}
            >
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
