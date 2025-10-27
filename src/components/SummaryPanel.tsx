import { useState, useEffect, useRef } from 'react';
import type { PinnedNote } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import { VersionCarousel, type Version } from './VersionCarousel';
import { useAppState } from '../state';

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
type ReadingLevel = 'simple' | 'moderate' | 'detailed' | 'complex';

/**
 * SummaryPanel component for text summarization
 * Provides mode selection, reading level options, and summarize functionality
 */
export function SummaryPanel({
  initialText = '',
  pinnedNotes = [],
  onSummaryComplete,
}: SummaryPanelProps) {
  // Get app state and actions for updating history
  const { state, actions } = useAppState();
  
  // Ref to track last processed initialText
  const lastInitialTextRef = useRef<string>(initialText);
  
  // Component state
  const [mode, setMode] = useState<SummaryMode>('bullets');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('moderate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockProvider, setIsMockProvider] = useState(false);
  
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
        console.log('[SummaryPanel] History cleared, resetting versions');
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
    const currentVersion = versions[currentVersionIndex];
    
    // Validate that we have text
    if (!currentVersion || !currentVersion.text.trim()) {
      setError('Please enter text to summarize');
      return;
    }

    // Clear previous error
    setError(null);
    setIsMockProvider(false);
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
      const summarizePromise = AIService.summarize(currentVersion.text, {
        mode,
        readingLevel,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Add 60 second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out after 60 seconds')), 60000)
      );

      const summaryResult = await Promise.race([summarizePromise, timeoutPromise]);

      console.log('[SummaryPanel] Summarize completed successfully');

      // Save to history
      let historyItemId: string | undefined;
      try {
        const historyItem = await StorageService.saveHistoryItem({
          type: 'summarize',
          originalText: currentVersion.text,
          resultText: summaryResult,
          metadata: {
            mode,
          },
        });
        // Update app state with new history item
        actions.addHistoryItem(historyItem);
        historyItemId = historyItem.id;
      } catch (historyError) {
        console.error('[SummaryPanel] Failed to save to history:', historyError);
      }

      // Create new version and add to carousel
      const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
      const newVersion: Version = {
        id: `summary-${Date.now()}`,
        text: summaryResult,
        label: `Summary ${versions.length}`,
        title: `${modeLabel} - ${readingLevel}`,
        isOriginal: false,
        isLiked: false,
        timestamp: Date.now(),
        historyId: historyItemId,
      };

      setVersions(prev => [...prev, newVersion]);
      setCurrentVersionIndex(versions.length); // Navigate to new version

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
          errorMessage = 'Operation timed out after 60 seconds. Try with shorter text or check your connection.';
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
    console.log('[SummaryPanel] Toggle like for version:', id, 'historyId:', version?.historyId);
    
    // Update version state
    setVersions(prev => prev.map(v => 
      v.id === id ? { ...v, isLiked: !v.isLiked } : v
    ));
    
    // Update history if this version has a history ID
    if (version?.historyId) {
      try {
        console.log('[SummaryPanel] Updating history item:', version.historyId);
        const updatedHistoryItem = await StorageService.toggleHistoryLiked(version.historyId);
        console.log('[SummaryPanel] History item updated successfully');
        
        // Update app state history to reflect the change
        if (updatedHistoryItem) {
          actions.setHistory(
            state.history.map((item) =>
              item.id === version.historyId ? updatedHistoryItem : item
            )
          );
        }
      } catch (error) {
        console.error('[SummaryPanel] Failed to update history liked status:', error);
      }
    } else {
      console.warn('[SummaryPanel] No historyId found for version:', id);
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
   * Handles clear button click
   * Resets all state to initial values
   */
  const handleClear = () => {
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
    setError(null);
    setIsMockProvider(false);
  };

  /**
   * Handles copy button click from carousel
   */
  const handleCopy = (id: string) => {
    console.log('[SummaryPanel] Text copied to clipboard:', id);
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
        <h2 className="flint-section-header" style={{ marginBottom: 0 }}>Summarize text</h2>
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
          onClearAll={handleClear}
          onEdit={handleEdit}
          onEditTitle={handleEditTitle}
          onTextChange={handleTextChange}
          isLoading={isProcessing}
          placeholder="Paste or type text to summarize..."
          alwaysShowActions={true}
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
          <option value="simple">Simple</option>
          <option value="moderate">Moderate</option>
          <option value="detailed">Detailed</option>
          <option value="complex">Complex</option>
        </select>
      </div>

      {/* Action button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          className="flint-btn primary"
          onClick={handleSummarize}
          disabled={isProcessing}
          aria-label="Summarize text"
          style={{ width: '100%' }}
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
