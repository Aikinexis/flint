/**
 * History Panel Component
 *
 * Displays version snapshots for the current project in a collapsible sidebar panel.
 * Positioned between main content and sidebar with slide-in/out animation.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Snapshot, StorageService } from '../services/storage';
import { SnapshotItem } from './SnapshotItem';
import { SnapshotDetailModal } from './SnapshotDetailModal';

export interface HistoryPanelProps {
  projectId: string;
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  onSnapshotSelect: (snapshotId: string) => void;
  onRestore: (content: string) => void; // Callback to restore snapshot content to editor
  isOpen: boolean;
  onToggle: () => void;
  onSnapshotsChange?: () => void; // Callback when snapshots are modified
  hideToggle?: boolean; // Hide the toggle button (e.g., when on settings/projects/welcome)
}

type SortOption = 'newest' | 'oldest' | 'type';
type FilterType = 'generate' | 'rewrite' | 'summarize' | 'manual';

/**
 * History Panel component
 * Collapsible panel displaying version snapshots with dark background
 */
export function HistoryPanel({
  projectId,
  snapshots,
  activeSnapshotId,
  onSnapshotSelect: _onSnapshotSelect,
  onRestore,
  isOpen,
  onToggle,
  onSnapshotsChange,
  hideToggle = false,
}: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const clearMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
      if (clearMenuRef.current && !clearMenuRef.current.contains(event.target as Node)) {
        setShowClearConfirm(false);
      }
    };

    if (showSortMenu || showClearConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu, showClearConfirm]);

  // Toggle filter
  const toggleFilter = (type: FilterType) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  // Check if snapshot is a manual edit
  const isManualEdit = (snapshot: Snapshot): boolean => {
    return snapshot.actionDescription === 'Manual edit';
  };

  // Toggle liked status
  const handleToggleLiked = async (snapshotId: string, currentLiked: boolean) => {
    try {
      await StorageService.updateSnapshot(snapshotId, { liked: !currentLiked });
      onSnapshotsChange?.();
    } catch (error) {
      console.error('[HistoryPanel] Failed to toggle liked:', error);
    }
  };

  // Handle snapshot click to open detail modal
  const handleSnapshotClick = (snapshotId: string) => {
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    if (snapshot) {
      setSelectedSnapshot(snapshot);
    }
  };

  // Close detail modal
  const handleCloseModal = () => {
    setSelectedSnapshot(null);
  };

  // Handle clear history
  const handleClearHistory = async () => {
    try {
      await StorageService.clearSnapshots(projectId);
      setShowClearConfirm(false);
      onSnapshotsChange?.();
    } catch (error) {
      console.error('[HistoryPanel] Failed to clear history:', error);
    }
  };

  // Filter and sort snapshots
  const filteredSnapshots = useMemo(() => {
    let filtered = [...snapshots];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (snapshot) =>
          snapshot.content.toLowerCase().includes(query) ||
          snapshot.actionDescription.toLowerCase().includes(query)
      );
    }

    // Apply type filters
    if (activeFilters.size > 0) {
      filtered = filtered.filter((snapshot) => {
        // Check if it's a manual edit
        if (isManualEdit(snapshot)) {
          return activeFilters.has('manual');
        }
        // Otherwise check the action type
        return activeFilters.has(snapshot.actionType);
      });
    }

    // Apply liked filter
    if (showLikedOnly) {
      filtered = filtered.filter((snapshot) => snapshot.liked);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'type':
          return a.actionType.localeCompare(b.actionType);
        default:
          return 0;
      }
    });

    return filtered;
  }, [snapshots, searchQuery, activeFilters, showLikedOnly, sortBy]);

  return (
    <>
      {/* Snapshot detail modal */}
      <SnapshotDetailModal
        snapshot={selectedSnapshot}
        onClose={handleCloseModal}
        onRestore={onRestore}
      />

      {/* Toggle button on sidebar edge */}
      {!hideToggle && (
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
          >
            {isOpen ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      )}

      {/* History panel container */}
      <div
        className={`history-panel ${isOpen ? 'open' : ''}`}
        role="region"
        aria-label="Version history"
      >
        <div className="history-panel-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h2 className="history-panel-title">History</h2>
            <span className="history-panel-count">
              {filteredSnapshots.length} {filteredSnapshots.length === 1 ? 'version' : 'versions'}
            </span>
          </div>

          {/* Search bar with action buttons */}
          <div
            className="history-search"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              marginBottom: '12px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search history"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 'var(--fs-sm)',
                outline: 'none',
                minWidth: 0,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="history-search-clear"
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {/* Liked filter button */}
            <button
              className={`history-action-btn ${showLikedOnly ? 'active' : ''}`}
              onClick={() => setShowLikedOnly(!showLikedOnly)}
              aria-label={showLikedOnly ? 'Show all' : 'Show liked only'}
              title={showLikedOnly ? 'Show all' : 'Show liked only'}
              style={{
                padding: '4px',
                background: showLikedOnly ? 'var(--primary)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: showLikedOnly ? 'white' : 'var(--text-muted)',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={showLikedOnly ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            {/* Sort button */}
            <div
              className="history-sort-container"
              ref={sortMenuRef}
              style={{ position: 'relative', flexShrink: 0 }}
            >
              <button
                className="history-action-btn"
                onClick={() => setShowSortMenu(!showSortMenu)}
                aria-label="Sort options"
                title="Sort"
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  borderRadius: '4px',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </button>
              {showSortMenu && (
                <div className="history-sort-menu">
                  <button
                    className={sortBy === 'newest' ? 'active' : ''}
                    onClick={() => {
                      setSortBy('newest');
                      setShowSortMenu(false);
                    }}
                  >
                    Newest First
                  </button>
                  <button
                    className={sortBy === 'oldest' ? 'active' : ''}
                    onClick={() => {
                      setSortBy('oldest');
                      setShowSortMenu(false);
                    }}
                  >
                    Oldest First
                  </button>
                  <button
                    className={sortBy === 'type' ? 'active' : ''}
                    onClick={() => {
                      setSortBy('type');
                      setShowSortMenu(false);
                    }}
                  >
                    By Type
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters and controls */}
          <div className="history-controls">
            <div className="history-filters">
              {/* Generate filter */}
              <button
                className={`history-filter-chip ${activeFilters.has('generate') ? 'active' : ''}`}
                onClick={() => toggleFilter('generate')}
                aria-label="Filter by generate"
                title="Generate"
              >
                <svg width="14" height="14" viewBox="0 0 56 56" fill="currentColor">
                  <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z" />
                </svg>
              </button>

              {/* Rewrite filter */}
              <button
                className={`history-filter-chip ${activeFilters.has('rewrite') ? 'active' : ''}`}
                onClick={() => toggleFilter('rewrite')}
                aria-label="Filter by rewrite"
                title="Rewrite"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {/* Summarize filter */}
              <button
                className={`history-filter-chip ${activeFilters.has('summarize') ? 'active' : ''}`}
                onClick={() => toggleFilter('summarize')}
                aria-label="Filter by summarize"
                title="Summarize"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              </button>

              {/* Manual edit filter */}
              <button
                className={`history-filter-chip ${activeFilters.has('manual') ? 'active' : ''}`}
                onClick={() => toggleFilter('manual')}
                aria-label="Filter by manual edit"
                title="Manual Edit"
              >
                <svg width="14" height="14" viewBox="0 0 600 600" fill="currentColor">
                  <path
                    d="M570.00006,459.23077 C567.6923,466.15387 559.6154,467.30768 553.8462,462.69232 L553.8462,462.69232 L460.3846,369.23077 L460.3846,369.23077 C453.46152,362.3077 441.92307,362.3077 435,369.23077 L435,369.23077 L369.23077,435 L369.23077,435 C362.30768,441.92307 362.30768,453.46155 369.23077,460.3846 L369.23077,460.3846 L463.84616,553.8461 L463.84616,553.8461 C468.46155,558.46155 466.15384,566.53845 460.3846,570 L460.3846,570 C444.23074,574.61536 426.92307,576.9231 410.7692,576.9231 L410.7692,576.9231 C312.6923,576.9231 234.23074,492.69232 245.7692,392.30768 L245.7692,392.30768 C248.07689,376.15387 251.53844,362.3077 257.30765,348.46155 L257.30765,348.46155 L41.538456,133.84616 L41.538456,133.84616 C16.153841,108.46155 16.153841,66.923096 41.538456,42.69226 L41.538456,42.69226 C54.230766,29.999939 71.53845,23.076904 87.6923,23.076904 L87.6923,23.076904 C103.84615,23.076904 121.15384,29.999939 133.84615,42.69226 L133.84615,42.69226 L348.46155,257.30768 L348.46155,257.30768 C362.3077,251.53845 377.3077,248.0769 392.3077,245.76923 L392.3077,245.76923 C492.69232,234.23074 576.92303,312.6923 576.92303,410.76923 L576.92303,410.76923 C576.92303,428.07693 574.61536,444.23077 570.00006,459.23077 Z"
                    transform="translate(0,600) scale(1,-1)"
                  />
                </svg>
              </button>
            </div>

            <div className="history-actions">
              {/* Clear all button */}
              <div className="history-sort-container" ref={clearMenuRef}>
                <button
                  className="history-action-btn"
                  onClick={() => setShowClearConfirm(!showClearConfirm)}
                  aria-label="Clear history"
                  aria-expanded={showClearConfirm}
                  title="Clear history"
                  disabled={snapshots.length === 0}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>

                {showClearConfirm && (
                  <div className="history-clear-menu">
                    <p>Clear all history?</p>
                    <div className="history-clear-actions">
                      <button
                        className="history-clear-cancel"
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button className="history-clear-confirm" onClick={handleClearHistory}>
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
          ) : filteredSnapshots.length === 0 ? (
            <div className="history-panel-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: 'var(--text-muted)', marginBottom: '12px' }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p>No matching versions</p>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="history-panel-list">
              {filteredSnapshots.map((snapshot) => (
                <SnapshotItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  isActive={activeSnapshotId === snapshot.id}
                  onSelect={handleSnapshotClick}
                  onToggleLiked={handleToggleLiked}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* History panel toggle button - just an arrow icon */
        .history-panel-toggle {
          position: fixed;
          right: 69px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 99;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .history-panel-toggle:hover {
          color: var(--text);
        }

        .history-panel-toggle:focus-visible {
          outline: none;
        }

        .history-panel-toggle:active {
          transform: translateY(-50%) scale(0.9);
        }

        /* History panel - slides from right, UNDER sidebar, fills space dynamically */
        .history-panel {
          position: fixed;
          left: 0;
          right: 72px;
          top: 0;
          bottom: 0;
          background: var(--bg);
          border-left: 1px solid var(--border-muted);
          transform: translateX(100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .history-panel.open {
          transform: translateX(0);
        }

        /* History panel header - match original History component */
        .history-panel-header {
          padding: 24px 24px 16px 24px;
          flex-shrink: 0;
        }

        .history-panel-title {
          font-size: var(--fs-xl);
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px 0;
        }

        .history-panel-count {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          margin-left: 8px;
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
          padding: 16px 24px;
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

        /* Search bar */
        .history-search {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--surface-2);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .history-search svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .history-search input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: var(--fs-sm);
          outline: none;
        }

        .history-search input::placeholder {
          color: var(--text-muted);
        }

        .history-search-clear {
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xs);
        }

        .history-search-clear:hover {
          background: var(--surface-3);
          color: var(--text);
        }

        /* Controls (filters + actions) */
        .history-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        /* Filters */
        .history-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          flex: 1;
        }

        .history-filter-chip {
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .history-filter-chip:hover {
          background: var(--surface-2);
          border: 1px solid var(--border-muted);
          color: var(--text);
        }

        .history-filter-chip.active {
          background: var(--primary);
          border: 1px solid var(--primary);
          color: white;
        }

        /* Actions */
        .history-actions {
          display: flex;
          gap: 4px;
        }

        .history-action-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .history-action-btn:hover {
          background: var(--surface-2);
          border: 1px solid var(--border-muted);
          color: var(--text);
        }

        .history-action-btn.active {
          background: var(--accent);
          border: 1px solid var(--accent);
          color: white;
        }

        /* Sort menu */
        .history-sort-container {
          position: relative;
        }

        .history-sort-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 150px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-soft);
          padding: 4px;
          z-index: 10;
        }

        .history-sort-menu button {
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: var(--fs-sm);
          text-align: left;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background 0.2s ease;
        }

        .history-sort-menu button:hover {
          background: var(--surface-3);
        }

        .history-sort-menu button.active {
          background: var(--accent);
          color: white;
        }

        /* Clear menu */
        .history-clear-container {
          position: relative;
        }

        .history-clear-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 180px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-soft);
          padding: 12px;
          z-index: 10;
        }

        .history-clear-menu p {
          margin: 0 0 12px 0;
          font-size: var(--fs-sm);
          color: var(--text);
          font-weight: 500;
        }

        .history-clear-actions {
          display: flex;
          gap: 8px;
        }

        .history-clear-cancel,
        .history-clear-confirm {
          flex: 1;
          padding: 6px 12px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--fs-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .history-clear-cancel {
          background: var(--surface-3);
          color: var(--text);
        }

        .history-clear-cancel:hover {
          background: var(--surface-4);
        }

        .history-clear-confirm {
          background: #ef4444;
          color: white;
        }

        .history-clear-confirm:hover {
          background: #dc2626;
        }

        .history-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .history-action-btn:disabled:hover {
          background: transparent;
          border: none;
          color: var(--text-muted);
        }
      `}</style>
    </>
  );
}
