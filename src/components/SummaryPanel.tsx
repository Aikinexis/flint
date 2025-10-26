import { useState, useEffect } from 'react';
import type { PinnedNote } from '../services/storage';
import { AIService } from '../services/ai';

/**
 * SummaryPanel component props
 */
export interface SummaryPanelProps {
  /**
   * Initial text to summarize (e.g., from selection)
   */
  initialText?: string;

  /**
   * Pinned notes to merge into AI context
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Callback when summary completes successfully
   */
  onSummaryComplete?: (summary: string) => void;
}

/**
 * Summary mode options
 */
type SummaryMode = 'bullets' | 'paragraph' | 'brief';

/**
 * Reading level options
 */
type ReadingLevel = 'elementary' | 'middle-school' | 'high-school' | 'college';

/**
 * SummaryPanel component for text summarization
 * Provides mode selection, reading level options, and summarize functionality
 */
export function SummaryPanel({
  initialText = '',
  pinnedNotes = [],
  onSummaryComplete,
}: SummaryPanelProps) {
  // Component state
  const [inputText, setInputText] = useState(initialText);
  const [mode, setMode] = useState<SummaryMode>('bullets');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('high-school');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockProvider, setIsMockProvider] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Load selected text from storage when component mounts
  useEffect(() => {
    chrome.storage.local.get('flint.selectedText').then((result) => {
      if (result['flint.selectedText']) {
        setInputText(result['flint.selectedText']);
        // Clear the stored text after loading
        chrome.storage.local.remove('flint.selectedText');
      }
    });
  }, []);

  /**
   * Handles mode selection change
   */
  const handleModeChange = (newMode: SummaryMode) => {
    setMode(newMode);
  };

  /**
   * Handles reading level dropdown change
   */
  const handleReadingLevelChange = (value: string) => {
    setReadingLevel(value as ReadingLevel);
  };

  /**
   * Handles summarize button click
   * Validates input and triggers summarize operation
   */
  const handleSummarize = async () => {
    // Validate that we have text
    if (!inputText.trim()) {
      setError('Please enter text to summarize');
      return;
    }

    // Clear previous error and results
    setError(null);
    setIsMockProvider(false);
    setSummary('');
    setIsProcessing(true);

    try {
      // Check AI availability before attempting operation
      const availability = await AIService.checkAvailability();
      const isUsingMock = availability.summarizerAPI === 'unavailable';

      if (isUsingMock) {
        setIsMockProvider(true);
      }

      // Prepare pinned notes context
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);

      // Call AI service with timeout
      const summarizePromise = AIService.summarize(inputText, {
        mode,
        readingLevel,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Add 5 second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out after 5 seconds')), 5000)
      );

      const summaryResult = await Promise.race([summarizePromise, timeoutPromise]);

      console.log('[SummaryPanel] Summarize completed successfully');

      // Store summary in state
      setSummary(summaryResult);

      // Call completion callback if provided
      if (onSummaryComplete) {
        onSummaryComplete(summaryResult);
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
      console.error('[SummaryPanel] Summarize failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles retry button click
   * Clears error and retries the summarize operation
   */
  const handleRetry = () => {
    setError(null);
    setIsMockProvider(false);
    handleSummarize();
  };

  /**
   * Handles clear button click
   * Resets all state to initial values
   */
  const handleClear = () => {
    setInputText('');
    setSummary('');
    setError(null);
    setIsMockProvider(false);
  };

  /**
   * Handles copy to clipboard button click
   * Copies summary to clipboard and shows success feedback for 2 seconds
   */
  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setShowCopySuccess(true);

      // Hide checkmark after 2 seconds
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 2000);

      console.log('[SummaryPanel] Summary copied to clipboard');
    } catch (err) {
      console.error('[SummaryPanel] Failed to copy to clipboard:', err);
      
      // Show error message
      setError('Failed to copy to clipboard. Please try again or copy manually.');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  /**
   * Formats summary text based on selected mode
   * Applies appropriate styling for bullets, paragraph, or outline
   */
  const formatSummary = (text: string, summaryMode: SummaryMode) => {
    if (!text) return null;

    // For bullets mode, ensure proper list formatting
    if (summaryMode === 'bullets') {
      const lines = text.split('\n').filter(line => line.trim());
      return (
        <ul style={{ 
          margin: 0, 
          paddingLeft: '20px',
          listStyleType: 'disc',
        }}>
          {lines.map((line, index) => {
            // Remove leading bullet characters if present
            const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
            return cleanLine ? (
              <li key={index} style={{ marginBottom: '8px' }}>
                {cleanLine}
              </li>
            ) : null;
          })}
        </ul>
      );
    }

    // For brief mode, display as simple text (headline style)
    if (summaryMode === 'brief') {
      return (
        <p style={{ 
          margin: 0,
          lineHeight: '1.6',
          fontSize: 'var(--fs-lg)',
          fontWeight: 500,
        }}>
          {text.trim()}
        </p>
      );
    }

    // For paragraph mode, preserve line breaks and paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return (
      <div style={{ margin: 0 }}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} style={{ 
            margin: index > 0 ? '12px 0 0 0' : 0,
            lineHeight: '1.6',
          }}>
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">Summarize text</h2>

      {/* Input textarea - scrollable */}
      <div className="flex-1 flex flex-col min-h-0" style={{ marginBottom: '16px' }}>
        <textarea
          className="flint-textarea w-full h-full resize-none"
          placeholder="Paste or type text to summarize..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
          aria-label="Text to summarize"
        />
      </div>

      {/* Mode selector - radio buttons */}
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
          Summary format
        </label>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
          role="radiogroup"
          aria-label="Summary format"
        >
          {(['bullets', 'paragraph', 'brief'] as const).map((modeOption) => (
            <button
              key={modeOption}
              className={`flint-btn ${mode === modeOption ? 'primary' : 'ghost'}`}
              onClick={() => handleModeChange(modeOption)}
              disabled={isProcessing}
              role="radio"
              aria-checked={mode === modeOption}
              aria-label={`${modeOption} format`}
              style={{ flex: 1 }}
            >
              {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reading level dropdown */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="reading-level-select"
          style={{
            display: 'block',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          Reading level
        </label>
        <select
          id="reading-level-select"
          className="flint-input"
          value={readingLevel}
          onChange={(e) => handleReadingLevelChange(e.target.value)}
          disabled={isProcessing}
          aria-label="Select reading level"
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
          <option value="elementary">Elementary</option>
          <option value="middle-school">Middle School</option>
          <option value="high-school">High School</option>
          <option value="college">College</option>
        </select>
      </div>

      {/* Action buttons */}
      <div className="flint-button-group" style={{ marginBottom: '16px' }}>
        <button
          className="flint-btn primary"
          onClick={handleSummarize}
          disabled={isProcessing}
          aria-label="Summarize text"
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
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              Summarize
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
            aria-label="Retry summarize operation"
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

      {/* Summary result display with copy button */}
      {summary && (
        <div
          style={{
            marginTop: '16px',
          }}
          role="region"
          aria-label="Summary result"
        >
          {/* Result header with copy button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <label
              style={{
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              Summary
            </label>
            <button
              className="flint-btn ghost"
              onClick={handleCopy}
              disabled={showCopySuccess}
              aria-label={showCopySuccess ? 'Copied to clipboard' : 'Copy summary to clipboard'}
              style={{
                height: '32px',
                padding: '0 12px',
                fontSize: 'var(--fs-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {showCopySuccess ? (
                <>
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
                    style={{
                      color: '#10b981',
                    }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: '#10b981' }}>Copied!</span>
                </>
              ) : (
                <>
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Formatted summary result */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--stroke)',
              fontSize: 'var(--fs-md)',
              color: 'var(--text)',
              lineHeight: '1.6',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {formatSummary(summary, mode)}
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
