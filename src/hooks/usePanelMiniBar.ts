import { useEffect, useState, useCallback } from 'react';
import { computePosition, offset, flip, shift, inline } from '@floating-ui/dom';

type Anchor = { x: number; y: number; text: string };

/**
 * Hook for positioning a toolbar near text selections within a panel.
 * Uses Floating UI for accurate positioning that handles scrolling, resizing, and multi-line selections.
 *
 * @param toolbarEl - Ref to the toolbar element to position
 * @returns Object with anchor state, clear function, and refresh function
 */
export function usePanelMiniBar(toolbarEl: React.RefObject<HTMLElement>) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const getSelectionRect = useCallback((): DOMRect | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    const rects = Array.from(r.getClientRects()).filter((rc) => rc.width && rc.height);
    return rects[rects.length - 1] ?? r.getBoundingClientRect(); // last line of the selection
  }, []);

  const showForCurrentSelection = useCallback(() => {
    const rect = getSelectionRect();
    const text = window.getSelection()?.toString().trim() || '';
    if (!rect || !text || text.length < 3) {
      setAnchor(null);
      return;
    }
    setAnchor({ x: rect.right, y: rect.top, text });
  }, [getSelectionRect]);

  const clear = useCallback(() => {
    const el = toolbarEl.current;
    if (el) {
      el.style.display = 'none';
      el.style.pointerEvents = 'auto'; // Ensure pointer events are always enabled
    }
    setAnchor(null);
  }, [toolbarEl]);

  // Recompute position with Floating UI
  useEffect(() => {
    const el = toolbarEl.current;
    if (!el || !anchor) {
      if (el) {
        el.style.display = 'none';
      }
      return;
    }

    // Virtual element that represents the selection
    const virtualRef = {
      getBoundingClientRect: () => {
        const rect = getSelectionRect();
        return rect ?? new DOMRect(anchor.x, anchor.y, 0, 0);
      },
      // Add getClientRects for inline middleware compatibility
      getClientRects: () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return [];
        const r = sel.getRangeAt(0);
        return r.getClientRects();
      },
    };

    // Function to update position
    const updatePosition = async () => {
      if (!el) return;

      try {
        const { x, y } = await computePosition(virtualRef as any, el, {
          placement: 'top',
          strategy: 'fixed',
          middleware: [
            inline(), // anchor to the actual inline line box
            offset(8), // 8px above
            flip(), // keep onscreen
            shift({ padding: 8 }),
          ],
        });

        // Set styles
        el.style.position = 'fixed';
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        el.style.display = 'flex';
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '2147483647';
      } catch (error) {
        console.error('[usePanelMiniBar] Position update error:', error);
      }
    };

    // Initial position
    updatePosition();

    // Update on scroll/resize (but not continuously)
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [anchor, toolbarEl, getSelectionRect]);

  // Show or hide based on user actions
  useEffect(() => {
    const onUp = () => requestAnimationFrame(showForCurrentSelection);
    const onKey = () => requestAnimationFrame(showForCurrentSelection);
    const onSel = () => {
      const s = window.getSelection();
      if (!s || !s.toString().trim()) {
        setAnchor(null);
      }
    };

    document.addEventListener('mouseup', onUp, { passive: true });
    document.addEventListener('keyup', onKey, { passive: true });
    document.addEventListener('selectionchange', onSel, { passive: true });

    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('selectionchange', onSel);
    };
  }, [showForCurrentSelection]);

  return {
    anchor,
    clear,
    refresh: showForCurrentSelection,
  };
}
