import { useState, useEffect, useRef } from 'react';
import type { HistoryItem } from '../services/storage';
import { StorageService } from '../services/storage';

/**
 * History component props
 */
export interface HistoryProps {
  /**
   * Optional history items (will load from storage if not provided)
   */
  history?: HistoryItem[];

  /**
   * Callback when history changes (optional)
   */
  onHistoryChange?: (history: HistoryItem[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'type' | 'liked';

/**
 * History component for viewing past operations
 * Displays list of generate, summarize, and rewrite operations with search
 */
export function History({
  history: propHistory,
  onHistoryChange: _onHistoryChange,
}: HistoryProps) {
  // Component state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<'generate' | 'summarize' | 'rewrite'>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Load history from storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const items = await StorageService.getHistory();
        setHistory(items);
      } catch (error) {
        console.error('[History] Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!propHistory) {
      loadHistory();
    } else {
      setHistory(propHistory);
      setIsLoading(false);
    }
  }, [propHistory]);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  /**
   * Filters and sorts history items
   */
  const filteredHistory = history
    .filter((item) => {
      // Category filter - if any filters are active, only show those types
      if (activeFilters.size > 0 && !activeFilters.has(item.type)) {
        return false;
      }

      // Liked filter
      if (showLikedOnly && !item.liked) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.originalText.toLowerCase().includes(query) ||
          item.resultText.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'type':
          if (a.type === b.type) {
            return b.timestamp - a.timestamp;
          }
          return a.type.localeCompare(b.type);
        case 'liked':
          if (a.liked === b.liked) {
            return b.timestamp - a.timestamp;
          }
          return a.liked ? -1 : 1;
        default:
          return b.timestamp - a.timestamp;
      }
    });

  /**
   * Formats timestamp to readable date string
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Gets icon for operation type
   */
  const getOperationIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'generate':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 56 56"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z"/>
          </svg>
        );
      case 'summarize':
        return (
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
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        );
      case 'rewrite':
        return (
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
    }
  };

  /**
   * Gets label for operation type
   */
  const getOperationLabel = (type: HistoryItem['type']): string => {
    switch (type) {
      case 'generate':
        return 'Generate';
      case 'summarize':
        return 'Summarize';
      case 'rewrite':
        return 'Rewrite';
    }
  };

  /**
   * Truncates text to specified length
   */
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  /**
   * Handles clicking on a history item
   */
  const handleItemClick = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  /**
   * Closes the detail modal
   */
  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  /**
   * Copies text to clipboard
   */
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`[History] ${label} copied to clipboard`);
    } catch (error) {
      console.error('[History] Failed to copy to clipboard:', error);
    }
  };

  /**
   * Toggles liked status of a history item
   */
  const handleToggleLiked = async (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Optimistically update UI in both history list and selected item
    setHistory((prev) => prev.map((item) => 
      item.id === itemId ? { ...item, liked: !item.liked } : item
    ));
    
    // Update selected item if it's the one being toggled
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => prev ? { ...prev, liked: !prev.liked } : null);
    }
    
    try {
      const updatedItem = await StorageService.toggleHistoryLiked(itemId);
      if (updatedItem) {
        // Update with server response to ensure consistency
        setHistory((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
        
        // Update selected item with server response
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem(updatedItem);
        }
      }
    } catch (error) {
      console.error('[History] Failed to toggle liked:', error);
      // Revert optimistic update on error
      setHistory((prev) => prev.map((item) => 
        item.id === itemId ? { ...item, liked: !item.liked } : item
      ));
      
      // Revert selected item on error
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem((prev) => prev ? { ...prev, liked: !prev.liked } : null);
      }
    }
  };

  /**
   * Clears the search query
   */
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  /**
   * Toggles category filter - allows multiple selections
   */
  const handleCategoryToggle = (category: 'generate' | 'summarize' | 'rewrite') => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(category)) {
        newFilters.delete(category);
      } else {
        newFilters.add(category);
      }
      return newFilters;
    });
  };

  /**
   * Gets sort label
   */
  const getSortLabel = (sort: SortOption): string => {
    switch (sort) {
      case 'newest':
        return 'Newest first';
      case 'oldest':
        return 'Oldest first';
      case 'type':
        return 'By type';
      case 'liked':
        return 'Liked first';
    }
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">History</h2>

      {/* Search field */}
      <div style={{ marginBottom: '12px', position: 'relative' }}>
        <input
          type="text"
          className="flint-input"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search history"
          style={{
            width: '100%',
            paddingLeft: '40px',
            paddingRight: searchQuery ? '40px' : '12px',
          }}
        />
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
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              borderRadius: '4px',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
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
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Icon-only filter buttons */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Generate filter */}
        <button
          className={`history-icon-btn ${activeFilters.has('generate') ? 'active' : ''}`}
          onClick={() => handleCategoryToggle('generate')}
          aria-label="Filter generate history"
          aria-pressed={activeFilters.has('generate')}
          title="Generate"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 56 56"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z"/>
          </svg>
        </button>

        {/* Summarize filter */}
        <button
          className={`history-icon-btn ${activeFilters.has('summarize') ? 'active' : ''}`}
          onClick={() => handleCategoryToggle('summarize')}
          aria-label="Filter summarize history"
          aria-pressed={activeFilters.has('summarize')}
          title="Summarize"
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
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>

        {/* Rewrite filter */}
        <button
          className={`history-icon-btn ${activeFilters.has('rewrite') ? 'active' : ''}`}
          onClick={() => handleCategoryToggle('rewrite')}
          aria-label="Filter rewrite history"
          aria-pressed={activeFilters.has('rewrite')}
          title="Rewrite"
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        {/* Sort button with dropdown */}
        <div style={{ position: 'relative' }} ref={sortMenuRef}>
          <button
            className="history-icon-btn"
            onClick={() => setShowSortMenu(!showSortMenu)}
            aria-label="Sort options"
            aria-expanded={showSortMenu}
            title="Sort"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>

          {/* Sort dropdown menu */}
          {showSortMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              {(['newest', 'oldest', 'type', 'liked'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: sortBy === option ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--text)',
                    fontSize: 'var(--fs-sm)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (sortBy !== option) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {getSortLabel(option)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Liked filter toggle */}
        <button
          className={`history-icon-btn ${showLikedOnly ? 'active' : ''}`}
          onClick={() => setShowLikedOnly(!showLikedOnly)}
          aria-label={showLikedOnly ? 'Show all items' : 'Show liked only'}
          aria-pressed={showLikedOnly}
          title={showLikedOnly ? 'Show all' : 'Show liked'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={showLikedOnly ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* History list - scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ margin: '0 auto 16px', opacity: 0.5 }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 500 }}>
              {searchQuery ? 'No matching history items' : 'No history yet'}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: 'var(--fs-sm)' }}>
              {searchQuery
                ? 'Try a different search term'
                : 'Your generate, summarize, and rewrite operations will appear here'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                aria-label={`View ${getOperationLabel(item.type)} operation from ${formatTimestamp(item.timestamp)}`}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid var(--stroke)',
                  background: 'transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Header with type and timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--primary)',
                      }}
                    >
                      {getOperationIcon(item.type)}
                    </div>
                    <span
                      style={{
                        fontSize: 'var(--fs-sm)',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {getOperationLabel(item.type)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <button
                      className="history-icon-btn"
                      onClick={(e) => handleToggleLiked(item.id, e)}
                      aria-label={item.liked ? 'Unlike' : 'Like'}
                      title={item.liked ? 'Unlike' : 'Like'}
                      style={{
                        color: item.liked ? '#ef4444' : undefined,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={item.liked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Preview text */}
                <p
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {truncateText(item.originalText, 150)}
                </p>

                {/* Metadata badges */}
                {item.metadata && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      marginTop: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {item.metadata.mode && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {item.metadata.mode}
                      </span>
                    )}
                    {item.metadata.preset && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {item.metadata.preset}
                      </span>
                    )}
                    {item.metadata.confidence !== undefined && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--stroke)',
                        }}
                      >
                        {Math.round(item.metadata.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0',
          }}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-detail-title"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '700px',
              height: '100vh',
              background: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--stroke)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--surface)',
                    color: 'var(--primary)',
                  }}
                >
                  {getOperationIcon(selectedItem.type)}
                </div>
                <div>
                  <h3
                    id="history-detail-title"
                    style={{
                      fontSize: 'var(--fs-lg)',
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: 0,
                    }}
                  >
                    {getOperationLabel(selectedItem.type)} Operation
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--fs-xs)',
                      color: 'var(--text-muted)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {new Date(selectedItem.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="history-icon-btn"
                  onClick={(e) => handleToggleLiked(selectedItem.id, e)}
                  aria-label={selectedItem.liked ? 'Unlike' : 'Like'}
                  title={selectedItem.liked ? 'Unlike' : 'Like'}
                  style={{
                    color: selectedItem.liked ? '#ef4444' : undefined,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={selectedItem.liked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <button
                  className="history-icon-btn"
                  onClick={handleCloseModal}
                  aria-label="Close detail view"
                  title="Close"
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
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable content area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {/* Metadata */}
              {selectedItem.metadata && (
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {selectedItem.metadata.mode && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          border: '1px solid var(--stroke)',
                          fontWeight: 500,
                        }}
                      >
                        {selectedItem.metadata.mode}
                      </span>
                    )}
                    {selectedItem.metadata.preset && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          border: '1px solid var(--stroke)',
                          fontWeight: 500,
                        }}
                      >
                        {selectedItem.metadata.preset}
                      </span>
                    )}
                    {selectedItem.metadata.confidence !== undefined && (
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          border: '1px solid var(--stroke)',
                          fontWeight: 500,
                        }}
                      >
                        {Math.round(selectedItem.metadata.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Original text */}
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <label
                    style={{
                      fontSize: 'var(--fs-sm)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Original
                  </label>
                  <button
                    className="history-icon-btn"
                    onClick={() => handleCopy(selectedItem.originalText, 'Original text')}
                    aria-label="Copy original text"
                    title="Copy"
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
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--stroke)',
                    fontSize: 'var(--fs-base)',
                    color: 'var(--text)',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                  }}
                >
                  {selectedItem.originalText}
                </div>
              </div>

              {/* Result text */}
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <label
                    style={{
                      fontSize: 'var(--fs-sm)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Result
                  </label>
                  <button
                    className="history-icon-btn"
                    onClick={() => handleCopy(selectedItem.resultText, 'Result text')}
                    aria-label="Copy result text"
                    title="Copy"
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
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    border: '1px solid var(--stroke)',
                    fontSize: 'var(--fs-base)',
                    color: 'var(--text)',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                  }}
                >
                  {selectedItem.resultText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add spin animation for loading spinner and icon button styles
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .history-icon-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .history-icon-btn:hover {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
  }
  
  .history-icon-btn:active {
    transform: scale(0.95);
  }
  
  .history-icon-btn.active {
    background: var(--surface);
    color: var(--primary);
    border: 1px solid var(--primary);
  }
  
  .history-icon-btn.active:hover {
    background: var(--surface-2);
  }
`;
if (!document.head.querySelector('style[data-history-animations]')) {
  style.setAttribute('data-history-animations', 'true');
  document.head.appendChild(style);
}
