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
        gap: '2px',
        color: 'var(--text-muted)',
        fontSize: '10px',
        userSelect: 'none',
        opacity: 0.7,
      }}
      role="status"
      aria-label={`Text will be generated ${direction === 'bidirectional' ? 'around cursor' : direction === 'backward' ? 'before cursor' : 'after cursor'}`}
    >
      {direction === 'bidirectional' ? (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-left 1s ease-in-out infinite' }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span style={{ fontSize: '8px', opacity: 0.5 }}>|</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'slide-left 1s ease-in-out infinite' }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span style={{ fontSize: '8px', opacity: 0.5 }}>|</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '8px', opacity: 0.5 }}>|</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
    @keyframes slide-right {
      0%, 100% {
        transform: translateX(0);
      }
      50% {
        transform: translateX(2px);
      }
    }
    
    @keyframes slide-left {
      0%, 100% {
        transform: translateX(0);
      }
      50% {
        transform: translateX(-2px);
      }
    }
  `;
  document.head.appendChild(style);
}
