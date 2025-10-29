import { useEffect, useRef } from 'react';

/**
 * SelectionOverlay - renders a colored background overlay on selected text
 * Uses a simpler approach: just change the textarea background for selected range
 */
export interface SelectionOverlayProps {
  show: boolean;
  textarea: HTMLTextAreaElement | null;
  selectionStart: number;
  selectionEnd: number;
  color?: string;
}

export function SelectionOverlay({ 
  show, 
  textarea, 
  selectionStart, 
  selectionEnd, 
  color = 'var(--accent)' 
}: SelectionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !overlayRef.current || !textarea || selectionStart === selectionEnd) {
      if (overlayRef.current) {
        overlayRef.current.innerHTML = '';
      }
      return;
    }

    let mirror: HTMLDivElement | null = null;

    const updateOverlay = () => {
      if (!overlayRef.current || !textarea) return;

      // Create a mirror div that exactly matches the textarea
      mirror = document.createElement('div');
      const computed = window.getComputedStyle(textarea);
      
      // Copy ALL relevant styles
      const stylesToCopy = [
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform',
        'textIndent', 'textAlign', 'whiteSpace', 'wordWrap', 'wordBreak',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'border', 'borderWidth', 'boxSizing', 'width', 'height'
      ];
      
      stylesToCopy.forEach(prop => {
        const value = computed[prop as any];
        if (value) {
          mirror!.style[prop as any] = value;
        }
      });
      
      // Position mirror exactly over textarea
      mirror.style.position = 'absolute';
      mirror.style.top = '0';
      mirror.style.left = '0';
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.height = `${textarea.clientHeight}px`;
      mirror.style.overflow = 'hidden';
      mirror.style.pointerEvents = 'none';
      mirror.style.zIndex = '1';
      
      // Split text into three parts
      const textBefore = textarea.value.substring(0, selectionStart);
      const textSelected = textarea.value.substring(selectionStart, selectionEnd);
      const textAfter = textarea.value.substring(selectionEnd);
      
      // Create spans for each part
      const beforeSpan = document.createElement('span');
      beforeSpan.textContent = textBefore;
      beforeSpan.style.color = 'transparent';
      
      const selectedSpan = document.createElement('span');
      selectedSpan.textContent = textSelected;
      selectedSpan.style.color = 'transparent';
      selectedSpan.style.background = 'rgba(99, 102, 241, 0.15)'; // Accent color with transparency
      selectedSpan.style.border = '1px solid rgb(99, 102, 241)'; // Thinner border
      selectedSpan.style.borderRadius = '6px';
      selectedSpan.style.boxShadow = '0 0 0 1px rgba(99, 102, 241, 0.3), 0 0 12px rgba(99, 102, 241, 0.4)';
      selectedSpan.style.animation = 'selection-pulse 1.5s ease-in-out infinite';
      
      const afterSpan = document.createElement('span');
      afterSpan.textContent = textAfter;
      afterSpan.style.color = 'transparent';
      
      mirror.appendChild(beforeSpan);
      mirror.appendChild(selectedSpan);
      mirror.appendChild(afterSpan);
      
      overlayRef.current.innerHTML = '';
      overlayRef.current.appendChild(mirror);
      
      // Apply scroll offset AFTER appending to DOM
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (mirror && textarea) {
          mirror.scrollTop = textarea.scrollTop;
          mirror.scrollLeft = textarea.scrollLeft;
        }
      });
    };

    // Update overlay on scroll
    const handleScroll = () => {
      if (mirror && textarea) {
        mirror.scrollTop = textarea.scrollTop;
        mirror.scrollLeft = textarea.scrollLeft;
      }
    };

    // Update overlay on resize (text reflows)
    const handleResize = () => {
      updateOverlay();
    };

    // Update overlay on input (content changes)
    const handleInput = () => {
      updateOverlay();
    };

    // Initial render
    updateOverlay();

    // Listen for scroll, resize, and input events
    textarea.addEventListener('scroll', handleScroll);
    textarea.addEventListener('input', handleInput);
    window.addEventListener('resize', handleResize);
    
    return () => {
      textarea.removeEventListener('scroll', handleScroll);
      textarea.removeEventListener('input', handleInput);
      window.removeEventListener('resize', handleResize);
      if (overlayRef.current) {
        overlayRef.current.innerHTML = '';
      }
    };
  }, [show, textarea, selectionStart, selectionEnd, color]);

  return (
    <div 
      ref={overlayRef} 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: 'none', 
        zIndex: 1, 
        width: '100%', 
        height: '100%',
        overflow: 'hidden'
      }} 
    />
  );
}

// Add animation styles
if (typeof document !== 'undefined' && !document.getElementById('selection-overlay-styles')) {
  const style = document.createElement('style');
  style.id = 'selection-overlay-styles';
  style.textContent = `
    @keyframes selection-pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }
  `;
  document.head.appendChild(style);
}
