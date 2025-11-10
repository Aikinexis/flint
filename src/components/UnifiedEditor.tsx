import { useRef, forwardRef, useImperativeHandle, useMemo, useState, useEffect } from 'react';
import { CursorIndicator } from './CursorIndicator';
import { SelectionOverlay } from './SelectionOverlay';
import { expandToWordBoundaries } from '../utils/textSelection';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { fixCapitalizationAroundCursor } from '../utils/fixAllCapitalization';
import { smartInsertAtCursor } from '../utils/smartInsertion';

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
   * Maximum number of undo steps to keep (default: 50)
   */
  undoHistoryLimit?: number;
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
  insertAtCursor: (text: string, selectAfterInsert?: boolean, replaceSelection?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushToHistory: (content: string, selectionStart: number, selectionEnd: number) => void;
}

/**
 * UnifiedEditor component - single shared textarea that persists across all tool tabs
 * Provides a consistent editing experience across Generate, Rewrite, and Summarize tools
 */
export const UnifiedEditor = forwardRef<UnifiedEditorRef, UnifiedEditorProps>(
  function UnifiedEditor(
    {
      content,
      onContentChange,
      activeTool,
      onSelectionChange,
      placeholder = 'Start typing or paste text here...',
      disabled = false,
      readOnly = false,
      undoHistoryLimit = 10,
    },
    ref
  ) {
    // Ref for the textarea element
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Track cursor position and selection state
    const selectionRef = useRef<SelectionRange>({ start: 0, end: 0 });

    // State for showing indicators
    const [showSelectionOverlay, setShowSelectionOverlay] = useState(false);
    const [capturedSelection, setCapturedSelection] = useState<SelectionRange>({
      start: 0,
      end: 0,
    });

    // Captured selection range - preserved even when textarea loses focus
    const capturedSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });

    // Custom undo/redo system
    const undoRedo = useUndoRedo(undoHistoryLimit || 10);

    // Store undoRedo in a ref so it's stable across renders
    const undoRedoRef = useRef(undoRedo);
    undoRedoRef.current = undoRedo;

    // Flag to prevent pushing state during undo/redo operations
    const isUndoRedoOperationRef = useRef(false);

    // Debounce timer for pushing states to history
    const pushStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track if we've initialized the history
    const hasInitializedRef = useRef(false);

    // Initialize history with initial content
    useEffect(() => {
      if (!hasInitializedRef.current && content) {
        console.log(
          '[UnifiedEditor] Initializing undo history with content:',
          content.substring(0, 50)
        );
        undoRedoRef.current.pushState({
          content,
          selectionStart: 0,
          selectionEnd: 0,
        });
        hasInitializedRef.current = true;
      }
    }, [content]); // Only depend on content

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (pushStateTimeoutRef.current) {
          clearTimeout(pushStateTimeoutRef.current);
        }
      };
    }, []);

    // No restoration effect needed! With single editor architecture, selection naturally persists

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
      undo: () => {
        const prevState = undoRedoRef.current.undo();
        if (prevState && textareaRef.current) {
          isUndoRedoOperationRef.current = true;
          onContentChange(prevState.content);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(
                prevState.selectionStart,
                prevState.selectionEnd
              );
              textareaRef.current.focus();
            }
            isUndoRedoOperationRef.current = false;
          }, 0);
        }
      },
      redo: () => {
        const nextState = undoRedoRef.current.redo();
        if (nextState && textareaRef.current) {
          isUndoRedoOperationRef.current = true;
          onContentChange(nextState.content);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(
                nextState.selectionStart,
                nextState.selectionEnd
              );
              textareaRef.current.focus();
            }
            isUndoRedoOperationRef.current = false;
          }, 0);
        }
      },
      canUndo: () => undoRedoRef.current.canUndo(),
      canRedo: () => undoRedoRef.current.canRedo(),
      pushToHistory: (content: string, selectionStart: number, selectionEnd: number) => {
        console.log('[UnifiedEditor] Manually pushing to history:', content.substring(0, 50));
        undoRedoRef.current.pushState({
          content,
          selectionStart,
          selectionEnd,
        });
      },
      insertAtCursor: (
        text: string,
        selectAfterInsert: boolean = false,
        replaceSelection: boolean = false
      ) => {
        if (!textareaRef.current) return;

        console.log(
          '[UnifiedEditor] insertAtCursor called with text:',
          text.substring(0, 50) + '...',
          'select:',
          selectAfterInsert,
          'replace:',
          replaceSelection
        );

        const textarea = textareaRef.current;

        let startPos, endPos;
        if (
          replaceSelection &&
          capturedSelectionRef.current.start !== capturedSelectionRef.current.end
        ) {
          // Replace the captured selection
          startPos = capturedSelectionRef.current.start;
          endPos = capturedSelectionRef.current.end;
          console.log('[UnifiedEditor] Replacing selection:', startPos, '-', endPos);
        } else {
          // Insert at cursor
          startPos = textarea.selectionStart;
          endPos = startPos;
        }

        console.log('[UnifiedEditor] Insert/replace position:', startPos, '-', endPos);
        console.log('[UnifiedEditor] Content length before:', content.length);

        // Use smart insertion to handle overlaps and word boundaries
        const { text: smartInsertedText, cursorPos: newCursorPosition } = smartInsertAtCursor(
          content,
          startPos,
          text
        );
        
        console.log('[UnifiedEditor] After smart insertion:', smartInsertedText.substring(0, 200));
        
        // Fix capitalization around the insertion point (not the whole document)
        const newContent = fixCapitalizationAroundCursor(smartInsertedText, newCursorPosition, 500);

        console.log('[UnifiedEditor] After capitalization fix:', newContent.substring(0, 200));
        console.log('[UnifiedEditor] New content length:', newContent.length);

        // Update content
        onContentChange(newContent);

        // Calculate selection range based on smart insertion
        const insertStart = startPos;
        const insertEnd = newCursorPosition;

        setTimeout(() => {
          textarea.focus();
          if (selectAfterInsert) {
            // Select the inserted text (excluding spaces)
            textarea.setSelectionRange(insertStart, insertEnd);
            // Update captured selection refs
            capturedSelectionRef.current = { start: insertStart, end: insertEnd };
            selectionRef.current = { start: insertStart, end: insertEnd };
            setCapturedSelection({ start: insertStart, end: insertEnd });
            setShowSelectionOverlay(true);
            // Notify parent of selection
            onSelectionChange({ start: insertStart, end: insertEnd });
            console.log('[UnifiedEditor] Text inserted and selected:', {
              start: insertStart,
              end: insertEnd,
            });

            // Push to undo history (AI operation completed)
            undoRedoRef.current.pushState({
              content: newContent,
              selectionStart: insertStart,
              selectionEnd: insertEnd,
            });
          } else {
            // Just move cursor to end of inserted text
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);

            // Push to undo history (AI operation completed)
            undoRedoRef.current.pushState({
              content: newContent,
              selectionStart: newCursorPosition,
              selectionEnd: newCursorPosition,
            });
          }
        }, 0);
      },
    }));

    /**
     * Handles textarea content change
     */
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      onContentChange(newContent);

      // Push to undo history (debounced to avoid too many states during typing)
      if (!isUndoRedoOperationRef.current) {
        if (pushStateTimeoutRef.current) {
          clearTimeout(pushStateTimeoutRef.current);
        }

        console.log('[UnifiedEditor] Content changed, will push state in 300ms');
        pushStateTimeoutRef.current = setTimeout(() => {
          if (textareaRef.current) {
            // Get current content from textarea (not from closure)
            const currentContent = textareaRef.current.value;
            console.log(
              '[UnifiedEditor] Pushing state to history:',
              currentContent.substring(0, 50)
            );
            undoRedoRef.current.pushState({
              content: currentContent,
              selectionStart: textareaRef.current.selectionStart,
              selectionEnd: textareaRef.current.selectionEnd,
            });
          }
        }, 300); // 300ms debounce
      } else {
        console.log('[UnifiedEditor] Content changed during undo/redo, NOT pushing to history');
      }
    };

    /**
     * Handles keyboard shortcuts for undo/redo
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        console.log('[UnifiedEditor] Undo triggered, canUndo:', undoRedoRef.current.canUndo());
        const prevState = undoRedoRef.current.undo();
        console.log('[UnifiedEditor] Undo returned state:', prevState ? 'YES' : 'NO');
        if (prevState && textareaRef.current) {
          isUndoRedoOperationRef.current = true;
          console.log('[UnifiedEditor] Restoring content:', prevState.content.substring(0, 50));
          onContentChange(prevState.content);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(
                prevState.selectionStart,
                prevState.selectionEnd
              );
            }
            isUndoRedoOperationRef.current = false;
          }, 0);
        } else {
          console.log('[UnifiedEditor] Cannot undo - no previous state');
        }
      }
      // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux)
      else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        (e.ctrlKey && e.key === 'y')
      ) {
        e.preventDefault();
        console.log('[UnifiedEditor] Redo triggered, canRedo:', undoRedoRef.current.canRedo());
        const nextState = undoRedoRef.current.redo();
        console.log('[UnifiedEditor] Redo returned state:', nextState ? 'YES' : 'NO');
        if (nextState && textareaRef.current) {
          isUndoRedoOperationRef.current = true;
          console.log('[UnifiedEditor] Restoring content:', nextState.content.substring(0, 50));
          onContentChange(nextState.content);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(
                nextState.selectionStart,
                nextState.selectionEnd
              );
            }
            isUndoRedoOperationRef.current = false;
          }, 0);
        } else {
          console.log('[UnifiedEditor] Cannot redo - no next state');
        }
      }
    };

    /**
     * Handles selection change in textarea
     * Tracks cursor position and text selection
     */
    const handleSelect = async () => {
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;

      // Update both refs - CRITICAL: Always capture selection/cursor state
      selectionRef.current = { start, end };
      capturedSelectionRef.current = { start, end };

      // Reduced logging - only log when debugging selection issues
      // console.log('[UnifiedEditor] Captured selection:', { start, end });

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
          text: selected.substring(0, 50),
        });

        // Notify parent component ONLY when there's a selection
        onSelectionChange({ start: expanded.start, end: expanded.end });
      } else {
        // No selection - just cursor position
        // Update state to trigger re-render of cursor indicator
        setCapturedSelection({ start, end });

        // Hide overlay locally but DON'T notify parent (preserves shared selection across tools)
        setShowSelectionOverlay(false);
        
        // Check if cursor is mid-sentence and show sentence boundary highlight
        if (activeTool === 'generate' && content.trim()) {
          const { isMidSentence, findNearestSentenceBoundary } = await import('../utils/sentenceBoundary');
          if (isMidSentence(content, start)) {
            const snappedPos = findNearestSentenceBoundary(content, start);
            // Briefly highlight the sentence boundary
            setCapturedSelection({ start: Math.max(0, snappedPos - 2), end: snappedPos });
            setShowSelectionOverlay(true);
            
            // After 500ms, hide the highlight and restore cursor position
            setTimeout(() => {
              setCapturedSelection({ start, end });
              setShowSelectionOverlay(false);
            }, 500);
          }
        }
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

      // Update captured refs and state
      selectionRef.current = { start, end };
      capturedSelectionRef.current = { start, end };
      setCapturedSelection({ start, end }); // Update state to trigger re-render

      // Reduced logging
      // console.log('[UnifiedEditor] Blur - captured selection:', {
      //   start,
      //   end,
      // });

      // Only notify parent if there's an actual selection (not just cursor position)
      const hasSelection = start !== end;
      if (hasSelection) {
        onSelectionChange({ start, end });
      }
      // Don't notify parent about cursor-only changes - preserve existing selection state
    };

    // Remove the problematic useEffect that was interfering with typing
    // The cursor position is already tracked by handleSelect and doesn't need restoration

    // Check if there's an actual selection (not just cursor)
    const hasSelection = useMemo(() => {
      return capturedSelection.start !== capturedSelection.end;
    }, [capturedSelection.start, capturedSelection.end]);

    // Calculate word and character counts (for selection or full content)
    const wordCount = useMemo(() => {
      if (hasSelection) {
        const selectedText = content.substring(capturedSelection.start, capturedSelection.end);
        return selectedText.trim() === '' ? 0 : selectedText.trim().split(/\s+/).length;
      }
      return content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
    }, [content, hasSelection, capturedSelection.start, capturedSelection.end]);

    const charCount = useMemo(() => {
      if (hasSelection) {
        return capturedSelection.end - capturedSelection.start;
      }
      return content.length;
    }, [content.length, hasSelection, capturedSelection.start, capturedSelection.end]);

    // Calculate cursor direction for generate tool indicator
    // Use state value (capturedSelection) instead of ref to trigger re-renders
    const cursorDirection: 'forward' | 'backward' | 'bidirectional' = useMemo(() => {
      const cursorPos = capturedSelection.start;

      // Check characters around cursor position
      const charBefore = cursorPos > 0 ? content[cursorPos - 1] : '';
      const charAfter = cursorPos < content.length ? content[cursorPos] : '';

      // At start of document (position 0 with content after)
      if (cursorPos === 0 && content.length > 0) {
        return 'backward'; // Show left arrow (text generates before existing content)
      }

      // At end of document
      if (cursorPos >= content.length) {
        return 'forward'; // Show right arrow (text appends)
      }

      // At end of a line/paragraph (next char is newline)
      if (charAfter === '\n') {
        return 'forward'; // Show right arrow (continuing the paragraph)
      }

      // At start of a line/paragraph (previous char is newline, or at position 0)
      if (charBefore === '\n' || cursorPos === 0) {
        return 'backward'; // Show left arrow (text generates at start of line)
      }

      // In the middle of a line
      return 'bidirectional'; // Show both arrows (text can go either way)
    }, [content, capturedSelection.start]);

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
        {/* Processing overlay - prevents interaction during AI operations */}
        {disabled && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.02)',
              zIndex: 100,
              cursor: 'not-allowed',
              pointerEvents: 'all',
            }}
            aria-hidden="true"
          />
        )}

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
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onBlur={handleBlur}
          onMouseUp={handleSelect}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={true}
          aria-label="Document editor"
          dir="ltr"
          style={{
            width: '100%',
            flex: 1,
            resize: 'none',
            border: 'none',
            background: 'var(--bg)',
            paddingTop: '16px',
            paddingLeft: '12px', // Align with title text
            paddingRight: '10px', // Reduced padding for scrollbar
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

        {/* Bottom status bar with cursor indicator and word counter */}
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
              gap: '8px',
              pointerEvents: 'none',
              background: 'var(--bg)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              zIndex: 10,
            }}
          >
            {/* Cursor direction indicator - only show in generate tool when NO selection */}
            {activeTool === 'generate' && !hasSelection && (
              <CursorIndicator show={true} direction={cursorDirection} />
            )}

            {/* Word and character counter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: hasSelection ? '12px' : '0',
                border: hasSelection ? '1px solid var(--primary)' : '1px solid transparent',
                boxShadow: hasSelection
                  ? '0 0 8px color-mix(in srgb, var(--primary) 40%, transparent)'
                  : 'none',
                transition: 'all 0.2s ease',
              }}
              aria-label={
                hasSelection
                  ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'}, ${charCount} ${charCount === 1 ? 'character' : 'characters'} selected`
                  : `${wordCount} ${wordCount === 1 ? 'word' : 'words'}, ${charCount} ${charCount === 1 ? 'character' : 'characters'}`
              }
            >
              <span>{wordCount}w</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{charCount}c</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);
