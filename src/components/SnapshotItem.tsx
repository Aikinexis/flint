/**
 * Snapshot Item Component
 *
 * Displays a single snapshot in the history panel with action label, timestamp, and content preview.
 * Includes active state styling and hover effects.
 */

import { Snapshot } from '../services/storage';

export interface SnapshotItemProps {
  snapshot: Snapshot;
  isActive: boolean;
  onSelect: (snapshotId: string) => void;
  onToggleLiked?: (snapshotId: string, currentLiked: boolean) => void;
}

/**
 * Formats a timestamp to a readable time string (e.g., "2:45 PM")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Snapshot Item component
 * Displays a single version snapshot with action description, time, and content preview
 */
export function SnapshotItem({ snapshot, isActive, onSelect, onToggleLiked }: SnapshotItemProps) {
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the snapshot
    onToggleLiked?.(snapshot.id, snapshot.liked || false);
  };

  return (
    <>
      <button
        className={`snapshot-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelect(snapshot.id)}
        aria-label={`${snapshot.actionDescription} at ${formatTimestamp(snapshot.timestamp)}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <div className="snapshot-header">
          <div className="snapshot-action-container">
            {snapshot.actionDescription === 'Manual edit' && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 600 600"
                fill="currentColor"
                className="snapshot-edit-icon"
                aria-label="Manual edit"
              >
                <path
                  d="M570.00006,459.23077 C567.6923,466.15387 559.6154,467.30768 553.8462,462.69232 L553.8462,462.69232 L460.3846,369.23077 L460.3846,369.23077 C453.46152,362.3077 441.92307,362.3077 435,369.23077 L435,369.23077 L369.23077,435 L369.23077,435 C362.30768,441.92307 362.30768,453.46155 369.23077,460.3846 L369.23077,460.3846 L463.84616,553.8461 L463.84616,553.8461 C468.46155,558.46155 466.15384,566.53845 460.3846,570 L460.3846,570 C444.23074,574.61536 426.92307,576.9231 410.7692,576.9231 L410.7692,576.9231 C312.6923,576.9231 234.23074,492.69232 245.7692,392.30768 L245.7692,392.30768 C248.07689,376.15387 251.53844,362.3077 257.30765,348.46155 L257.30765,348.46155 L41.538456,133.84616 L41.538456,133.84616 C16.153841,108.46155 16.153841,66.923096 41.538456,42.69226 L41.538456,42.69226 C54.230766,29.999939 71.53845,23.076904 87.6923,23.076904 L87.6923,23.076904 C103.84615,23.076904 121.15384,29.999939 133.84615,42.69226 L133.84615,42.69226 L348.46155,257.30768 L348.46155,257.30768 C362.3077,251.53845 377.3077,248.0769 392.3077,245.76923 L392.3077,245.76923 C492.69232,234.23074 576.92303,312.6923 576.92303,410.76923 L576.92303,410.76923 C576.92303,428.07693 574.61536,444.23077 570.00006,459.23077 Z"
                  transform="translate(0,600) scale(1,-1)"
                />
              </svg>
            )}
            <span className="snapshot-action">{snapshot.actionDescription}</span>
          </div>
          <div className="snapshot-header-actions">
            {onToggleLiked && (
              <button
                className={`snapshot-like-btn ${snapshot.liked ? 'liked' : ''}`}
                onClick={handleLikeClick}
                aria-label={snapshot.liked ? 'Unlike' : 'Like'}
                title={snapshot.liked ? 'Unlike' : 'Like'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={snapshot.liked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            )}
            <span className="snapshot-time">{formatTimestamp(snapshot.timestamp)}</span>
          </div>
        </div>
        <div className="snapshot-preview">
          {snapshot.content.slice(0, 100)}
          {snapshot.content.length > 100 ? '...' : ''}
        </div>
      </button>

      <style>{`
        /* Snapshot item */
        .snapshot-item {
          width: 100%;
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .snapshot-item:hover {
          border-color: var(--border);
          transform: translateX(4px);
          background: color-mix(in oklab, var(--surface) 90%, white 10%);
        }

        .snapshot-item:focus-visible {
          outline: none;
          box-shadow: var(--shadow-focus);
        }

        .snapshot-item:active {
          transform: translateX(4px) translateY(1px);
        }

        .snapshot-item.active {
          border-color: var(--primary);
          background: color-mix(in oklab, var(--primary) 10%, var(--surface) 90%);
          box-shadow: 0 0 0 1px var(--primary);
        }

        .snapshot-item.active:hover {
          border-color: var(--primary);
          background: color-mix(in oklab, var(--primary) 15%, var(--surface) 85%);
        }

        /* Snapshot header */
        .snapshot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .snapshot-action-container {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          overflow: hidden;
        }

        .snapshot-edit-icon {
          flex-shrink: 0;
          color: var(--text-muted);
        }

        .snapshot-action {
          font-size: var(--fs-sm);
          font-weight: 600;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .snapshot-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .snapshot-like-btn {
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xs);
          transition: all 0.2s ease;
        }

        .snapshot-like-btn:hover {
          background: var(--surface-2);
          color: var(--text);
        }

        .snapshot-like-btn.liked {
          color: #e74c3c;
        }

        .snapshot-like-btn.liked:hover {
          color: #c0392b;
        }

        .snapshot-time {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          flex-shrink: 0;
        }

        /* Snapshot preview */
        .snapshot-preview {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </>
  );
}
