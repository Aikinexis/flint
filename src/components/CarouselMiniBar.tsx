/**
 * Carousel Mini Bar Component
 * 
 * A mini bar that appears when text is selected within carousel textareas
 * Provides quick actions for selected text
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTextareaCaretPosition } from '../utils/textareaCaretPosition';

interface CarouselMiniBarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onSummarize: (text: string) => void;
  onRewrite: (text: string) => void;
}

export function CarouselMiniBar({ textareaRef, onSummarize, onRewrite }: CarouselMiniBarProps) {
  const [visible, setVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  function showForCurrentSelection() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value.substring(start, end).trim();
    
    if (!text || text.length < 3 || document.activeElement !== textarea) {
      setVisible(false);
      return;
    }
    
    setSelectedText(text);
    setVisible(true);
  }

  // Position the toolbar for textarea selections
  useEffect(() => {
    const barEl = barRef.current;
    const textarea = textareaRef.current;
    if (!barEl || !visible || !textarea) return;

    function placeFixed() {
      if (!barEl || !textarea) return;
      
      requestAnimationFrame(() => {
        // Check if there's a selection
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        
        if (selStart === selEnd) {
          barEl.style.display = 'none';
          return;
        }
        
        // Get pixel-perfect caret position using mirror div technique
        const caretPos = getTextareaCaretPosition(textarea);
        if (!caretPos) {
          barEl.style.display = 'none';
          return;
        }
        
        const textareaRect = textarea.getBoundingClientRect();
        const barRect = barEl.getBoundingClientRect();
        
        // Convert textarea-relative position to viewport position
        // Center the minibar horizontally above the selection start
        let x = textareaRect.left + caretPos.x - (barRect.width / 2);
        let y = textareaRect.top + caretPos.y - barRect.height - 8;
        
        // Keep within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (x < 8) x = 8;
        if (x + barRect.width > viewportWidth - 8) {
          x = viewportWidth - barRect.width - 8;
        }
        
        // If no room above, position below
        if (y < 8) {
          const style = window.getComputedStyle(textarea);
          const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
          y = textareaRect.top + caretPos.y + lineHeight + 8;
        }
        
        // Clamp to viewport
        if (y + barRect.height > viewportHeight - 8) {
          y = viewportHeight - barRect.height - 8;
        }

        barEl.style.position = 'fixed';
        barEl.style.left = `${Math.round(x)}px`;
        barEl.style.top = `${Math.round(y)}px`;
        barEl.style.display = 'flex';
        barEl.style.pointerEvents = 'auto';
        barEl.style.zIndex = '2147483647';
      });
    }

    // Initial placement
    placeFixed();

    // Reposition on events
    const onSelectionChange = placeFixed;
    const onMouseUp = placeFixed;
    const onKeyUp = placeFixed;
    const onScroll = placeFixed;
    const onResize = placeFixed;

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (textarea) {
      textarea.addEventListener('scroll', onScroll);
    }

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (textarea) {
        textarea.removeEventListener('scroll', onScroll);
      }
    };
  }, [visible, textareaRef]);

  // Show or hide based on user actions
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const onUp = () => requestAnimationFrame(showForCurrentSelection);
    const onKey = () => requestAnimationFrame(showForCurrentSelection);
    const onScroll = () => setVisible(false);
    const onBlur = () => {
      setTimeout(() => {
        if (document.activeElement !== textarea) {
          setVisible(false);
        }
      }, 100);
    };

    textarea.addEventListener('mouseup', onUp);
    textarea.addEventListener('keyup', onKey);
    textarea.addEventListener('scroll', onScroll);
    textarea.addEventListener('blur', onBlur);

    return () => {
      textarea.removeEventListener('mouseup', onUp);
      textarea.removeEventListener('keyup', onKey);
      textarea.removeEventListener('scroll', onScroll);
      textarea.removeEventListener('blur', onBlur);
    };
  }, [textareaRef]);

  if (!visible) return null;

  const ui = (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        display: 'none',
        gap: 8,
        background: 'var(--bg-light, #1c1f2a)',
        border: '1px solid var(--border, #2a3144)',
        borderRadius: 12,
        padding: '6px 8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        zIndex: 2147483647,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onPointerDown={() => {
          onSummarize(selectedText);
          setVisible(false);
        }}
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
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="Summarize"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      <button
        onPointerDown={() => {
          onRewrite(selectedText);
          setVisible(false);
        }}
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
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="Rewrite"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <button
        onPointerDown={() => setVisible(false)}
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
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );

  return createPortal(ui, document.body);
}
