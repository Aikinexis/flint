import { useState, useEffect, useRef } from 'react';
import type { PinnedNote } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { VersionCarousel, type Version } from './VersionCarousel';
import { useAppState } from '../state';

/**
 * RewritePanel component props
 */
export interface RewritePanelProps {
  /**
   * Initial text to rewrite (e.g., from selection)
   */
  initialText?: string;

  /**
   * Pinned notes to merge into AI context
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Callback when rewrite completes successfully (deprecated - now handled internally)
   */
  onRewriteComplete?: (original: string, rewritten: string) => void;
}



/**
 * RewritePanel component for text rewriting with presets and custom prompts
 * Provides preset buttons, custom instruction field, and rewrite functionality
 */
export function RewritePanel({ 
  initialText = '', 
  pinnedNotes = [],
}: RewritePanelProps) {
  // Get app state and actions for updating history
  const { state, actions } = useAppState();
  
  // Component state
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockProvider, setIsMockProvider] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  
  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const lastInitialTextRef = useRef<string>(initialText);

  // Preset options
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
  
  // Version carousel state - initialize with empty version
  const [versions, setVersions] = useState<Version[]>(() => [{
    id: `original-${Date.now()}`,
    text: initialText,
    label: 'Original',
    isOriginal: true,
    isLiked: false,
    timestamp: Date.now(),
  }]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Update versions when initialText changes (e.g., from minibar selection)
  // Only update if initialText is different from the last one we processed
  useEffect(() => {
    if (initialText && initialText !== lastInitialTextRef.current) {
      lastInitialTextRef.current = initialText;
      // Strip timestamp marker if present (format: text\0timestamp)
      const cleanText = initialText.includes('\0') 
        ? initialText.substring(0, initialText.lastIndexOf('\0'))
        : initialText;
      // Replace with version containing new text
      setVersions([{
        id: `original-${Date.now()}`,
        text: cleanText,
        label: 'Original',
        isOriginal: true,
        isLiked: false,
        timestamp: Date.now(),
      }]);
      setCurrentVersionIndex(0);
    }
  }, [initialText]);

  // Listen for history clear events
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['flint.historyClearedAt']) {
        console.log('[RewritePanel] History cleared, resetting versions');
        // Reset versions to empty original version
        setVersions([{
          id: `original-${Date.now()}`,
          text: '',
          label: 'Original',
          isOriginal: true,
          isLiked: false,
          timestamp: Date.now(),
        }]);
        setCurrentVersionIndex(0);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Close preset menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setShowPresetMenu(false);
      }
    };

    if (showPresetMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPresetMenu]);



  /**
   * Handles custom prompt input change
   */
  const handleCustomPromptChange = (value: string) => {
    // If there's a preset and user is typing after it
    if (selectedPreset && value.startsWith(selectedPreset)) {
      const afterPreset = value.slice(selectedPreset.length);
      
      // If user is typing right after preset (no space yet), add " - "
      if (afterPreset.length > 0 && !afterPreset.startsWith(' ') && !afterPreset.startsWith(' - ')) {
        setCustomPrompt(`${selectedPreset} - ${afterPreset}`);
      } else {
        setCustomPrompt(value);
      }
    } else if (selectedPreset && !value.startsWith(selectedPreset)) {
      // User deleted the preset, clear it
      setSelectedPreset('');
      setCustomPrompt(value);
    } else {
      setCustomPrompt(value);
    }
  };

  /**
   * Handles preset selection
   */
  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    
    // If there's already custom text after a preset, replace the preset
    if (customPrompt.includes(' - ')) {
      const customPart = customPrompt.split(' - ').slice(1).join(' - ');
      setCustomPrompt(`${preset} - ${customPart}`);
    } else {
      setCustomPrompt(preset);
    }
    
    setShowPresetMenu(false);
    
    // Focus input after selection
    setTimeout(() => {
      promptInputRef.current?.focus();
      // Move cursor to end
      const length = promptInputRef.current?.value.length || 0;
      promptInputRef.current?.setSelectionRange(length, length);
    }, 0);
  };



  /**
   * Insert text at cursor position in prompt input
   */
  const insertTextAtCursor = (insertText: string) => {
    const input = promptInputRef.current;
    if (!input) {
      setCustomPrompt((prev) => prev + insertText);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentText = customPrompt;

    // Insert text at cursor position
    const newText =
      currentText.substring(0, start) +
      insertText +
      currentText.substring(end);
    setCustomPrompt(newText);

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
        console.error('[RewritePanel] Speech recognition error:', event.error);
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
        console.error('[RewritePanel] Failed to start recording:', err);
        setError('Failed to start recording. Please try again.');
      }

      speechRecognitionRef.current = recognition;
    }
  };

  /**
   * Handles rewrite button click
   * Validates input and triggers rewrite operation
   */
  const handleRewrite = async () => {
    const currentVersion = versions[currentVersionIndex];
    
    // Validate that we have text and either a preset or custom prompt
    if (!currentVersion || !currentVersion.text.trim()) {
      setError('Please enter text to rewrite');
      return;
    }

    if (!customPrompt.trim()) {
      setError('Please enter rewrite instructions');
      return;
    }

    // Clear previous error and mock provider flag
    setError(null);
    setIsMockProvider(false);
    setIsProcessing(true);

    try {
      // Check AI availability before attempting operation
      const availability = await AIService.checkAvailability();
      const isUsingMock = availability.rewriterAPI === 'unavailable' && availability.promptAPI === 'unavailable';
      
      if (isUsingMock) {
        setIsMockProvider(true);
      }

      // Prepare pinned notes context
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);

      // Call AI service with timeout
      const rewritePromise = AIService.rewrite(currentVersion.text, {
        customPrompt: customPrompt.trim(),
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Add 60 second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out after 60 seconds')), 60000)
      );

      const rewrittenText = await Promise.race([rewritePromise, timeoutPromise]);

      console.log('[RewritePanel] Rewrite completed successfully');

      // Save to history
      let historyItemId: string | undefined;
      try {
        const historyItem = await StorageService.saveHistoryItem({
          type: 'rewrite',
          originalText: currentVersion.text,
          resultText: rewrittenText,
          metadata: {
            preset: customPrompt,
          },
        });
        // Update app state with new history item
        actions.addHistoryItem(historyItem);
        historyItemId = historyItem.id;
      } catch (historyError) {
        console.error('[RewritePanel] Failed to save to history:', historyError);
      }

      // Create new version and add to carousel
      const newVersion: Version = {
        id: `rewrite-${Date.now()}`,
        text: rewrittenText,
        label: `Version ${versions.length}`,
        title: customPrompt.slice(0, 50) + (customPrompt.length > 50 ? '...' : ''),
        isOriginal: false,
        isLiked: false,
        timestamp: Date.now(),
        historyId: historyItemId,
      };

      setVersions(prev => [...prev, newVersion]);
      setCurrentVersionIndex(versions.length); // Navigate to new version
    } catch (err) {
      // Handle specific error types with user-friendly messages
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        
        // User activation required error
        if (message.includes('user activation') || message.includes('click the button again')) {
          errorMessage = 'Please click the button again to continue.';
        }
        // AI unavailable error
        else if (message.includes('not available') || message.includes('chrome 128') || message.includes('gemini nano')) {
          errorMessage = 'AI features require Chrome 128 or later with Gemini Nano enabled.';
        }
        // Timeout error
        else if (message.includes('timed out') || message.includes('timeout')) {
          errorMessage = 'Operation timed out after 60 seconds. Try with shorter text or check your connection.';
        }
        // Generic error with original message
        else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('[RewritePanel] Rewrite failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles retry button click
   * Clears error and retries the rewrite operation
   */
  const handleRetry = () => {
    setError(null);
    setIsMockProvider(false);
    handleRewrite();
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
    setVersions(prev => prev.filter(v => v.id !== id));
  };

  /**
   * Handles version like toggle
   */
  const handleToggleLike = async (id: string) => {
    // Find the version to get its history ID
    const version = versions.find((v) => v.id === id);
    console.log('[RewritePanel] Toggle like for version:', id, 'historyId:', version?.historyId);
    
    // Update version state
    setVersions(prev => prev.map(v => 
      v.id === id ? { ...v, isLiked: !v.isLiked } : v
    ));
    
    // Update history if this version has a history ID
    if (version?.historyId) {
      try {
        console.log('[RewritePanel] Updating history item:', version.historyId);
        const updatedHistoryItem = await StorageService.toggleHistoryLiked(version.historyId);
        console.log('[RewritePanel] History item updated successfully');
        
        // Update app state history to reflect the change
        if (updatedHistoryItem) {
          actions.setHistory(
            state.history.map((item) =>
              item.id === version.historyId ? updatedHistoryItem : item
            )
          );
        }
      } catch (error) {
        console.error('[RewritePanel] Failed to update history liked status:', error);
      }
    } else {
      console.warn('[RewritePanel] No historyId found for version:', id);
    }
  };

  /**
   * Handles version edit
   */
  const handleEdit = (id: string, newText: string) => {
    setVersions(prev => prev.map(v => 
      v.id === id ? { ...v, text: newText } : v
    ));
  };

  /**
   * Handles title edit
   */
  const handleEditTitle = (id: string, newTitle: string) => {
    setVersions(prev => prev.map(v => 
      v.id === id ? { ...v, title: newTitle } : v
    ));
  };

  /**
   * Handles clear all - resets to empty original version
   */
  const handleClearAll = () => {
    // Reset the ref so the same text can be loaded again from minibar
    lastInitialTextRef.current = '';
    setVersions([{
      id: `original-${Date.now()}`,
      text: '',
      label: 'Original',
      isOriginal: true,
      isLiked: false,
      timestamp: Date.now(),
    }]);
    setCurrentVersionIndex(0);
  };

  /**
   * Handles copy to clipboard from carousel
   */
  const handleCopy = (id: string) => {
    console.log('[RewritePanel] Text copied to clipboard for version:', id);
  };

  /**
   * Handles text change from carousel (for counter display)
   */
  const handleTextChange = (words: number, chars: number) => {
    setWordCount(words);
    setCharCount(chars);
  };



  return (
    <div className="flint-section flex flex-col h-full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="flint-section-header" style={{ marginBottom: 0 }}>Rewrite text</h2>
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

      {/* Version carousel - replaces the original text field */}
      <div className="flex-1 flex flex-col min-h-0" style={{ marginBottom: '16px' }}>
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
          placeholder="Paste or type text to rewrite..."
          alwaysShowActions={true}
        />
      </div>

      {/* Prompt input card with inline buttons */}
      <div
        style={{
          position: 'relative',
          marginBottom: '16px',
        }}
      >
        {/* Preset dropdown button - positioned on left */}
        <button
          onClick={() => setShowPresetMenu(!showPresetMenu)}
          disabled={isProcessing}
          aria-label="Select preset"
          title="Select preset"
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: showPresetMenu ? 'var(--surface-2)' : 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.15s ease',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            if (!showPresetMenu) {
              e.currentTarget.style.background = 'var(--surface-2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showPresetMenu) {
              e.currentTarget.style.background = 'transparent';
            }
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
            style={{
              transform: showPresetMenu ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Preset menu dropdown */}
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
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: selectedPreset === preset ? 'var(--surface-2)' : 'transparent',
                  color: 'var(--text)',
                  fontSize: 'var(--fs-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (selectedPreset !== preset) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        <input
          ref={promptInputRef}
          type="text"
          className="flint-input"
          placeholder="Choose a preset or describe how to rewrite..."
          value={customPrompt}
          onChange={(e) => handleCustomPromptChange(e.target.value)}

          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
              e.preventDefault();
              handleRewrite();
            }
          }}
          disabled={isProcessing}
          aria-label="Rewrite instructions"
          style={{
            width: '100%',
            height: '48px',
            padding: '0 100px 0 48px',
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
          {/* Voice button */}
          <button
            className={`flint-btn ${isRecording ? 'recording' : 'ghost'} rewrite-voice-btn`}
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

          {/* Rewrite button */}
          <button
            className="flint-btn primary"
            onClick={handleRewrite}
            disabled={isProcessing}
            aria-label="Rewrite"
            title="Rewrite"
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
            )}
          </button>
        </div>
      </div>

      {/* Error message with retry option */}
      {error && (
        <div 
          style={{ 
            marginTop: '16px',
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
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
            aria-label="Retry rewrite operation"
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

      {/* Mock provider notice */}
      {isMockProvider && !error && (
        <div 
          style={{ 
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            fontSize: 'var(--fs-sm)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
          role="status"
          aria-live="polite"
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
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Using Mock Provider</div>
            <div style={{ opacity: 0.9 }}>
              AI features require Chrome 128 or later with Gemini Nano enabled. 
              The result shown is a demonstration using a mock provider.
            </div>
          </div>
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
          {pinnedNotes.length} pinned {pinnedNotes.length === 1 ? 'note' : 'notes'} will be included
        </div>
      )}
    </div>
  );
}

// Add spin animation for loading spinner and voice button styles
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
  
  .rewrite-voice-btn:not(.recording) {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
  
  .rewrite-voice-btn:not(.recording):hover,
  .rewrite-voice-btn:not(.recording):focus-visible {
    border: 1px solid var(--border) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    background: var(--surface-2) !important;
  }
`;
document.head.appendChild(style);
