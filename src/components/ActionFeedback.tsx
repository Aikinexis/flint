/**
 * ActionFeedback component - shows visual feedback for AI operations
 */

export interface ActionFeedbackProps {
  show: boolean;
  action: 'generating' | 'rewriting' | 'summarizing' | 'generated' | 'rewritten' | 'summarized';
  position?: { top: number; left: number } | null;
}

export function ActionFeedback({ show, action, position }: ActionFeedbackProps) {
  if (!show) return null;

  const isProcessing = action === 'generating' || action === 'rewriting' || action === 'summarizing';
  const isComplete = action === 'generated' || action === 'rewritten' || action === 'summarized';

  const getIcon = () => {
    if (isProcessing) {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      );
    }
    
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  };

  const getMessage = () => {
    switch (action) {
      case 'generating':
        return 'Generating...';
      case 'rewriting':
        return 'Rewriting...';
      case 'summarizing':
        return 'Summarizing...';
      case 'generated':
        return 'Text generated';
      case 'rewritten':
        return 'Text rewritten';
      case 'summarized':
        return 'Text summarized';
    }
  };

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: isComplete ? 'var(--accent)' : 'var(--surface-2)',
    border: `1px solid ${isComplete ? 'var(--accent)' : 'var(--border)'}`,
    color: isComplete ? 'white' : 'var(--text)',
    fontSize: '13px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    animation: isComplete ? 'slideInScale 0.3s ease-out' : 'fadeIn 0.2s ease-out',
    userSelect: 'none',
  };

  if (position) {
    style.position = 'absolute';
    style.top = `${position.top}px`;
    style.left = `${position.left}px`;
    style.zIndex = 100;
    style.pointerEvents = 'none';
  }

  return (
    <div style={style} role="status" aria-live="polite">
      {getIcon()}
      <span>{getMessage()}</span>
    </div>
  );
}

// Add animations
if (typeof document !== 'undefined' && !document.getElementById('action-feedback-styles')) {
  const style = document.createElement('style');
  style.id = 'action-feedback-styles';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}
