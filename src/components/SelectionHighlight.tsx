/**
 * SelectionHighlight component props
 */
export interface SelectionHighlightProps {
  /** Whether to show the highlight */
  show: boolean;
  /** Text that is selected */
  selectedText?: string;
}

/**
 * SelectionHighlight component
 * Shows a visual indicator that text is selected and will be used by the tool
 */
export function SelectionHighlight({ show, selectedText }: SelectionHighlightProps) {
  if (!show || !selectedText) return null;

  const wordCount = selectedText.trim().split(/\s+/).length;

  return (
    <div
      className="selection-highlight-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: 'color-mix(in oklab, var(--primary) 15%, transparent)',
        border: '1px solid var(--primary)',
        color: 'var(--primary)',
        fontSize: '12px',
        fontWeight: 500,
        animation: 'fade-in 0.2s ease-out',
        userSelect: 'none',
      }}
      role="status"
      aria-label={`${wordCount} ${wordCount === 1 ? 'word' : 'words'} selected`}
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
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <span>
        {wordCount} {wordCount === 1 ? 'word' : 'words'} selected
      </span>
    </div>
  );
}

// Add fade-in animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}
