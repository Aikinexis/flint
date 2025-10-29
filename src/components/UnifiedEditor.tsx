import { useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { usePanelMiniBar } from '../hooks/usePanelMiniBar';
import { MiniBar } from './MiniBar';

/**
 * Selection range interface
 */
export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * UnifiedEditor component props
 */
export interface UnifiedEditorProps {
  /**
   * Current content of the editor
   */
  content: string;

  /**
   * Callback when content changes
   */
  onContentChange: (content: string) => void;

  /**
   * Active tool tab (determines which controls are shown below)
   */
  activeTool: 'generate' | 'rewrite' | 'summarize';

  /**
   * Callback when selection changes
   */
  onSelectionChange: (selection: SelectionRange) => void;

  /**
   * Placeholder text when editor is empty
   */
  placeholder?: string;

  /**
   * Whether the editor is disabled
   */
  disabled?: boolean;

  /**
   * Whether the editor is read-only
   */
  readOnly?: boolean;

  /**
   * Pinned notes for AI context (passed to MiniBar)
   */
  pinnedNotes?: string[];

  /**
   * Callback when MiniBar navigates to a different tab (fallback behavior)
   */
  onMiniBarNavigate?: (panel: 'rewrite' | 'summary', text: string) => void;

  /**
   * Callback to create snapshot before AI operation in MiniBar
   */
  onBeforeMiniBarOperation?: (operationType: 'rewrite' | 'summarize') => Promise<void>;
}

/**
 * UnifiedEditor ref interface - exposes textarea element
 */
export interface UnifiedEditorRef {
  getTextarea: () => HTMLTextAreaElement | null;
}

/**
 * UnifiedEditor component - single shared textarea that persists across all tool tabs
 * Provides a consistent editing experience across Generate, Rewrite, and Summarize tools
 */
export const UnifiedEditor = forwardRef<UnifiedEditorRef, UnifiedEditorProps>(function UnifiedEditor({
  content,
  onContentChange,
  activeTool: _activeTool,
  onSelectionChange,
  placeholder = 'Start typing or paste text here...',
  disabled = false,
  readOnly = false,
  pinnedNotes = [],
  onMiniBarNavigate,
  onBeforeMiniBarOperation,
}, ref) {
  // Ref for the textarea element
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track cursor position and selection state
  const selectionRef = useRef<SelectionRange>({ start: 0, end: 0 });

  // Mini bar for text selection
  const miniBarRef = useRef<HTMLDivElement>(null);
  const { anchor, clear } = usePanelMiniBar(miniBarRef);

  /**
   * Handle MiniBar navigation (fallback when inline replacement not available)
   */
  const handleMiniBarNavigate = (panel: 'rewrite' | 'summary', text: string) => {
    if (onMiniBarNavigate) {
      onMiniBarNavigate(panel, text);
    }
    clear();
  };

  // Expose textarea element to parent via ref
  useImperativeHandle(ref, () => ({
    getTextarea: () => textareaRef.current,
  }));

  /**
   * Handles textarea content change
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  /**
   * Handles selection change in textarea
   * Tracks cursor position and text selection
   */
  const handleSelect = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    // Update selection ref
    selectionRef.current = { start, end };

    // Notify parent component
    onSelectionChange({ start, end });
  };

  // Remove the problematic useEffect that was interfering with typing
  // The cursor position is already tracked by handleSelect and doesn't need restoration

  // Calculate word and character counts
  const wordCount = useMemo(() => {
    return content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  }, [content]);

  const charCount = useMemo(() => {
    return content.length;
  }, [content]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
      }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onClick={handleSelect}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-label="Document editor"
        dir="ltr"
        style={{
          width: '100%',
          flex: 1,
          resize: 'none',
          border: 'none',
          background: 'var(--bg)',
          padding: '16px',
          paddingBottom: '48px', // Make room for counter at bottom
          fontSize: 'var(--fs-md)',
          lineHeight: '1.6',
          color: 'var(--text)',
          borderRadius: '0',
          cursor: readOnly ? 'default' : 'text',
          fontFamily: 'var(--font-sans)',
          direction: 'ltr',
          textAlign: 'left',
          outline: 'none',
        }}
      />

      {/* Word and character counter - positioned at bottom of textarea */}
      {content.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '32px',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            fontWeight: 500,
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
            background: 'var(--bg)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 10,
          }}
          aria-label={`${wordCount} ${wordCount === 1 ? 'word' : 'words'}, ${charCount} ${charCount === 1 ? 'character' : 'characters'}`}
        >
          <span>{wordCount}w</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{charCount}c</span>
        </div>
      )}

      {/* Mini bar for text selection with inline replacement */}
      <MiniBar
        anchor={anchor}
        onClose={clear}
        onSend={handleMiniBarNavigate}
        toolbarRef={miniBarRef}
        textareaRef={textareaRef}
        selectionRange={selectionRef.current}
        pinnedNotes={pinnedNotes}
        onBeforeOperation={onBeforeMiniBarOperation}
      />
    </div>
  );
});
