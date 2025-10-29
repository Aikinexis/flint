/**
 * CursorIndicator component props
 */
export interface CursorIndicatorProps {
  /** Whether to show the indicator */
  show: boolean;
  /** Direction of text generation: 'forward', 'backward', or 'bidirectional' */
  direction?: 'forward' | 'backward' | 'bidirectional';
}

/**
 * CursorIndicator component
 * Shows an animated arrow at the cursor position to indicate where generated text will appear
 */
export function CursorIndicator({ show, direction = 'forward' }: CursorIndicatorProps) {
  if (!show) return null;

  return (
    <div
      className="cursor-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '6px',
        background: 'var(--accent)',
        color: 'white',
        fontSize: '12px',
        fontWeight: 500,
        animation: 'pulse 1.5s ease-in-out infinite',
        userSelect: 'none',
      }}
      role="status"
      aria-label={`Text will be generated ${direction === 'bidirectional' ? 'around cursor' : direction === 'backward' ? 'before cursor' : 'after cursor'}`}
    >
      {direction === 'bidirectional' ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-left 1s ease-in-out infinite' }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>|</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-right 1s ease-in-out infinite' }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </>
      ) : direction === 'backward' ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-left 1s ease-in-out infinite' }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>|</span>
        </>
      ) : (
        <>
          <span>|</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-right 1s ease-in-out infinite' }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </>
      )}
    </div>
  );
}

// Add animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
    
    @keyframes slide-right {
      0%, 100% {
        transform: translateX(0);
      }
      50% {
        transform: translateX(3px);
      }
    }
    
    @keyframes slide-left {
      0%, 100% {
        transform: translateX(0);
      }
      50% {
        transform: translateX(-3px);
      }
    }
  `;
  document.head.appendChild(style);
}
