import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AIService } from '../services/ai';
import { replaceTextInline } from '../utils/inlineReplace';

type Props = {
  anchor: { x: number; y: number; text: string } | null;
  onClose(): void;
  onSend(panel: 'rewrite' | 'summary', text: string): void;
  toolbarRef: React.RefObject<HTMLDivElement>;
  /** Optional: Textarea element for inline replacement */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  /** Optional: Selection range for inline replacement */
  selectionRange?: { start: number; end: number };
  /** Optional: Pinned notes for AI context */
  pinnedNotes?: string[];
  /** Optional: Callback to create snapshot before AI operation */
  onBeforeOperation?: (operationType: 'rewrite' | 'summarize') => Promise<void>;
};

export const MiniBar: React.FC<Props> = ({
  anchor,
  onClose,
  onSend,
  toolbarRef,
  textareaRef,
  selectionRange,
  pinnedNotes = [],
  onBeforeOperation,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  // Store the selection range and text when minibar is shown
  const capturedSelectionRef = React.useRef<{ start: number; end: number; text: string } | null>(
    null
  );

  // Capture selection when anchor changes
  React.useEffect(() => {
    if (anchor && selectionRange) {
      capturedSelectionRef.current = {
        start: selectionRange.start,
        end: selectionRange.end,
        text: anchor.text,
      };
      console.log('[MiniBar] Selection captured:', capturedSelectionRef.current);
    }
  }, [anchor, selectionRange]);

  if (!anchor) return null;

  /**
   * Handle summarize button click with inline replacement
   */
  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use captured selection instead of current selection
    const captured = capturedSelectionRef.current;

    // If no textarea ref provided, fall back to old behavior (navigate to tab)
    if (!textareaRef?.current || !captured) {
      onSend('summary', anchor.text);
      return;
    }

    setIsProcessing(true);
    try {
      // Create snapshot before operation if callback provided
      if (onBeforeOperation) {
        await onBeforeOperation('summarize');
      }

      // Call AI service to summarize
      const result = await AIService.summarize(captured.text, {
        mode: 'bullets',
        readingLevel: 'moderate',
        pinnedNotes,
      });

      // Replace text inline using captured range
      await replaceTextInline(textareaRef.current, result, captured.start, captured.end);

      // Close mini bar after successful replacement
      onClose();
    } catch (error) {
      console.error('[MiniBar] Summarize error:', error);
      alert(error instanceof Error ? error.message : 'Failed to summarize text');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle rewrite button click with inline replacement
   */
  const handleRewrite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use captured selection instead of current selection
    const captured = capturedSelectionRef.current;

    // If no textarea ref provided, fall back to old behavior (navigate to tab)
    if (!textareaRef?.current || !captured) {
      onSend('rewrite', anchor.text);
      return;
    }

    setIsProcessing(true);
    try {
      // Create snapshot before operation if callback provided
      if (onBeforeOperation) {
        await onBeforeOperation('rewrite');
      }

      // Call AI service to rewrite with default tone
      const result = await AIService.rewrite(captured.text, {
        tone: 'as-is',
        pinnedNotes,
      });

      // Replace text inline using captured range
      await replaceTextInline(textareaRef.current, result, captured.start, captured.end);

      // Close mini bar after successful replacement
      onClose();
    } catch (error) {
      console.error('[MiniBar] Rewrite error:', error);
      alert(error instanceof Error ? error.message : 'Failed to rewrite text');
    } finally {
      setIsProcessing(false);
    }
  };

  const ui = (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        display: 'none', // Will be set to 'flex' by usePanelMiniBar
        gap: 8,
        background: 'var(--bg-light, #1c1f2a)',
        border: '1px solid var(--border, #2a3144)',
        borderRadius: 12,
        padding: '6px 8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseDown={(e) => {
        // Prevent the minibar from stealing focus from the textarea
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        // Ensure clicks are not blocked
        e.stopPropagation();
      }}
    >
      <button
        onClick={handleSummarize}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        disabled={isProcessing}
        aria-label="Summarize"
        style={{
          all: 'unset',
          width: '22px',
          height: '22px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isProcessing ? 'wait' : 'pointer',
          borderRadius: '6px',
          color: '#F4F6FA',
          transition: 'background 0.12s ease',
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {isProcessing ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        )}
      </button>
      <button
        onClick={handleRewrite}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        disabled={isProcessing}
        aria-label="Rewrite"
        title="Rewrite"
        style={{
          all: 'unset',
          width: '22px',
          height: '22px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isProcessing ? 'wait' : 'pointer',
          borderRadius: '6px',
          color: '#F4F6FA',
          transition: 'background 0.12s ease',
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {isProcessing ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        ) : (
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
        )}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        aria-label="Close"
        title="Close"
        style={{
          all: 'unset',
          width: '22px',
          height: '22px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '6px',
          color: '#F4F6FA',
          transition: 'background 0.12s ease',
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
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
    </div>
  );

  return createPortal(ui, document.body);
};
