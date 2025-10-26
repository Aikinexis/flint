import { useState, useEffect } from 'react';
import type { PinnedNote } from '../services/storage';
import { AIService } from '../services/ai';

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
   * Callback when rewrite completes successfully
   */
  onRewriteComplete?: (original: string, rewritten: string) => void;
}

/**
 * Preset options for rewriting
 */
type RewritePreset = 
  | 'clarify' 
  | 'simplify' 
  | 'concise' 
  | 'expand' 
  | 'friendly' 
  | 'formal' 
  | 'poetic' 
  | 'persuasive';

/**
 * RewritePanel component for text rewriting with presets and custom prompts
 * Provides preset buttons, custom instruction field, and rewrite functionality
 */
export function RewritePanel({ 
  initialText = '', 
  pinnedNotes = [],
  onRewriteComplete 
}: RewritePanelProps) {
  // Component state
  const [inputText, setInputText] = useState(initialText);
  const [selectedPreset, setSelectedPreset] = useState<RewritePreset | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockProvider, setIsMockProvider] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState<string[]>([initialText]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load selected text from storage when component mounts
  useEffect(() => {
    chrome.storage.local.get('flint.selectedText').then((result) => {
      if (result['flint.selectedText']) {
        const text = result['flint.selectedText'];
        setInputText(text);
        setHistory([text]);
        setHistoryIndex(0);
        // Clear the stored text after loading
        chrome.storage.local.remove('flint.selectedText');
      }
    });
  }, []);

  /**
   * Preset configurations
   */
  const presets: Array<{ id: RewritePreset; label: string }> = [
    { id: 'clarify', label: 'Clarify' },
    { id: 'simplify', label: 'Simplify' },
    { id: 'concise', label: 'Concise' },
    { id: 'expand', label: 'Expand' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'formal', label: 'Formal' },
    { id: 'poetic', label: 'Poetic' },
    { id: 'persuasive', label: 'Persuasive' },
  ];

  /**
   * Handles preset dropdown change
   */
  const handlePresetChange = (value: string) => {
    if (value === '') {
      setSelectedPreset(null);
    } else {
      setSelectedPreset(value as RewritePreset);
    }
  };

  /**
   * Handles custom prompt input change
   */
  const handleCustomPromptChange = (value: string) => {
    setCustomPrompt(value);
  };

  /**
   * Handles rewrite button click
   * Validates input and triggers rewrite operation
   */
  const handleRewrite = async () => {
    // Validate that we have text and either a preset or custom prompt
    if (!inputText.trim()) {
      setError('Please enter text to rewrite');
      return;
    }

    if (!selectedPreset && !customPrompt.trim()) {
      setError('Please select a style or enter custom instructions');
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
      const rewritePromise = AIService.rewrite(inputText, {
        preset: selectedPreset || undefined,
        customPrompt: customPrompt.trim() || undefined,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Add 5 second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out after 5 seconds')), 5000)
      );

      const rewrittenText = await Promise.race([rewritePromise, timeoutPromise]);

      console.log('[RewritePanel] Rewrite completed successfully');

      // Call completion callback to navigate to CompareView
      if (onRewriteComplete) {
        onRewriteComplete(inputText, rewrittenText);
      }
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
          errorMessage = 'Operation timed out after 5 seconds. Try with shorter text or check your connection.';
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
   * Handles text input change with history tracking
   */
  const handleTextChange = (newText: string) => {
    setInputText(newText);
    
    // Add to history if text is different
    if (newText !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  /**
   * Handles undo button click
   */
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const text = history[newIndex];
      if (text !== undefined) {
        setHistoryIndex(newIndex);
        setInputText(text);
      }
    }
  };

  /**
   * Handles redo button click
   */
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const text = history[newIndex];
      if (text !== undefined) {
        setHistoryIndex(newIndex);
        setInputText(text);
      }
    }
  };

  /**
   * Handles clear button click
   * Resets all state to initial values
   */
  const handleClear = () => {
    const emptyText = '';
    setInputText(emptyText);
    setSelectedPreset(null);
    setCustomPrompt('');
    // Reset history
    setHistory([emptyText]);
    setHistoryIndex(0);
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 className="flint-section-header" style={{ marginBottom: 0 }}>Rewrite text</h2>
        
        {/* Undo/Redo buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="flint-btn ghost"
            onClick={handleUndo}
            disabled={historyIndex === 0 || isProcessing}
            aria-label="Undo"
            title="Undo"
            style={{
              width: '32px',
              height: '32px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
          </button>
          <button
            className="flint-btn ghost"
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1 || isProcessing}
            aria-label="Redo"
            title="Redo"
            style={{
              width: '32px',
              height: '32px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Input textarea - scrollable */}
      <div className="flex-1 flex flex-col min-h-0" style={{ marginBottom: '16px' }}>
        <textarea
          className="flint-textarea w-full h-full resize-none"
          placeholder="Paste or type text to rewrite..."
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={isProcessing}
          aria-label="Text to rewrite"
        />
      </div>

      {/* Action buttons */}
      <div className="flint-button-group" style={{ marginBottom: '16px' }}>
        <button
          className="flint-btn primary"
          onClick={handleRewrite}
          disabled={isProcessing}
          aria-label="Rewrite text"
          style={{ flex: 1 }}
        >
          {isProcessing ? (
            <>
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
              Processing...
            </>
          ) : (
            <>
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
              Rewrite
            </>
          )}
        </button>
        <button
          className="flint-btn ghost"
          onClick={handleClear}
          disabled={isProcessing}
          aria-label="Clear all"
        >
          Clear
        </button>
      </div>

      {/* Preset dropdown */}
      <div style={{ marginBottom: '16px' }}>
        <select
          id="style-select"
          className="flint-input"
          value={selectedPreset || ''}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={isProcessing}
          aria-label="Select rewrite style"
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
          <option value="">Choose a style</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom instruction field */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          className="flint-input"
          placeholder="Custom Prompt"
          value={customPrompt}
          onChange={(e) => handleCustomPromptChange(e.target.value)}
          disabled={isProcessing}
          aria-label="Custom rewrite instructions"
          style={{
            width: '100%',
            height: '80px',
            padding: '12px 16px',
            resize: 'none',
            overflow: 'auto',
          }}
        />
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

// Add spin animation for loading spinner
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
`;
document.head.appendChild(style);
