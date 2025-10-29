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
export function SnapshotItem({ snapshot, isActive, onSelect }: SnapshotItemProps) {
  return (
    <>
      <button
        className={`snapshot-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelect(snapshot.id)}
        aria-label={`${snapshot.actionDescription} at ${formatTimestamp(snapshot.timestamp)}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <div className="snapshot-header">
          <span className="snapshot-action">{snapshot.actionDescription}</span>
          <span className="snapshot-time">{formatTimestamp(snapshot.timestamp)}</span>
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

        .snapshot-action {
          font-size: var(--fs-sm);
          font-weight: 600;
          color: var(--text);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
