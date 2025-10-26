/**
 * MiniBar component props
 */
export interface MiniBarProps {
  /**
   * Position for the mini bar
   */
  position?: { x: number; y: number };
  
  /**
   * Callback when record button is clicked
   */
  onRecord?: () => void;
  
  /**
   * Callback when summarize button is clicked
   */
  onSummarize?: () => void;
  
  /**
   * Callback when rewrite button is clicked
   */
  onRewrite?: () => void;
  
  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;
}

/**
 * MiniBar component - floating toolbar near text selection
 * Provides quick access to voice recording, summarization, and rewriting features
 */
export function MiniBar({
  position,
  onRecord,
  onSummarize,
  onRewrite,
  onClose,
}: MiniBarProps) {
  const style = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : undefined;

  return (
    <div className="flint-minibar" style={style}>
      {/* Record button with microphone icon */}
      <button
        className="flint-icon-btn primary"
        onClick={onRecord}
        title="Record voice"
        aria-label="Record voice"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v4" />
          <path d="M8 23h8" />
        </svg>
      </button>

      {/* Summarize button with list icon */}
      <button
        className="flint-icon-btn primary"
        onClick={onSummarize}
        title="Summarize"
        aria-label="Summarize selection"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      {/* Rewrite button with edit icon */}
      <button
        className="flint-icon-btn primary"
        onClick={onRewrite}
        title="Rewrite"
        aria-label="Rewrite selection"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Close button with X icon */}
      <button
        className="flint-icon-btn ghost"
        onClick={onClose}
        title="Close"
        aria-label="Close mini bar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
