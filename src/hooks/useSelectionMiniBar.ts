import { useEffect, useRef, useState } from 'react';

type Anchor = { x: number; y: number; text: string };

export function useSelectionMiniBar(containerRef: React.RefObject<HTMLElement>) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const hideTimer = useRef<number | null>(null);

  function hide() {
    setAnchor(null);
  }

  function placeFromSelection() {
    const el = containerRef.current;
    if (!el) return hide();
    const sel = window.getSelection();
    const text = sel?.toString().trim() || '';
    if (!sel || !text || sel.rangeCount === 0 || text.length < 3) return hide();

    const range = sel.getRangeAt(0);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width && r.height);
    const r = rects[rects.length - 1] ?? range.getBoundingClientRect();

    // position relative to the container (inside your panel)
    const c = el.getBoundingClientRect();
    const x = r.right - c.left + el.scrollLeft;
    const y = r.top - c.top + el.scrollTop - 10; // 10px above

    if (r.width === 0 && r.height === 0) return hide(); // collapsed selection
    setAnchor({ x, y, text });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onUp = () => placeFromSelection();
    const onSel = () => {
      const s = window.getSelection();
      if (!s || !s.toString().trim()) hide();
    };
    const onScroll = () => anchor && placeFromSelection();

    el.addEventListener('mouseup', onUp);
    el.addEventListener('keyup', onUp);
    document.addEventListener('selectionchange', onSel);
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => anchor && placeFromSelection());
    ro.observe(el);

    return () => {
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('keyup', onUp);
      document.removeEventListener('selectionchange', onSel);
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [containerRef, anchor]);

  // optional auto-hide after inactivity
  useEffect(() => {
    if (!anchor) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setAnchor(null), 15000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [anchor]);

  return { anchor, hide, refresh: placeFromSelection };
}
