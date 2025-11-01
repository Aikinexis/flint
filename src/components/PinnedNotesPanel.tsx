import { PinnedNote } from '../services/storage';

/**
 * PinnedNotesPanel component props
 */
export interface PinnedNotesPanelProps {
  /**
   * List of pinned notes
   */
  pinnedNotes: PinnedNote[];

  /**
   * IDs of currently active (enabled) pinned notes
   */
  activePinnedNoteIds: string[];

  /**
   * Callback when a note is toggled on/off
   */
  onToggleNote: (noteId: string) => void;

  /**
   * Callback to toggle all notes on
   */
  onToggleAll?: () => void;

  /**
   * Callback to toggle all notes off
   */
  onToggleNone?: () => void;

  /**
   * Whether the panel is open
   */
  isOpen: boolean;

  /**
   * Callback to toggle panel open/closed
   */
  onToggle: () => void;

  /**
   * Whether to hide the toggle button (e.g., on non-editor tabs)
   */
  hideToggle?: boolean;
}

/**
 * Collapsible panel for viewing and managing pinned notes
 * Similar to HistoryPanel but for pinned notes context
 */
export function PinnedNotesPanel({
  pinnedNotes,
  activePinnedNoteIds,
  onToggleNote,
  onToggleAll,
  onToggleNone,
  isOpen,
  onToggle,
  hideToggle = false,
}: PinnedNotesPanelProps) {
  const activeCount = activePinnedNoteIds.length;
  const allActive = pinnedNotes.length > 0 && activeCount === pinnedNotes.length;

  return (
    <>
      {/* Toggle button - only show when closed AND there are pinned notes */}
      {!hideToggle && !isOpen && pinnedNotes.length > 0 && (
        <button
          onClick={onToggle}
          aria-label="Open pinned notes"
          aria-expanded={false}
          title="Open pinned notes"
          className={`pinned-notes-toggle ${activeCount > 0 ? 'has-active-notes' : ''}`}
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
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      {/* Slide-out panel from bottom - fills full area like history panel */}
      <div
        className={`pinned-notes-panel ${isOpen ? 'open' : ''}`}
        role="region"
        aria-label="Pinned notes"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 17V3" />
              <path d="m6 11 6 6 6-6" />
              <path d="M19 21H5" />
            </svg>
            <h3 style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 600 }}>
              Pinned Notes
            </h3>
            <span
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                background: 'var(--surface-2)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {pinnedNotes.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle all/none switch */}
            {pinnedNotes.length > 0 && (onToggleAll || onToggleNone) && (
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '48px',
                  height: '28px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                title={allActive ? 'Disable all notes' : 'Enable all notes'}
              >
                <input
                  type="checkbox"
                  checked={allActive}
                  onChange={() => (allActive ? onToggleNone?.() : onToggleAll?.())}
                  aria-label={allActive ? 'Disable all notes' : 'Enable all notes'}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: allActive ? 'var(--primary)' : 'var(--surface-2)',
                    transition: '0.2s',
                    borderRadius: '28px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '20px',
                      width: '20px',
                      left: allActive ? '24px' : '4px',
                      bottom: '3px',
                      background: 'white',
                      transition: '0.2s',
                      borderRadius: '50%',
                    }}
                  />
                </span>
              </label>
            )}
            <button
              onClick={onToggle}
              aria-label="Close pinned notes panel"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
          }}
        >
          {pinnedNotes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
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
                style={{ margin: '0 auto 16px', opacity: 0.5 }}
              >
                <path d="M12 17V3" />
                <path d="m6 11 6 6 6-6" />
                <path d="M19 21H5" />
              </svg>
              <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                No pinned notes yet
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                Create pinned notes in Settings to provide context for AI operations
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pinnedNotes.map((note) => {
                const isActive = activePinnedNoteIds.includes(note.id);
                return (
                  <div
                    key={note.id}
                    style={{
                      padding: '12px',
                      background: isActive ? 'var(--surface-2)' : 'var(--bg)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.2s ease',
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    {/* Note content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--fs-sm)',
                          fontWeight: 600,
                          marginBottom: '4px',
                          color: 'var(--text)',
                        }}
                      >
                        {note.title}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--fs-xs)',
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          maxHeight: '120px',
                          overflowY: 'auto',
                          paddingRight: '4px',
                        }}
                      >
                        {note.content}
                      </div>
                    </div>

                    {/* Toggle switch - moved to right, styled like Settings */}
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '48px',
                        height: '28px',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => onToggleNote(note.id)}
                        aria-label={isActive ? `Disable ${note.title}` : `Enable ${note.title}`}
                        style={{
                          opacity: 0,
                          width: 0,
                          height: 0,
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: isActive ? 'var(--primary)' : 'var(--surface-2)',
                          transition: '0.2s',
                          borderRadius: '28px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: isActive ? '24px' : '4px',
                            bottom: '3px',
                            background: 'white',
                            transition: '0.2s',
                            borderRadius: '50%',
                          }}
                        />
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {pinnedNotes.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            {activeCount > 0
              ? `${activeCount} ${activeCount === 1 ? 'note' : 'notes'} will be included as context`
              : 'Toggle notes on to include them as context'}
          </div>
        )}
      </div>

      <style>{`
        /* Pinned notes toggle button - centered at bottom */
        .pinned-notes-toggle {
          position: fixed;
          bottom: 0px;
          left: calc((100% - 72px) / 2);
          transform: translateX(-50%);
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
          justifyContent: center;
        }

        .pinned-notes-toggle:hover {
          color: var(--text);
        }

        .pinned-notes-toggle:focus-visible {
          outline: none;
        }

        .pinned-notes-toggle:active {
          transform: translateX(-50%) scale(0.9);
        }

        /* Change arrow color and add glow when notes are active */
        .pinned-notes-toggle.has-active-notes {
          color: var(--primary);
        }

        .pinned-notes-toggle.has-active-notes svg {
          filter: drop-shadow(0 0 4px color-mix(in srgb, var(--primary) 50%, transparent));
          animation: pinned-notes-glow 2s ease-in-out infinite;
        }

        @keyframes pinned-notes-glow {
          0%, 100% {
            filter: drop-shadow(0 0 4px color-mix(in srgb, var(--primary) 40%, transparent));
          }
          50% {
            filter: drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 70%, transparent));
          }
        }

        /* Pinned notes panel - slides from bottom, fills space like history panel */
        .pinned-notes-panel {
          position: fixed;
          left: 0;
          right: 72px;
          top: 0;
          bottom: 0;
          background: var(--bg);
          border-top: 1px solid var(--border-muted);
          border-right: 1px solid var(--border-muted);
          transform: translateY(100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .pinned-notes-panel.open {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
