import { useState, useEffect, useRef } from 'react';
import { CarouselMiniBar } from './CarouselMiniBar';

/**
 * Version data structure
 */
export interface Version {
  id: string;
  text: string;
  label: string;
  title?: string; // Optional title/description for the version
  isOriginal?: boolean;
  isLiked?: boolean;
  timestamp: number;
  historyId?: string; // Optional ID of corresponding history item
}

/**
 * VersionCarousel component props
 */
export interface VersionCarouselProps {
  /**
   * Array of versions to display
   */
  versions: Version[];

  /**
   * Currently active version index
   */
  currentIndex: number;

  /**
   * Callback when user navigates to a different version
   */
  onNavigate: (index: number) => void;

  /**
   * Callback when user deletes a version
   */
  onDelete: (id: string) => void;

  /**
   * Callback when user likes/unlikes a version
   */
  onToggleLike: (id: string) => void;

  /**
   * Callback when user copies version text to clipboard
   */
  onCopy?: (id: string) => void;

  /**
   * Callback when user clears all text
   */
  onClearAll?: () => void;

  /**
   * Callback when user edits a version (only for original)
   */
  onEdit?: (id: string, newText: string) => void;

  /**
   * Callback when user edits the title
   */
  onEditTitle?: (id: string, newTitle: string) => void;

  /**
   * Callback when text changes (for word/char count updates)
   */
  onTextChange?: (wordCount: number, charCount: number) => void;

  /**
   * Whether the carousel is in a loading state
   */
  isLoading?: boolean;

  /**
   * Placeholder text when no versions exist
   */
  placeholder?: string;

  /**
   * Whether to always show action buttons (like/delete) even for single version
   */
  alwaysShowActions?: boolean;

  /**
   * Whether the textarea should be read-only (user cannot edit)
   */
  readOnly?: boolean;

  /**
   * Callback when user clicks summarize in carousel mini bar
   */
  onMiniBarSummarize?: (text: string) => void;

  /**
   * Callback when user clicks rewrite in carousel mini bar
   */
  onMiniBarRewrite?: (text: string) => void;
}

/**
 * VersionCarousel component
 * Displays text versions in a carousel with navigation, delete, and like functionality
 */
export function VersionCarousel({
  versions,
  currentIndex,
  onNavigate,
  onDelete,
  onToggleLike,
  onCopy,
  onClearAll,
  onEdit,
  onEditTitle,
  onTextChange,
  isLoading = false,
  placeholder = 'No content yet',
  alwaysShowActions = false,
  readOnly = false,
  onMiniBarSummarize,
  onMiniBarRewrite,
}: VersionCarouselProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentVersion = versions[currentIndex];
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < versions.length - 1;



  // Calculate word and character counts for current version
  const wordCount = editText.trim() === '' ? 0 : editText.trim().split(/\s+/).length;
  const charCount = editText.length;

  // Update edit text and title when version changes
  useEffect(() => {
    if (currentVersion) {
      setEditText(currentVersion.text);
      setEditTitle(currentVersion.title || '');
    } else {
      setEditText('');
      setEditTitle('');
    }
  }, [currentVersion]);

  // Notify parent of text changes for counter display
  useEffect(() => {
    if (onTextChange) {
      onTextChange(wordCount, charCount);
    }
  }, [wordCount, charCount, onTextChange]);

  /**
   * Handles left arrow click
   */
  const handlePrevious = () => {
    if (canGoLeft) {
      onNavigate(currentIndex - 1);
    }
  };

  /**
   * Handles right arrow click
   */
  const handleNext = () => {
    if (canGoRight) {
      onNavigate(currentIndex + 1);
    }
  };

  /**
   * Handles delete button click
   */
  const handleDelete = async () => {
    if (!currentVersion || currentVersion.isOriginal || isDeleting) return;

    setIsDeleting(true);
    try {
      onDelete(currentVersion.id);
      
      // Navigate to previous version if possible, otherwise next
      if (canGoLeft) {
        onNavigate(currentIndex - 1);
      } else if (canGoRight) {
        onNavigate(currentIndex + 1);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles like button click
   */
  const handleToggleLike = () => {
    if (!currentVersion) return;
    onToggleLike(currentVersion.id);
  };

  /**
   * Handles copy button click
   */
  const handleCopy = async () => {
    if (!currentVersion || !onCopy) return;

    try {
      await navigator.clipboard.writeText(currentVersion.text);
      setShowCopySuccess(true);

      // Hide checkmark after 2 seconds
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 2000);

      onCopy(currentVersion.id);
    } catch (err) {
      console.error('[VersionCarousel] Failed to copy to clipboard:', err);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'transparent',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
      className={isLoading ? 'carousel-loading' : ''}
      role="region"
      aria-label="Version carousel"
    >
      {/* Text content with optional title */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: '1px solid var(--stroke)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {/* Editable title (if onEditTitle is provided and not original) */}
        {onEditTitle && currentVersion && !currentVersion.isOriginal && (
          <input
            type="text"
            className="flint-input"
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              onEditTitle(currentVersion.id, e.target.value);
            }}
            placeholder="Add a title..."
            disabled={isLoading}
            aria-label="Version title"
            style={{
              width: '100%',
              border: 'none',
              borderBottom: '1px solid var(--stroke)',
              background: 'transparent',
              padding: '12px 16px',
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            }}
          />
        )}

        {/* Read-only title display (if no onEditTitle but title exists and not original) */}
        {!onEditTitle && currentVersion?.title && !currentVersion.isOriginal && (
          <div
            style={{
              width: '100%',
              borderBottom: '1px solid var(--stroke)',
              padding: '12px 16px',
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--text)',
              background: 'transparent',
            }}
          >
            {currentVersion.title}
          </div>
        )}

        {/* Editable textarea */}
        <textarea
          ref={textareaRef}
          className="flint-input"
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            if (currentVersion && onEdit) {
              onEdit(currentVersion.id, e.target.value);
            }
          }}
          placeholder={placeholder}
          disabled={isLoading}
          readOnly={readOnly}
          aria-label="Text content"
          tabIndex={versions.length === 0 || readOnly ? -1 : 0}
          style={{
            width: '100%',
            flex: 1,
            resize: 'none',
            border: 'none',
            background: 'transparent',
            padding: '16px',
            fontSize: 'var(--fs-md)',
            lineHeight: '1.6',
            color: 'var(--text)',
            borderRadius: (onEditTitle || currentVersion?.title) && !currentVersion?.isOriginal ? '0 0 var(--radius-md) var(--radius-md)' : 'var(--radius-md)',
            cursor: readOnly ? 'default' : 'text',
          }}
        />

        {/* Loading indicator - top right corner */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite' }}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom controls: navigation, counter, like, and delete */}
      {(versions.length > 1 || (alwaysShowActions && versions.length > 0)) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderTop: '1px solid var(--stroke)',
            background: 'transparent',
            gap: '12px',
          }}
        >
          {/* Left side: Navigation arrows and counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* Left arrow - only show if multiple versions */}
            {versions.length > 1 && (
              <button
                onClick={handlePrevious}
                disabled={!canGoLeft || isLoading}
                aria-label="Previous version"
                title="Previous"
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: canGoLeft ? 'pointer' : 'not-allowed',
                  opacity: canGoLeft ? 1 : 0.3,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (canGoLeft) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
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
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {/* Right arrow - only show if multiple versions */}
            {versions.length > 1 && (
              <button
                onClick={handleNext}
                disabled={!canGoRight || isLoading}
                aria-label="Next version"
                title="Next"
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: canGoRight ? 'pointer' : 'not-allowed',
                  opacity: canGoRight ? 1 : 0.3,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (canGoRight) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Version counter - only show if multiple versions */}
            {versions.length > 1 && (
              <div
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  marginLeft: '4px',
                  userSelect: 'none',
                }}
              >
                {currentIndex + 1}/{versions.length}
              </div>
            )}
          </div>

          {/* Right side: Like and delete buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* Clear all button - only show if there's text and onClearAll is provided */}
            {onClearAll && currentVersion?.text.trim() && (
              <button
                onClick={onClearAll}
                disabled={isLoading}
                aria-label="Clear all text"
                title="Clear all"
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Copy button - only show if there's text and onCopy is provided */}
            {onCopy && currentVersion?.text.trim() && (
              <button
                onClick={handleCopy}
                disabled={isLoading || showCopySuccess}
                aria-label={showCopySuccess ? 'Copied to clipboard' : 'Copy to clipboard'}
                title={showCopySuccess ? 'Copied!' : 'Copy'}
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: showCopySuccess ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                  color: showCopySuccess ? '#22c55e' : 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!showCopySuccess) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showCopySuccess) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                {showCopySuccess ? (
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
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
                )}
              </button>
            )}

            {/* Like button - only show if there's text */}
            {currentVersion?.text.trim() && (
              <button
                onClick={handleToggleLike}
                disabled={isLoading}
                aria-label={
                  currentVersion?.isLiked ? 'Unlike version' : 'Like version'
                }
                title={currentVersion?.isLiked ? 'Unlike' : 'Like'}
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: currentVersion?.isLiked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: currentVersion?.isLiked ? '#ef4444' : 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!currentVersion?.isLiked) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!currentVersion?.isLiked) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={currentVersion?.isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            )}

            {/* Delete button (hidden for original) */}
            {!currentVersion?.isOriginal && (
              <button
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                aria-label="Delete version"
                title="Delete"
                className="icon-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Carousel Mini Bar - only show if callbacks are provided */}
      {onMiniBarSummarize && onMiniBarRewrite && (
        <CarouselMiniBar
          textareaRef={textareaRef}
          onSummarize={onMiniBarSummarize}
          onRewrite={onMiniBarRewrite}
        />
      )}
    </div>
  );
}
