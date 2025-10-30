/**
 * LoadingSpinner component
 * Displays a spinning loader during AI operations and other async tasks
 */
export interface LoadingSpinnerProps {
  /**
   * Size of the spinner in pixels
   * @default 24
   */
  size?: number;

  /**
   * Optional message to display below the spinner
   */
  message?: string;

  /**
   * Whether to show the spinner inline or as a full overlay
   * @default 'inline'
   */
  variant?: 'inline' | 'overlay';
}

/**
 * LoadingSpinner component for visual feedback during async operations
 */
export function LoadingSpinner({ size = 24, message, variant = 'inline' }: LoadingSpinnerProps) {
  const spinner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: message ? '12px' : '0',
      }}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'spin 1s linear infinite',
          color: 'var(--accent)',
        }}
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {message && (
        <span
          style={{
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {message}
        </span>
      )}
    </div>
  );

  if (variant === 'overlay') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(12, 14, 19, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Ensure spin animation is defined
if (typeof document !== 'undefined') {
  const styleId = 'loading-spinner-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
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
  }
}
