import { useState, useRef, useEffect } from 'react';
import type { PinnedNote, GenerateSettings, PromptHistoryItem } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { VersionCarousel, type Version } from './VersionCarousel';

/**
 * GeneratePanel component props
 */
export interface GeneratePanelProps {
  /**
   * Pinned notes to merge into AI context
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Callback when generation completes successfully
   */
  onGenerateComplete?: (text: string) => void;
}

/**
 * GeneratePanel component for text generation using Writer API
 * Provides prompt input and generated text output
 */
export function GeneratePanel({
  pinnedNotes = [],
  onGenerateComplete,
}: GeneratePanelProps) {
  // App state no longer needed after history removal
  
  // Component state
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Version carousel state
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // New state for generate panel enhancements
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const lengthDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const isPromptFromHistoryRef = useRef<boolean>(false);

  // Load prompt history on mount
  useEffect(() => {
    const loadPromptHistory = async () => {
      try {
        const history = await StorageService.getPromptHistory(4);
        setPromptHistory(history);
      } catch (error) {
        console.error('[GeneratePanel] Failed to load prompt history:', error);
      }
    };

    loadPromptHistory();
  }, []);

  // Load generate settings on mount
  useEffect(() => {
    const loadGenerateSettings = async () => {
      try {
        const settings = await StorageService.getGenerateSettings();
        setGenerateSettings(settings);
      } catch (error) {
        console.error('[GeneratePanel] Failed to load generate settings:', error);
      }
    };

    loadGenerateSettings();
  }, []);

  // Listen for generate settings changes and clear context when context awareness is disabled (Requirement 3.7)
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['generateSettings']) {
        const newSettings = changes['generateSettings'].newValue as GenerateSettings;
        setGenerateSettings(newSettings);
        
        // Clear context when context awareness is disabled
        if (!newSettings.contextAwarenessEnabled && currentContext) {
          setCurrentContext(null);
          console.log('[GeneratePanel] Context cleared due to context awareness being disabled');
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [currentContext]);

  // Listen for history clear events
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['flint.historyClearedAt']) {
        console.log('[GeneratePanel] History cleared, resetting versions');
        // Reset versions to empty state
        setVersions([]);
        setCurrentVersionIndex(0);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Handle clicking outside length dropdown to close it
  useEffect(() => {
    if (!showLengthDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        lengthDropdownRef.current &&
        !lengthDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLengthDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLengthDropdown]);

  // Handle clicking outside history dropdown to close it
  useEffect(() => {
    if (!showHistoryDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyDropdownRef.current &&
        !historyDropdownRef.current.contains(event.target as Node)
      ) {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryDropdown]);



  /**
   * Handles prompt input change
   */
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    
    // Reset history flag when user manually types (modifies the prompt)
    isPromptFromHistoryRef.current = false;
    
    // Clear context when prompt input is cleared (Requirement 3.7)
    if (value.trim() === '') {
      setCurrentContext(null);
    }
  };

  /**
   * Handles double-click on prompt input
   * Fills input with last prompt if empty
   */
  const handlePromptDoubleClick = () => {
    if (prompt === '' && promptHistory.length > 0) {
      setPrompt(promptHistory[0]!.text);
      // Mark that this prompt came from history
      isPromptFromHistoryRef.current = true;
    }
  };

  /**
   * Selects a prompt from history
   */
  const selectPromptFromHistory = (promptText: string) => {
    setPrompt(promptText);
    setShowHistoryDropdown(false);
    // Mark that this prompt came from history so we don't save it again
    isPromptFromHistoryRef.current = true;
    if (promptInputRef.current) {
      promptInputRef.current.focus();
    }
  };

  /**
   * Toggles pin status of a prompt
   */
  const togglePromptPin = async (id: string) => {
    try {
      await StorageService.togglePromptPin(id);
      // Reload history
      const history = await StorageService.getPromptHistory(4);
      setPromptHistory(history);
    } catch (error) {
      console.error('[GeneratePanel] Failed to toggle pin:', error);
    }
  };

  /**
   * Deletes a prompt from history
   */
  const deletePromptFromHistory = async (id: string) => {
    try {
      await StorageService.deletePromptFromHistory(id);
      // Reload history
      const history = await StorageService.getPromptHistory(4);
      setPromptHistory(history);
      // Close dropdown if no items left
      if (history.length === 0) {
        setShowHistoryDropdown(false);
      }
    } catch (error) {
      console.error('[GeneratePanel] Failed to delete prompt:', error);
    }
  };

  /**
   * Insert text at cursor position in prompt input
   */
  const insertTextAtCursor = (insertText: string) => {
    const input = promptInputRef.current;
    if (!input) {
      setPrompt((prev) => prev + insertText);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentText = prompt;

    // Insert text at cursor position
    const newText =
      currentText.substring(0, start) +
      insertText +
      currentText.substring(end);
    setPrompt(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + insertText.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Handles voice recording
   */
  const handleVoiceToggle = () => {
    if (isRecording) {
      // Stop recording
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser');
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
          insertTextAtCursor(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[GeneratePanel] Speech recognition error:', event.error);
        setError('Speech recognition error. Please try again.');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      try {
        recognition.start();
        setIsRecording(true);
        setError(null);
      } catch (err) {
        console.error('[GeneratePanel] Failed to start recording:', err);
        setError('Failed to start recording. Please try again.');
      }

      speechRecognitionRef.current = recognition;
    }
  };

  /**
   * Handles generate button click
   * Triggers generation operation
   */
  const handleGenerate = async () => {
    // Clear previous error
    setError(null);
    setIsProcessing(true);

    try {
      // Load generate settings at start of method (Requirement 6.7)
      // Use defaults if settings are null or loading fails
      let settings = generateSettings;
      if (!settings) {
        try {
          settings = await StorageService.getGenerateSettings();
        } catch (settingsError) {
          console.error('[GeneratePanel] Failed to load generate settings, using defaults:', settingsError);
          // Use hardcoded defaults as fallback (Requirement 6.7)
          settings = {
            shortLength: 100,
            mediumLength: 300,
            contextAwarenessEnabled: true,
          };
        }
      }
      
      // Use default prompt if empty - "Continue writing" or "Extend this content"
      const effectivePrompt = prompt.trim() || 'Continue writing and extend this content naturally';
      
      // Prepare pinned notes context
      const pinnedNotesContent = pinnedNotes.map(
        (note) => `${note.title}: ${note.content}`
      );

      // Determine length hint based on selected length
      let lengthHint: number | undefined;
      if (selectedLength === 'short') {
        lengthHint = settings.shortLength;
      } else if (selectedLength === 'medium') {
        lengthHint = settings.mediumLength;
      }
      // For 'long', lengthHint remains undefined

      // Prepare context if context awareness is enabled (Requirement 6.4, 3.4)
      // Handle case where contextAwarenessEnabled is true but currentContext is null
      // Context is the ending of previous output for better continuation
      let contextToPass: string | undefined;
      if (settings.contextAwarenessEnabled && currentContext) {
        // Pass the context directly - it will be formatted by AIService
        contextToPass = currentContext;
      }
      // If currentContext is null, contextToPass remains undefined and generation proceeds without context

      // Call AI service with timeout
      const generatePromise = AIService.generate(effectivePrompt, {
        pinnedNotes:
          pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
        length: selectedLength,
        lengthHint: lengthHint,
        context: contextToPass,
      });

      // Add 60 second timeout for generation
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Operation timed out after 60 seconds')),
          60000
        )
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);

      console.log('[GeneratePanel] Generation completed successfully');

      // History saving removed - now using snapshots instead
      let historyItemId: string | undefined;

      // Save prompt to prompt history (Requirement 6.6)
      // Only save if user provided a custom prompt (not the default and not from history)
      // Handle IndexedDB storage failures gracefully - log error and continue without saving
      if (prompt.trim() && !isPromptFromHistoryRef.current) {
        try {
          await StorageService.savePromptToHistory(prompt);
          console.log('[GeneratePanel] Prompt saved to history');
          
          // Reload history to get updated list
          const history = await StorageService.getPromptHistory(4);
          setPromptHistory(history);
        } catch (promptHistoryError) {
          // Gracefully handle storage failure - log error and continue (Requirement 6.6)
          console.error('[GeneratePanel] Failed to save prompt to history:', promptHistoryError);
          // Generation continues successfully even if prompt history save fails
        }
      }
      
      // Reset the history flag after generation
      isPromptFromHistoryRef.current = false;

      // Generate output summary and update context (Requirements 3.2, 3.3, 3.5, 3.6, 3.9)
      // Context is based on OUTPUT summary, not the user's prompt
      if (settings.contextAwarenessEnabled) {
        try {
          console.log('[GeneratePanel] Generating output summary for context...');
          const outputSummary = await AIService.generateOutputSummary(result);
          setCurrentContext(outputSummary);
          console.log('[GeneratePanel] Context updated with output summary:', outputSummary);
        } catch (summaryError) {
          // Handle output summary generation failure gracefully (Requirement 6.7)
          console.error('[GeneratePanel] Failed to generate output summary:', summaryError);
          // Use fallback: first 100 chars of output
          const fallbackSummary = result.slice(0, 100) + (result.length > 100 ? '...' : '');
          setCurrentContext(fallbackSummary);
          console.log('[GeneratePanel] Using fallback summary for context');
        }
      }

      // Create new version and add to carousel
      const newVersion: Version = {
        id: `generate-${Date.now()}`,
        text: result,
        label: `Result ${versions.length + 1}`,
        title: effectivePrompt.slice(0, 50) + (effectivePrompt.length > 50 ? '...' : ''), // Use first 50 chars of prompt as title
        isOriginal: false,
        isLiked: false,
        timestamp: Date.now(),
        historyId: historyItemId,
      };

      setVersions((prev) => [...prev, newVersion]);
      setCurrentVersionIndex(versions.length); // Navigate to new version

      // Clear prompt after successful generation
      setPrompt('');

      // Call completion callback if provided
      if (onGenerateComplete) {
        onGenerateComplete(result);
      }
    } catch (err) {
      // Handle specific error types with user-friendly messages
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // User activation required error
        if (
          message.includes('user activation') ||
          message.includes('click the button again')
        ) {
          errorMessage = 'Please click the button again to continue.';
        }
        // AI unavailable error
        else if (
          message.includes('not available') ||
          message.includes('chrome 128') ||
          message.includes('gemini nano')
        ) {
          errorMessage =
            'AI features require Chrome 128 or later with Gemini Nano enabled.';
        }
        // Timeout error
        else if (message.includes('timed out') || message.includes('timeout')) {
          errorMessage =
            'Operation timed out. Try with a simpler prompt or check your connection.';
        }
        // Generic error with original message
        else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('[GeneratePanel] Generation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles retry button click
   * Clears error and retries the generation operation
   */
  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  /**
   * Handles version navigation
   */
  const handleNavigate = (index: number) => {
    setCurrentVersionIndex(index);
  };

  /**
   * Handles version deletion
   */
  const handleDelete = (id: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== id));
  };

  /**
   * Handles version like toggle
   */
  const handleToggleLike = async (id: string) => {
    // Find the version to get its history ID
    const version = versions.find((v) => v.id === id);
    console.log('[GeneratePanel] Toggle like for version:', id, 'historyId:', version?.historyId);
    
    // Update version state
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isLiked: !v.isLiked } : v))
    );
    
    // History update removed - now using snapshots instead
  };

  /**
   * Handles version edit
   */
  const handleEdit = (id: string, newText: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, text: newText } : v))
    );
  };

  /**
   * Handles title edit
   */
  const handleEditTitle = (id: string, newTitle: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, title: newTitle } : v))
    );
  };

  /**
   * Handles clear all button click
   * Resets all versions to empty state
   */
  const handleClearAll = () => {
    setVersions([]);
    setCurrentVersionIndex(0);
  };

  /**
   * Handles copy to clipboard from carousel
   */
  const handleCopy = (id: string) => {
    console.log('[GeneratePanel] Text copied to clipboard for version:', id);
  };

  /**
   * Handles text change from carousel (for counter display)
   */
  const handleTextChange = (words: number, chars: number) => {
    setWordCount(words);
    setCharCount(chars);
  };



  /**
   * Gets the label for the current length selection
   * @param length - The selected length
   * @returns Label string for the length
   */
  const getLengthLabel = (length: 'short' | 'medium' | 'long'): string => {
    switch (length) {
      case 'short':
        return 'Short';
      case 'medium':
        return 'Med';
      case 'long':
        return 'Long';
    }
  };

  /**
   * Handles length selection from dropdown
   * @param length - The selected length
   */
  const selectLength = (length: 'short' | 'medium' | 'long') => {
    setSelectedLength(length);
    setShowLengthDropdown(false);
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="flint-section-header" style={{ marginBottom: 0 }}>Generate text</h2>
        {versions.length > 0 && (
          <div
            style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              fontWeight: 500,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            aria-label={`${wordCount} ${wordCount === 1 ? 'word' : 'words'}, ${charCount} ${charCount === 1 ? 'character' : 'characters'}`}
          >
            <span>{wordCount}w</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{charCount}c</span>
          </div>
        )}
      </div>

      {/* Output carousel - takes available space */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{ marginBottom: '16px', overflow: 'auto' }}
      >
        <VersionCarousel
          versions={versions}
          currentIndex={currentVersionIndex}
          onNavigate={handleNavigate}
          onDelete={handleDelete}
          onToggleLike={handleToggleLike}
          onCopy={handleCopy}
          onClearAll={handleClearAll}
          onEdit={handleEdit}
          onEditTitle={handleEditTitle}
          onTextChange={handleTextChange}
          isLoading={isProcessing}
          placeholder="Generated text will appear here..."
          alwaysShowActions={true}
          readOnly={true}
        />
      </div>

      {/* Prompt input card with inline buttons - fixed at bottom */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        {/* History button on left */}
        <button
          onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
          disabled={isProcessing || promptHistory.length === 0}
          aria-label="Prompt history"
          aria-expanded={showHistoryDropdown}
          aria-haspopup="true"
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
            boxShadow: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text)',
            zIndex: 10,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderBottom: '1px solid var(--border-muted)',
                }}
              >
                <button
                  onClick={() => selectPromptFromHistory(item.text)}
                  title={item.text}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-sm)',
                    transition: 'background 0.15s',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    // Enable auto-scroll on hover
                    const textElement = e.currentTarget.querySelector('.prompt-text') as HTMLElement;
                    if (textElement && textElement.scrollWidth > textElement.clientWidth) {
                      textElement.style.animation = 'scroll-text 3s linear infinite';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    // Disable auto-scroll
                    const textElement = e.currentTarget.querySelector('.prompt-text') as HTMLElement;
                    if (textElement) {
                      textElement.style.animation = 'none';
                    }
                  }}
                >
                  <div
                    className="prompt-text"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.text}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePromptPin(item.id);
                  }}
                  aria-label={item.pinned ? 'Unpin' : 'Pin'}
                  title={item.pinned ? 'Unpin' : 'Pin'}
                  style={{
                    padding: '12px 8px',
                    background: 'none',
                    border: 'none',
                    color: item.pinned ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = item.pinned ? 'var(--accent)' : 'var(--text-muted)';
                  }}
                >
                  {item.pinned ? '★' : '☆'}
                </button>
                {!item.pinned && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePromptFromHistory(item.id);
                    }}
                    aria-label="Delete prompt"
                    title="Delete"
                    style={{
                      padding: '12px 12px 12px 4px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '20px',
                      transition: 'color 0.15s',
                      flexShrink: 0,
                      lineHeight: 1,
                      fontWeight: 300,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Length dropdown menu */}
        {showLengthDropdown && (
          <div
            ref={lengthDropdownRef}
            className="length-dropdown"
            role="menu"
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
            <button
              role="menuitem"
              onClick={() => selectLength('short')}
              style={{
                width: '100%',
                height: '52px',
                padding: '8px 16px',
                textAlign: 'left',
                background: selectedLength === 'short' ? 'var(--surface-2)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-muted)',
                borderTopLeftRadius: 'var(--radius-md)',
                borderTopRightRadius: 'var(--radius-md)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: 'var(--fs-md)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                if (selectedLength !== 'short') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>Short</div>
                <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                  ~{generateSettings?.shortLength || 100} words
                </div>
              </div>
            </button>
            <button
              role="menuitem"
              onClick={() => selectLength('medium')}
              style={{
                width: '100%',
                height: '52px',
                padding: '8px 16px',
                textAlign: 'left',
                background: selectedLength === 'medium' ? 'var(--surface-2)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-muted)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: 'var(--fs-md)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                if (selectedLength !== 'medium') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>Medium</div>
                <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                  ~{generateSettings?.mediumLength || 300} words
                </div>
              </div>
            </button>
            <button
              role="menuitem"
              onClick={() => selectLength('long')}
              style={{
                width: '100%',
                height: '52px',
                padding: '8px 16px',
                textAlign: 'left',
                background: selectedLength === 'long' ? 'var(--surface-2)' : 'transparent',
                border: 'none',
                borderBottomLeftRadius: 'var(--radius-md)',
                borderBottomRightRadius: 'var(--radius-md)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: 'var(--fs-md)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                if (selectedLength !== 'long') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>Long</div>
                <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                  unlimited
                </div>
              </div>
            </button>
          </div>
        )}

        <input
          ref={promptInputRef}
          type="text"
          className="flint-input"
          placeholder="Start writing..."
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          onDoubleClick={handlePromptDoubleClick}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && prompt === '' && promptHistory.length > 0) {
              e.preventDefault();
              setPrompt(promptHistory[0]!.text);
              // Mark that this prompt came from history
              isPromptFromHistoryRef.current = true;
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          disabled={isProcessing}
          aria-label="Prompt input"
          style={{
            width: '100%',
            height: '48px',
            padding: '0 140px 0 52px',
          }}
        />

        {/* Inline action buttons - positioned in right side */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '8px',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          {/* Length selector button */}
          <button
            className="flint-btn ghost length-selector-btn"
            onClick={() => setShowLengthDropdown(!showLengthDropdown)}
            disabled={isProcessing}
            aria-label={`Length: ${selectedLength}`}
            aria-expanded={showLengthDropdown}
            aria-haspopup="true"
            title={`Length: ${selectedLength}`}
            style={{
              width: 'auto',
              minWidth: '50px',
              height: '36px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {getLengthLabel(selectedLength)}
          </button>

          {/* Voice button */}
          <button
            className={`flint-btn ${isRecording ? 'recording' : 'ghost'} generate-voice-btn`}
            onClick={handleVoiceToggle}
            disabled={isProcessing}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            title={isRecording ? 'Stop recording' : 'Voice input'}
            style={{
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isRecording ? undefined : 'none',
              boxShadow: isRecording ? undefined : 'none',
              background: isRecording ? undefined : 'transparent',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>

          {/* Generate button */}
          <button
            className="flint-btn primary"
            onClick={handleGenerate}
            disabled={isProcessing}
            aria-label="Generate"
            aria-busy={isProcessing}
            title="Generate"
            style={{
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isProcessing ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 56 56"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error message with retry option */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: 'var(--fs-sm)',
            color: '#ef4444',
          }}
          role="alert"
          aria-live="assertive"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
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
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ flex: 1 }}>{error}</span>
          </div>
          <button
            className="flint-btn ghost"
            onClick={handleRetry}
            disabled={isProcessing}
            aria-label="Retry generation operation"
            style={{
              fontSize: 'var(--fs-xs)',
              height: '32px',
              padding: '0 12px',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
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
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Retry
          </button>
        </div>
      )}



      {/* Pinned notes indicator */}
      {pinnedNotes.length > 0 && (
        <div
          style={{
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
          role="status"
          aria-live="polite"
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
            <path d="M12 17V3" />
            <path d="m6 11 6 6 6-6" />
            <path d="M19 21H5" />
          </svg>
          {pinnedNotes.length} pinned{' '}
          {pinnedNotes.length === 1 ? 'note' : 'notes'} will be included
        </div>
      )}
    </div>
  );
}

// Add spin animation for loading spinner and button styles
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes scroll-text {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-100% + 100px));
    }
  }
  
  .generate-voice-btn:not(.recording) {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
  
  .generate-voice-btn:not(.recording):hover,
  .generate-voice-btn:not(.recording):focus-visible {
    border: 1px solid var(--border) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    background: var(--surface-2) !important;
  }
  
  .length-selector-btn {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
  
  .length-selector-btn:hover,
  .length-selector-btn:focus-visible {
    border: 1px solid var(--border) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    background: var(--surface-2) !important;
  }
`;
document.head.appendChild(style);
