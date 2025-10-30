/**
 * Snapshot Detail Modal Component
 *
 * Displays full snapshot content with restore functionality.
 * Shows action type, timestamp, and full content with ability to restore to editor.
 */

import { Snapshot } from '../services/storage';

export interface SnapshotDetailModalProps {
  snapshot: Snapshot | null;
  onClose: () => void;
  onRestore: (content: string) => void;
}

/**
 * Formats a timestamp to a readable date and time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string
 */
function formatFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Gets icon for action type
 */
function getActionIcon(actionType: Snapshot['actionType']) {
  switch (actionType) {
    case 'generate':
      return (
        <svg width="20" height="20" viewBox="0 0 56 56" fill="currentColor" aria-hidden="true">
          <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z" />
        </svg>
      );
    case 'rewrite':
      return (
        <svg width="20" height="20" viewBox="0 0 600 600" fill="currentColor" aria-hidden="true">
          <path
            d="M570.00006,459.23077 C567.6923,466.15387 559.6154,467.30768 553.8462,462.69232 L553.8462,462.69232 L460.3846,369.23077 L460.3846,369.23077 C453.46152,362.3077 441.92307,362.3077 435,369.23077 L435,369.23077 L369.23077,435 L369.23077,435 C362.30768,441.92307 362.30768,453.46155 369.23077,460.3846 L369.23077,460.3846 L463.84616,553.8461 L463.84616,553.8461 C468.46155,558.46155 466.15384,566.53845 460.3846,570 L460.3846,570 C444.23074,574.61536 426.92307,576.9231 410.7692,576.9231 L410.7692,576.9231 C312.6923,576.9231 234.23074,492.69232 245.7692,392.30768 L245.7692,392.30768 C248.07689,376.15387 251.53844,362.3077 257.30765,348.46155 L257.30765,348.46155 L41.538456,133.84616 L41.538456,133.84616 C16.153841,108.46155 16.153841,66.923096 41.538456,42.69226 L41.538456,42.69226 C54.230766,29.999939 71.53845,23.076904 87.6923,23.076904 L87.6923,23.076904 C103.84615,23.076904 121.15384,29.999939 133.84615,42.69226 L133.84615,42.69226 L348.46155,257.30768 L348.46155,257.30768 C362.3077,251.53845 377.3077,248.0769 392.3077,245.76923 L392.3077,245.76923 C492.69232,234.23074 576.92303,312.6923 576.92303,410.76923 L576.92303,410.76923 C576.92303,428.07693 574.61536,444.23077 570.00006,459.23077 Z"
            transform="translate(0,600) scale(1,-1)"
          />
        </svg>
      );
    case 'summarize':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
  }
}

/**
 * Snapshot Detail Modal component
 * Full-screen modal showing snapshot details with restore functionality
 */
export function SnapshotDetailModal({ snapshot, onClose, onRestore }: SnapshotDetailModalProps) {
  if (!snapshot) return null;

  const handleRestore = () => {
    onRestore(snapshot.content);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="snapshot-modal-backdrop" onClick={handleBackdropClick}>
        <div
          className="snapshot-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="snapshot-modal-title"
        >
          {/* Header */}
          <div className="snapshot-modal-header">
            <div className="snapshot-modal-title-row">
              <div className="snapshot-modal-icon">{getActionIcon(snapshot.actionType)}</div>
              <div>
                <h2 id="snapshot-modal-title" className="snapshot-modal-title">
                  {snapshot.actionDescription}
                </h2>
                <p className="snapshot-modal-timestamp">
                  {formatFullTimestamp(snapshot.timestamp)}
                </p>
              </div>
            </div>
            <div className="snapshot-modal-actions">
              <button
                className="snapshot-modal-icon-btn snapshot-modal-restore-btn"
                onClick={handleRestore}
                aria-label="Restore this version"
                title="Restore"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
              <button
                className="snapshot-modal-icon-btn snapshot-modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
                title="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="snapshot-modal-content">
            <div className="snapshot-modal-text">{snapshot.content}</div>
          </div>
        </div>
      </div>

      <style>{`
        /* Modal backdrop */
        .snapshot-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Modal container */
        .snapshot-modal {
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          background: var(--bg);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Header */
        .snapshot-modal-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-muted);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
        }

        .snapshot-modal-title-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
        }

        .snapshot-modal-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--surface-2);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .snapshot-modal-title {
          font-size: var(--fs-lg);
          font-weight: 600;
          color: var(--text);
          margin: 0 0 4px 0;
        }

        .snapshot-modal-timestamp {
          font-size: var(--fs-sm);
          color: var(--text-muted);
          margin: 0;
        }

        .snapshot-modal-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .snapshot-modal-icon-btn {
          width: 48px;
          height: 48px;
          padding: 0;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
        }

        .snapshot-modal-restore-btn {
          background: linear-gradient(135deg, oklch(0.5 0.1 var(--accent-hue)) 0%, oklch(0.4 0.12 var(--accent-hue)) 100%);
          color: oklch(0.12 0 255);
        }

        .light .snapshot-modal-restore-btn {
          background: linear-gradient(135deg, oklch(0.7 0.1 var(--accent-hue)) 0%, oklch(0.6 0.12 var(--accent-hue)) 100%);
          color: oklch(0.12 0 255);
        }

        .snapshot-modal-restore-btn:hover {
          background: linear-gradient(135deg, oklch(0.55 0.11 var(--accent-hue)) 0%, oklch(0.45 0.13 var(--accent-hue)) 100%);
        }

        .light .snapshot-modal-restore-btn:hover {
          background: linear-gradient(135deg, oklch(0.75 0.11 var(--accent-hue)) 0%, oklch(0.65 0.13 var(--accent-hue)) 100%);
        }

        .snapshot-modal-restore-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 50%, transparent);
        }

        .snapshot-modal-close-btn {
          background: transparent;
          color: var(--text-muted);
        }

        .snapshot-modal-close-btn:hover {
          background: var(--surface-2);
          color: var(--text);
        }

        .snapshot-modal-close-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 50%, transparent);
        }

        /* Content */
        .snapshot-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .snapshot-modal-text {
          font-size: var(--fs-md);
          line-height: 1.6;
          color: var(--text);
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* Scrollbar styling */
        .snapshot-modal-content::-webkit-scrollbar {
          width: 10px;
        }

        .snapshot-modal-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .snapshot-modal-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 5px;
        }

        .snapshot-modal-content::-webkit-scrollbar-thumb:hover {
          background: var(--highlight);
        }
      `}</style>
    </>
  );
}
