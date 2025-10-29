/**
 * History Panel Component
 * 
 * Displays version snapshots for the current project in a collapsible sidebar panel.
 * Positioned between main content and sidebar with slide-in/out animation.
 */

import { Snapshot } from '../services/storage';
import { SnapshotItem } from './SnapshotItem';

export interface HistoryPanelProps {
  projectId: string;
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  onSnapshotSelect: (snapshotId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * History Panel component
 * Collapsible panel displaying version snapshots with dark background
 */
export function HistoryPanel({
  snapshots,
  activeSnapshotId,
  onSnapshotSelect,
  isOpen,
  onToggle,
}: HistoryPanelProps) {
  return (
    <>
      {/* Toggle button on sidebar edge */}
      <button
        className="history-panel-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Close history panel' : 'Open history panel'}
        aria-expanded={isOpen}
        title={isOpen ? 'Close history' : 'Open history'}
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
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* History panel container */}
      <div
        className={`history-panel ${isOpen ? 'open' : ''}`}
        role="region"
        aria-label="Version history"
      >
        <div className="history-panel-header">
          <h2 className="history-panel-title">History</h2>
          <span className="history-panel-count">
            {snapshots.length} {snapshots.length === 1 ? 'version' : 'versions'}
          </span>
        </div>

        <div className="history-panel-content">
          {snapshots.length === 0 ? (
            <div className="history-panel-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-muted)', marginBottom: '12px' }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>No history yet</p>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                Versions will appear here after AI operations
              </p>
            </div>
          ) : (
            <div className="history-panel-list">
              {snapshots.map((snapshot) => (
                <SnapshotItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  isActive={activeSnapshotId === snapshot.id}
                  onSelect={onSnapshotSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* History panel toggle button */
        .history-panel-toggle {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 100;
          width: 32px;
          height: 48px;
          padding: 0;
          border: 1px solid var(--border-muted);
          border-left: none;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          background: var(--surface-2);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .history-panel-toggle:hover {
          background: color-mix(in oklab, var(--surface-2) 70%, white 30%);
          color: var(--text);
          border-color: var(--border);
        }

        .history-panel-toggle:focus-visible {
          outline: none;
          box-shadow: var(--shadow-focus);
        }

        .history-panel-toggle:active {
          transform: translateY(-50%) translateX(2px);
        }

        /* History panel container - slides from left */
        .history-panel {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: #1a1a1a;
          border-right: 1px solid var(--border-muted);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 99;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .history-panel.open {
          transform: translateX(0);
        }

        /* History panel header */
        .history-panel-header {
          padding: 20px 16px;
          border-bottom: 1px solid var(--border-muted);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .history-panel-title {
          font-size: var(--fs-lg);
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }

        .history-panel-count {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          background: var(--surface-2);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        /* History panel content */
        .history-panel-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Empty state */
        .history-panel-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: var(--fs-sm);
        }

        .history-panel-empty p {
          margin: 0 0 8px 0;
        }

        /* Snapshot list */
        .history-panel-list {
          padding: 8px;
        }

        /* Scrollbar styling for history panel */
        .history-panel-content::-webkit-scrollbar {
          width: 8px;
        }

        .history-panel-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .history-panel-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }

        .history-panel-content::-webkit-scrollbar-thumb:hover {
          background: var(--highlight);
        }
      `}</style>
    </>
  );
}
