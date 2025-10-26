import { useState } from 'react';

/**
 * CompareView component props
 */
export interface CompareViewProps {
  /**
   * Original text before rewriting
   */
  originalText: string;

  /**
   * Rewritten text from AI operation
   */
  rewrittenText: string;

  /**
   * Callback when user accepts the rewritten text
   */
  onAccept: () => void;

  /**
   * Callback when user rejects the rewritten text
   */
  onReject: () => void;
}

/**
 * CompareView component for side-by-side comparison of original and rewritten text
 * Displays two columns with original text on left and rewritten text on right
 * Provides accept, reject, and copy actions
 */
export function CompareView({
  originalText,
  rewrittenText,
  onAccept,
  onReject,
}: CompareViewProps) {
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  /**
   * Handles copy to clipboard button click
   * Copies rewritten text to clipboard and shows success feedback for 2 seconds
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rewrittenText);
      setShowCopySuccess(true);

      // Hide checkmark after 2 seconds
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 2000);

      console.log('[CompareView] Rewritten text copied to clipboard');
    } catch (err) {
      console.error('[CompareView] Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">Compare versions</h2>

      {/* Two-column layout for side-by-side comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          flex: 1,
          minHeight: 0,
          marginBottom: '16px',
        }}
      >
        {/* Original text column */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label
            style={{
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Original
          </label>
          <div
            className="flint-card"
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              fontSize: 'var(--fs-md)',
              color: 'var(--text)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            role="region"
            aria-label="Original text"
          >
            {originalText}
          </div>
        </div>

        {/* Rewritten text column */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label
            style={{
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Rewritten
          </label>
          <div
            className="flint-card"
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              fontSize: 'var(--fs-md)',
              color: 'var(--text)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            role="region"
            aria-label="Rewritten text"
          >
            {rewrittenText}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flint-button-group">
        <button
          className="flint-btn primary"
          onClick={onAccept}
          aria-label="Accept rewritten text and replace original"
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, oklch(0.54 0.11 152) 0%, oklch(0.44 0.13 152) 100%)',
            borderColor: 'oklch(0.34 0.09 152)',
            color: 'var(--text)',
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Accept
        </button>

        <button
          className="flint-btn ghost"
          onClick={handleCopy}
          disabled={showCopySuccess}
          aria-label={showCopySuccess ? 'Copied to clipboard' : 'Copy rewritten text to clipboard'}
        >
          {showCopySuccess ? (
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>

        <button
          className="flint-btn ghost"
          onClick={onReject}
          aria-label="Reject rewritten text and return to rewrite panel"
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
          Reject
        </button>
      </div>
    </div>
  );
}
