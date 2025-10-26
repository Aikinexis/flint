import { useState, useEffect } from 'react';
import type { HistoryItem } from '../services/storage';
import { StorageService } from '../services/storage';

/**
 * History component props
 */
export interface HistoryProps {
  /**
   * Optional history items (will load from storage if not provided)
   */
  history?: HistoryItem[];

  /**
   * Callback when history changes (optional)
   */
  onHistoryChange?: (history: HistoryItem[]) => void;
}

/**
 * History component for viewing past operations
 * Displays list of voice, summarize, and rewrite operations with search
 */
export function History({
  history: propHistory,
  onHistoryChange: _onHistoryChange,
}: HistoryProps) {
  // Component state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load history from storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const items = await StorageService.getHistory();
        setHistory(items);
      } catch (error) {
        console.error('[History] Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!propHistory) {
      loadHistory();
    } else {
      setHistory(propHistory);
      setIsLoading(false);
    }
  }, [propHistory]);

  /**
   * Filters history items based on search query
   */
  const filteredHistory = searchQuery.trim()
    ? history.filter(
        (item) =>
          item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.resultText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

  /**
   * Formats timestamp to readable date string
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Gets icon for operation type
   */
  const getOperationIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'voice':
        return (
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
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        );
      case 'summarize':
        return (
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
        );
      case 'rewrite':
        return (
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
        );
    }
  };

  /**
   * Gets label for operation type
   */
  const getOperationLabel = (type: HistoryItem['type']): string => {
    switch (type) {
      case 'voice':
        return 'Voice';
      case 'summarize':
        return 'Summarize';
      case 'rewrite':
        return 'Rewrite';
    }
  };

  /**
   * Truncates text to specified length
   */
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  /**
   * Handles clicking on a history item
   */
  const handleItemClick = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  /**
   * Closes the detail modal
   */
  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  /**
   * Copies text to clipboard
   */
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`[History] ${label} copied to clipboard`);
    } catch (error) {
      console.error('[History] Failed to copy to clipboard:', error);
    }
  };

  /**
   * Shows the clear confirmation dialog
   */
  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  /**
   * Cancels the clear operation
   */
  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  /**
   * Confirms and executes the clear operation
   */
  const handleConfirmClear = async () => {
    try {
      setIsClearing(true);
      await StorageService.clearHistory();
      setHistory([]);
      setShowClearConfirm(false);
      console.log('[History] All history cleared');
    } catch (error) {
      console.error('[History] Failed to clear history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">History</h2>

      {/* Search field and clear button */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="flint-input"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search history"
            style={{
              width: '100%',
              paddingLeft: '40px',
            }}
          />
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
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <button
          className="flint-btn ghost"
          onClick={handleClearClick}
          disabled={history.length === 0 || isLoading}
          aria-label="Clear all history"
          title="Clear all history"
          style={{
            minWidth: 'auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
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
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Clear
        </button>
      </div>

      {/* History list - scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ margin: '0 auto 16px', opacity: 0.5 }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 500 }}>
              {searchQuery ? 'No matching history items' : 'No history yet'}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: 'var(--fs-sm)' }}>
              {searchQuery
                ? 'Try a different search term'
                : 'Your voice, summarize, and rewrite operations will appear here'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                className="flint-card"
                onClick={() => handleItemClick(item)}
                aria-label={`View ${getOperationLabel(item.type)} operation from ${formatTimestamp(item.timestamp)}`}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  border: '1px solid var(--stroke)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header with type and timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--primary)',
                      }}
                    >
                      {getOperationIcon(item.type)}
                    </div>
                    <span
                      style={{
                        fontSize: 'var(--fs-sm)',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {getOperationLabel(item.type)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--fs-xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>

                {/* Preview text */}
                <p
                  style={{
                    fontSize: 'var(--fs-sm)',
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
                  {truncateText(item.originalText, 150)}
                </p>

                {/* Metadata badges */}
                {item.metadata && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      marginTop: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {item.metadata.mode && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {item.metadata.mode}
                      </span>
                    )}
                    {item.metadata.preset && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {item.metadata.preset}
                      </span>
                    )}
                    {item.metadata.confidence !== undefined && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {Math.round(item.metadata.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
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
          onClick={handleCancelClear}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-confirm-title"
        >
          <div
            className="flint-card"
            style={{
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3
                id="clear-confirm-title"
                style={{
                  fontSize: 'var(--fs-lg)',
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: '0 0 8px 0',
                  textAlign: 'center',
                }}
              >
                Clear All History?
              </h3>
              <p
                style={{
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                This will permanently delete all {history.length} history{' '}
                {history.length === 1 ? 'item' : 'items'}. This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="flint-btn ghost"
                onClick={handleCancelClear}
                disabled={isClearing}
                style={{ flex: 1, height: '40px' }}
              >
                Cancel
              </button>
              <button
                className="flint-btn"
                onClick={handleConfirmClear}
                disabled={isClearing}
                style={{
                  flex: 1,
                  height: '40px',
                  background: '#ef4444',
                  color: 'white',
                }}
              >
                {isClearing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    Clearing...
                  </span>
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
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
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-detail-title"
        >
          <div
            className="flint-card"
            style={{
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--stroke)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--surface)',
                    color: 'var(--primary)',
                  }}
                >
                  {getOperationIcon(selectedItem.type)}
                </div>
                <div>
                  <h3
                    id="history-detail-title"
                    style={{
                      fontSize: 'var(--fs-lg)',
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: 0,
                    }}
                  >
                    {getOperationLabel(selectedItem.type)} Operation
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--fs-xs)',
                      color: 'var(--text-muted)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {new Date(selectedItem.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <button
                className="flint-btn ghost"
                onClick={handleCloseModal}
                aria-label="Close detail view"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  minWidth: 'auto',
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
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Metadata */}
            {selectedItem.metadata && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedItem.metadata.mode && (
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        border: '1px solid var(--stroke)',
                        fontWeight: 500,
                      }}
                    >
                      Mode: {selectedItem.metadata.mode}
                    </span>
                  )}
                  {selectedItem.metadata.preset && (
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        border: '1px solid var(--stroke)',
                        fontWeight: 500,
                      }}
                    >
                      Preset: {selectedItem.metadata.preset}
                    </span>
                  )}
                  {selectedItem.metadata.confidence !== undefined && (
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        border: '1px solid var(--stroke)',
                        fontWeight: 500,
                      }}
                    >
                      Confidence: {Math.round(selectedItem.metadata.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Original text */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Original
                </label>
                <button
                  className="flint-btn ghost"
                  onClick={() => handleCopy(selectedItem.originalText, 'Original text')}
                  aria-label="Copy original text"
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    fontSize: 'var(--fs-xs)',
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--stroke)',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text)',
                  lineHeight: '1.6',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedItem.originalText}
              </div>
            </div>

            {/* Result text */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Result
                </label>
                <button
                  className="flint-btn ghost"
                  onClick={() => handleCopy(selectedItem.resultText, 'Result text')}
                  aria-label="Copy result text"
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    fontSize: 'var(--fs-xs)',
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--stroke)',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text)',
                  lineHeight: '1.6',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedItem.resultText}
              </div>
            </div>

            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="flint-btn primary"
                onClick={handleCloseModal}
                style={{ height: '40px', padding: '0 24px' }}
              >
                Close
              </button>
            </div>
          </div>
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
if (!document.head.querySelector('style[data-history-animations]')) {
  style.setAttribute('data-history-animations', 'true');
  document.head.appendChild(style);
}
