import logo from '../assets/FLINT_LOGO.svg';

/**
 * Toolbar component props
 */
export interface ToolbarProps {
  /**
   * Callback when proofread button is clicked
   */
  onProofread?: () => void;
  
  /**
   * Whether proofreading is in progress
   */
  isProofreading?: boolean;
}

/**
 * Toolbar component with logo, title, and action buttons
 */
export function Toolbar({ onProofread, isProofreading = false }: ToolbarProps) {
  return (
    <div className="flint-toolbar">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Flint" style={{ width: '24px', height: '24px' }} />
        <span className="text-lg font-semibold">Flint</span>
      </div>
      
      {onProofread && (
        <button
          className="flint-btn ghost"
          onClick={onProofread}
          disabled={isProofreading}
          aria-label="Check spelling and grammar"
          title="Check spelling and grammar"
          style={{
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
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span style={{ fontSize: 'var(--fs-sm)' }}>
            {isProofreading ? 'Checking...' : 'Proofread'}
          </span>
        </button>
      )}
    </div>
  );
}
