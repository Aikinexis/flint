

/**
 * MiniBar component - floating toolbar near text selection
 * Applies Gestalt similarity: all three main actions share size, shape, spacing
 */
export function MiniBar() {
  return (
    <div className="flint-minibar">
      {/* Action group - all three buttons share visual attributes */}
      <button
        className="flint-icon-btn primary"
        title="Record voice"
        aria-label="Record voice"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <circle cx="9" cy="9" r="7" />
        </svg>
      </button>

      <button
        className="flint-icon-btn primary"
        title="Summarize"
        aria-label="Summarize selection"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect x="3" y="4" width="12" height="2" rx="1" />
          <rect x="3" y="8" width="8" height="2" rx="1" />
          <rect x="3" y="12" width="10" height="2" rx="1" />
        </svg>
      </button>

      <button
        className="flint-icon-btn primary"
        title="Rewrite"
        aria-label="Rewrite selection"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
          <path d="M9 3L15 9L9 15M15 9H3" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
