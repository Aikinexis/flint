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
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const accentHueRef = useRef<string>('255');

  useEffect(() => {
    if (!show || !overlayRef.current || !textarea || selectionStart === selectionEnd) {
      if (overlayRef.current) {
        overlayRef.current.innerHTML = '';
      }
      mirrorRef.current = null;
      return;
    }

    const updateOverlay = () => {
      if (!overlayRef.current || !textarea) return;
      
      // Get current accent hue from CSS variable
      const rootStyles = getComputedStyle(document.documentElement);
      const currentAccentHue = rootStyles.getPropertyValue('--accent-hue').trim() || '255';
      accentHueRef.current = currentAccentHue;

      // Create a mirror div that exactly matches the textarea
      const mirror = document.createElement('div');
      mirrorRef.current = mirror;
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
      
      // Position mirror as a scrollable container
      mirror.style.position = 'absolute';
      mirror.style.top = '0';
      mirror.style.left = '0';
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.height = `${textarea.clientHeight}px`;
      mirror.style.overflow = 'auto';
      mirror.style.pointerEvents = 'none';
      mirror.style.zIndex = '1';
      mirror.style.willChange = 'scroll-position'; // Optimize scrolling performance
      
      // Hide scrollbars
      mirror.style.scrollbarWidth = 'none';
      (mirror.style as any).msOverflowStyle = 'none';
      
      // Prevent any scroll event propagation
      mirror.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
      mirror.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
      
      // Create inner content wrapper
      const content = document.createElement('div');
      content.style.minHeight = '100%';
      
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
      
      // Build primary color using current accent hue
      // Match the --primary definition from tokens.css: oklch(60% 0.12 var(--accent-hue) / 0.9)
      const primaryColor = `oklch(60% 0.12 ${accentHueRef.current} / 0.9)`;
      
      // Use theme colors with computed primary
      selectedSpan.style.background = `color-mix(in oklab, ${primaryColor} 15%, transparent)`;
      selectedSpan.style.border = `1px solid ${primaryColor}`;
      selectedSpan.style.borderRadius = '6px';
      selectedSpan.style.boxShadow = `0 0 0 1px color-mix(in oklab, ${primaryColor} 30%, transparent), 0 0 12px color-mix(in oklab, ${primaryColor} 40%, transparent)`;
      selectedSpan.style.animation = 'selection-pulse 1.5s ease-in-out infinite';
      
      const afterSpan = document.createElement('span');
      afterSpan.textContent = textAfter;
      afterSpan.style.color = 'transparent';
      
      content.appendChild(beforeSpan);
      content.appendChild(selectedSpan);
      content.appendChild(afterSpan);
      
      mirror.appendChild(content);
      
      overlayRef.current.innerHTML = '';
      overlayRef.current.appendChild(mirror);
      
      // Sync scroll position immediately
      handleScroll();
    };

    // Update overlay on scroll by syncing scrollTop
    const handleScroll = () => {
      if (mirrorRef.current && textarea) {
        mirrorRef.current.scrollTop = textarea.scrollTop;
        mirrorRef.current.scrollLeft = textarea.scrollLeft;
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
    
    // Listen for theme changes by observing CSS variable changes
    const themeObserver = new MutationObserver(() => {
      updateOverlay();
    });
    
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return () => {
      textarea.removeEventListener('scroll', handleScroll);
      textarea.removeEventListener('input', handleInput);
      window.removeEventListener('resize', handleResize);
      themeObserver.disconnect();
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

// Add animation and scrollbar hiding styles
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
    
    /* Hide scrollbar in mirror divs */
    div[style*="overflow: scroll"]::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);
}
