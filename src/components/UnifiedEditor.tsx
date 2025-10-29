import { useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { usePanelMiniBar } from '../hooks/usePanelMiniBar';
import { MiniBar } from './MiniBar';
import { CursorIndicator } from './CursorIndicator';
import { SelectionOverlay } from './SelectionOverlay';
import { expandToWordBoundaries } from '../utils/textSelection';

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
 * UnifiedEditor ref interface - exposes textarea element and control methods
 */
export interface UnifiedEditorRef {
  getTextarea: () => HTMLTextAreaElement | null;
  showCursorIndicator: () => void;
  hideCursorIndicator: () => void;
  showSelectionOverlay: () => void;
  hideSelectionOverlay: () => void;
  updateCapturedSelection: (start: number, end: number) => void;
  getCapturedSelection: () => SelectionRange;
}

/**
 * UnifiedEditor component - single shared textarea that persists across all tool tabs
 * Provides a consistent editing experience across Generate, Rewrite, and Summarize tools
 */
export const UnifiedEditor = forwardRef<UnifiedEditorRef, UnifiedEditorProps>(function UnifiedEditor({
  content,
  onContentChange,
  activeTool,
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

  // State for showing indicators
  const [showSelectionOverlay, setShowSelectionOverlay] = useState(false);
  const [capturedSelection, setCapturedSelection] = useState<SelectionRange>({ start: 0, end: 0 });

  // Captured selection range - preserved even when textarea loses focus
  const capturedSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  
  // No restoration effect needed! With single editor architecture, selection naturally persists

  /**
   * Handle MiniBar navigation (fallback when inline replacement not available)
   */
  const handleMiniBarNavigate = (panel: 'rewrite' | 'summary', text: string) => {
    if (onMiniBarNavigate) {
      onMiniBarNavigate(panel, text);
    }
    clear();
  };

  // Expose textarea element and control methods to parent via ref
  useImperativeHandle(ref, () => ({
    getTextarea: () => textareaRef.current,
    showCursorIndicator: () => {
      // Cursor indicator now shown automatically in generate tool
      console.log('[UnifiedEditor] showCursorIndicator called (now automatic in generate tool)');
    },
    hideCursorIndicator: () => {
      // No-op since indicator is controlled by activeTool
    },
    showSelectionOverlay: () => {
      setShowSelectionOverlay(true);
    },
    hideSelectionOverlay: () => {
      setShowSelectionOverlay(false);
    },
    updateCapturedSelection: (start: number, end: number) => {
      capturedSelectionRef.current = { start, end };
      selectionRef.current = { start, end };
      setCapturedSelection({ start, end }); // Update state to trigger re-render
      setShowSelectionOverlay(true);
    },
    getCapturedSelection: () => capturedSelectionRef.current,
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

    // Update both refs - CRITICAL: Always capture selection/cursor state
    selectionRef.current = { start, end };
    capturedSelectionRef.current = { start, end };
    
    console.log('[UnifiedEditor] 🔵 CAPTURED SELECTION:', { start, end, capturedRef: capturedSelectionRef.current });

    // Check if text is selected
    const hasSelection = start !== end;
    if (hasSelection) {
      // Expand selection to word boundaries
      const expanded = expandToWordBoundaries(content, start, end);
      
      // Update refs with expanded selection
      selectionRef.current = expanded;
      capturedSelectionRef.current = expanded;
      setCapturedSelection(expanded); // Update state to trigger re-render
      
      const selected = content.substring(expanded.start, expanded.end);
      
      // CRITICAL: Show selection overlay immediately when text is selected
      setShowSelectionOverlay(true);
      
      // Update textarea selection to match expanded range
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(expanded.start, expanded.end);
      }
      
      console.log('[UnifiedEditor] ✓ Selection captured and expanded:', { 
        original: { start, end }, 
        expanded, 
        text: selected.substring(0, 50) 
      });
      
      // Notify parent component ONLY when there's a selection
      onSelectionChange({ start: expanded.start, end: expanded.end });
    } else {
      // No selection - just cursor position
      // Hide overlay locally but DON'T notify parent (preserves shared selection across tools)
      setShowSelectionOverlay(false);
      console.log('[UnifiedEditor] ✓ Cursor position captured (no selection, hiding overlay):', { start, end });
    }
  };

  /**
   * Handles click in textarea
   * Only hide overlay if user is making a NEW selection (not just clicking on existing selection)
   */
  const handleClick = () => {
    // Just handle the selection normally - handleSelect will manage overlay visibility
    handleSelect();
  };

  /**
   * Handles blur event - captures selection but doesn't hide overlay
   * This allows the overlay to persist when clicking buttons
   */
  const handleBlur = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    // Update captured refs but DON'T hide the overlay
    selectionRef.current = { start, end };
    capturedSelectionRef.current = { start, end };
    
    console.log('[UnifiedEditor] 🔵 BLUR - CAPTURED SELECTION:', { start, end, capturedRef: capturedSelectionRef.current });

    // Only notify parent if there's an actual selection (not just cursor position)
    const hasSelection = start !== end;
    if (hasSelection) {
      onSelectionChange({ start, end });
    }
    // Don't notify parent about cursor-only changes - preserve existing selection state
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
  
  // Calculate cursor direction for generate tool indicator
  const cursorDirection: 'forward' | 'backward' | 'bidirectional' = useMemo(() => {
    const cursorPos = capturedSelectionRef.current.start;
    
    if (cursorPos === 0) {
      return 'backward'; // At start, text flows backward (to the left)
    } else if (cursorPos >= content.length) {
      return 'forward'; // At end, text flows forward (to the right)
    } else {
      return 'bidirectional'; // In middle, text can flow both ways
    }
  }, [content, capturedSelectionRef.current.start]);

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

      
      {/* Selection overlay - highlights selected text with colored border */}
      <SelectionOverlay 
        show={showSelectionOverlay}
        textarea={textareaRef.current}
        selectionStart={capturedSelection.start}
        selectionEnd={capturedSelection.end}
      />

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onClick={handleClick}
        onBlur={handleBlur}
        onMouseUp={handleSelect}
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
      
      {/* Cursor direction indicator - positioned between word counter and sidebar, only in generate tool */}
      {activeTool === 'generate' && content.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <CursorIndicator 
            show={true}
            direction={cursorDirection}
          />
        </div>
      )}

      {/* Mini bar for text selection with inline replacement */}
      <MiniBar
        anchor={anchor}
        onClose={clear}
        onSend={handleMiniBarNavigate}
        toolbarRef={miniBarRef}
        textareaRef={textareaRef}
        selectionRange={capturedSelectionRef.current}
        pinnedNotes={pinnedNotes}
        onBeforeOperation={onBeforeMiniBarOperation}
      />
    </div>
  );
});
