import { useState, useRef, useEffect } from 'react';
import type { PinnedNote, PromptHistoryItem, GenerateSettings } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';

/**
 * Tool type for the active tool
 */
export type ToolType = 'generate' | 'rewrite' | 'summarize';

/**
 * Summary mode options
 */
type SummaryMode = 'bullets' | 'paragraph' | 'brief';

/**
 * Reading level options
 */
type ReadingLevel = 'simple' | 'moderate' | 'detailed' | 'complex';

/**
 * ToolControlsContainer component props
 */
export interface ToolControlsProps {
  /**
   * Active tool that determines which controls to display
   */
  activeTool: ToolType;

  /**
   * Pinned notes to pass to tool controls
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Current editor content (for operations)
   */
  content: string;

  /**
   * Current selection range in editor
   */
  selection?: { start: number; end: number };

  /**
   * Callback when an operation starts
   */
  onOperationStart?: () => void;

  /**
   * Callback when an operation completes successfully
   */
  onOperationComplete?: (result: string, operationType: ToolType) => void;

  /**
   * Callback when an operation fails
   */
  onOperationError?: (error: string) => void;
}

/**
 * ToolControlsContainer component
 * Displays tool-specific controls below the unified editor based on the active tool
 * Conditionally renders Generate, Rewrite, or Summarize controls
 */
export function ToolControlsContainer({
  activeTool,
  pinnedNotes = [],
  content,
  selection: _selection,
  onOperationStart,
  onOperationComplete,
  onOperationError,
}: ToolControlsProps) {
  // Generate controls state
  const [prompt, setPrompt] = useState('');
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
  const [isGenerateRecording, setIsGenerateRecording] = useState(false);

  // Rewrite controls state
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isRewriteRecording, setIsRewriteRecording] = useState(false);

  // Summarize controls state
  const [mode, setMode] = useState<SummaryMode>('bullets');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('moderate');

  // Common state
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const customPromptInputRef = useRef<HTMLInputElement>(null);
  const lengthDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Rewrite presets
  const presets = [
    'Simplify',
    'Clarify',
    'Concise',
    'Expand',
    'Friendly',
    'Formal',
    'Poetic',
    'Persuasive',
  ];

  // Load prompt history and settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const history = await StorageService.getPromptHistory(4);
        setPromptHistory(history);
        
        const settings = await StorageService.getGenerateSettings();
        setGenerateSettings(settings);
      } catch (error) {
        console.error('[ToolControlsContainer] Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lengthDropdownRef.current && !lengthDropdownRef.current.contains(event.target as Node)) {
        setShowLengthDropdown(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setShowPresetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Gets the label for the current length selection
   */
  const getLengthLabel = (length: 'short' | 'medium' | 'long'): string => {
    switch (length) {
      case 'short': return 'Short';
      case 'medium': return 'Med';
      case 'long': return 'Long';
    }
  };

  /**
   * Handles generate operation
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      onOperationError?.('Please enter a prompt');
      return;
    }

    setIsProcessing(true);
    onOperationStart?.();

    try {
      const settings = generateSettings || {
        shortLength: 100,
        mediumLength: 300,
        contextAwarenessEnabled: true,
      };

      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      let lengthHint: number | undefined;
      if (selectedLength === 'short') lengthHint = settings.shortLength;
      else if (selectedLength === 'medium') lengthHint = settings.mediumLength;

      const result = await AIService.generate(prompt, {
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
        length: selectedLength,
        lengthHint,
      });

      await StorageService.savePromptToHistory(prompt);
      setPrompt('');
      onOperationComplete?.(result, 'generate');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles rewrite operation
   */
  const handleRewrite = async () => {
    if (!content.trim()) {
      onOperationError?.('Please enter text to rewrite');
      return;
    }

    if (!customPrompt.trim()) {
      onOperationError?.('Please enter rewrite instructions');
      return;
    }

    setIsProcessing(true);
    onOperationStart?.();

    try {
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      const result = await AIService.rewrite(content, {
        customPrompt: customPrompt.trim(),
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      onOperationComplete?.(result, 'rewrite');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rewrite failed';
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles summarize operation
   */
  const handleSummarize = async () => {
    if (!content.trim()) {
      onOperationError?.('Please enter text to summarize');
      return;
    }

    setIsProcessing(true);
    onOperationStart?.();

    try {
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      const result = await AIService.summarize(content, {
        mode,
        readingLevel,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      onOperationComplete?.(result, 'summarize');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summarize failed';
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles voice recording toggle
   */
  const handleVoiceToggle = (tool: 'generate' | 'rewrite') => {
    const isRecording = tool === 'generate' ? isGenerateRecording : isRewriteRecording;
    const setIsRecording = tool === 'generate' ? setIsGenerateRecording : setIsRewriteRecording;

    if (isRecording) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        onOperationError?.('Speech recognition is not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const isFinal = event.results[0].isFinal;

        if (isFinal) {
          if (tool === 'generate') {
            setPrompt(prev => prev + transcript);
          } else {
            setCustomPrompt(prev => prev + transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[ToolControlsContainer] Speech recognition error:', event.error);
        onOperationError?.('Speech recognition error. Please try again.');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('[ToolControlsContainer] Failed to start recording:', err);
        onOperationError?.('Failed to start recording. Please try again.');
      }

      speechRecognitionRef.current = recognition;
    }
  };

  return (
    <div
      style={{
        marginTop: '16px',
        flexShrink: 0,
      }}
    >
      {/* Generate Controls */}
      {activeTool === 'generate' && (
        <div style={{ position: 'relative' }}>
          {/* History button */}
          <button
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            disabled={isProcessing || promptHistory.length === 0}
            aria-label="Prompt history"
            title="Prompt history"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text)',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>

          {/* History dropdown */}
          {showHistoryDropdown && promptHistory.length > 0 && (
            <div
              ref={historyDropdownRef}
              style={{
                position: 'absolute',
                left: '0',
                right: '0',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {promptHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPrompt(item.text);
                    setShowHistoryDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-muted)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-sm)',
                  }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          )}

          {/* Length dropdown */}
          {showLengthDropdown && (
            <div
              ref={lengthDropdownRef}
              style={{
                position: 'absolute',
                left: '0',
                right: '0',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
              }}
            >
              {(['short', 'medium', 'long'] as const).map((length) => (
                <button
                  key={length}
                  onClick={() => {
                    setSelectedLength(length);
                    setShowLengthDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: selectedLength === length ? 'var(--surface-2)' : 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                </button>
              ))}
            </div>
          )}

          <input
            ref={promptInputRef}
            type="text"
            className="flint-input"
            placeholder="Start writing..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={isProcessing}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 140px 0 52px',
            }}
          />

          {/* Inline buttons */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setShowLengthDropdown(!showLengthDropdown)}
              disabled={isProcessing}
              style={{
                width: 'auto',
                minWidth: '50px',
                height: '36px',
                padding: '0 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {getLengthLabel(selectedLength)}
            </button>

            <button
              onClick={() => handleVoiceToggle('generate')}
              disabled={isProcessing}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>

            <button
              className="flint-btn primary"
              onClick={handleGenerate}
              disabled={isProcessing || !prompt.trim()}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
              }}
            >
              {isProcessing ? '...' : '✨'}
            </button>
          </div>
        </div>
      )}

      {/* Rewrite Controls */}
      {activeTool === 'rewrite' && (
        <div style={{ position: 'relative' }}>
          {/* Preset dropdown button */}
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            disabled={isProcessing}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              padding: '0',
              border: 'none',
              background: showPresetMenu ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Preset menu */}
          {showPresetMenu && (
            <div
              ref={presetMenuRef}
              style={{
                position: 'absolute',
                left: '8px',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                minWidth: '160px',
              }}
            >
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomPrompt(preset);
                    setShowPresetMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: selectedPreset === preset ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          <input
            ref={customPromptInputRef}
            type="text"
            className="flint-input"
            placeholder="Choose a preset or describe how to rewrite..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleRewrite();
              }
            }}
            disabled={isProcessing}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 100px 0 48px',
            }}
          />

          {/* Inline buttons */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              onClick={() => handleVoiceToggle('rewrite')}
              disabled={isProcessing}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>

            <button
              className="flint-btn primary"
              onClick={handleRewrite}
              disabled={isProcessing}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
              }}
            >
              {isProcessing ? '...' : '✏️'}
            </button>
          </div>
        </div>
      )}

      {/* Summarize Controls */}
      {activeTool === 'summarize' && (
        <div>
          {/* Mode selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Summary format
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['bullets', 'paragraph', 'brief'] as const).map((modeOption) => (
                <button
                  key={modeOption}
                  className={`flint-btn ${mode === modeOption ? 'primary' : 'ghost'}`}
                  onClick={() => setMode(modeOption)}
                  disabled={isProcessing}
                  style={{ flex: 1 }}
                >
                  {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reading level dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Reading level
            </label>
            <select
              className="flint-input"
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
              disabled={isProcessing}
              style={{ width: '100%', height: '48px', padding: '12px 16px' }}
            >
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="detailed">Detailed</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {/* Summarize button */}
          <button
            className="flint-btn primary"
            onClick={handleSummarize}
            disabled={isProcessing}
            style={{ width: '100%' }}
          >
            {isProcessing ? 'Processing...' : 'Summarize'}
          </button>
        </div>
      )}

      {/* Pinned notes indicator */}
      {pinnedNotes.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-muted)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 17V3" />
            <path d="m6 11 6 6 6-6" />
            <path d="M19 21H5" />
          </svg>
          {pinnedNotes.length} pinned {pinnedNotes.length === 1 ? 'note' : 'notes'} will be included
        </div>
      )}
    </div>
  );
}
