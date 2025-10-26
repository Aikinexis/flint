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
   * Rewritten text from AI
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
 * Displays original text on left and rewritten text on right with accept/reject actions
 */
export function CompareView({
  originalText,
  rewrittenText,
  onAccept,
  onReject,
}: CompareViewProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  /**
   * Handles copy to clipboard button click
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rewrittenText);
      setCopySuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      
      console.log('[CompareView] Text copied to clipboard');
    } catch (error) {
      console.error('[CompareView] Failed to copy text:', error);
    }
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">Compare versions</h2>

      {/* Two-column layout for comparison */}
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
            className="text-text-muted text-sm" 
            style={{ marginBottom: '8px', fontWeight: 600 }}
          >
            Original
          </label>
          <div 
            className="flint-card"
            style={{
              flex: 1,
              padding: '16px',
              overflow: 'auto',
              fontSize: 'var(--fs-md)',
              lineHeight: '1.6',
              color: 'var(--text)',
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
            className="text-text-muted text-sm" 
            style={{ marginBottom: '8px', fontWeight: 600 }}
          >
            Rewritten
          </label>
          <div 
            className="flint-card"
            style={{
              flex: 1,
              padding: '16px',
              overflow: 'auto',
              fontSize: 'var(--fs-md)',
              lineHeight: '1.6',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.05), rgba(249, 115, 22, 0)), var(--surface)',
            }}
            role="region"
            aria-label="Rewritten text"
          >
            {rewrittenText}
          </div>
        </div>
      </div>

      {/* Accept Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          className="flint-btn primary"
          onClick={onAccept}
          aria-label="Accept rewritten text and replace original"
          style={{ 
            width: '100%',
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
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
      </div>

      {/* Copy and Reject Buttons */}
      <div className="flint-button-group">
        <button
          className="flint-btn secondary"
          onClick={handleCopy}
          aria-label="Copy rewritten text to clipboard"
          disabled={copySuccess}
          style={{ flex: 1 }}
        >
          {copySuccess ? (
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
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
