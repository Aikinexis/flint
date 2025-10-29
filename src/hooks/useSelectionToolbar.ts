import { useEffect, useRef, useState } from "react";
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  inline,
} from "@floating-ui/dom";

type Anchor = { x: number; y: number; text: string };

export function useSelectionToolbar(toolbarEl: React.RefObject<HTMLElement>) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>();

  function getSelectionRect(): DOMRect | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    const rects = Array.from(r.getClientRects()).filter(
      (rc) => rc.width && rc.height
    );
    return rects[rects.length - 1] ?? r.getBoundingClientRect(); // last line of the selection
  }

  function showForCurrentSelection() {
    const rect = getSelectionRect();
    const text = window.getSelection()?.toString().trim() || "";
    if (!rect || !text) {
      setAnchor(null);
      return;
    }
    setAnchor({ x: rect.right, y: rect.top, text });
  }

  // Recompute position with Floating UI
  useEffect(() => {
    const el = toolbarEl.current;
    if (!el || !anchor) return;

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

    el.style.position = "fixed"; // compute relative to viewport to avoid title offsets
    el.style.pointerEvents = "auto";
    el.style.zIndex = "2147483647";

    cleanupRef.current?.();
    cleanupRef.current = autoUpdate(
      virtualRef as any,
      el,
      async () => {
        const { x, y } = await computePosition(virtualRef as any, el, {
          placement: "top",
          strategy: "fixed",
          middleware: [
            inline(), // anchor to the actual inline line box
            offset(8), // 8px above
            flip(), // keep onscreen
            shift({ padding: 8 }),
          ],
        });
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        el.style.display = "flex";
      }
    );

    return () => cleanupRef.current?.();
  }, [anchor, toolbarEl]);

  // Show or hide based on user actions
  useEffect(() => {
    const onUp = () => requestAnimationFrame(showForCurrentSelection);
    const onKey = () => requestAnimationFrame(showForCurrentSelection);
    const onSel = () => {
      const s = window.getSelection();
      if (!s || !s.toString().trim()) setAnchor(null);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onKey);
    document.addEventListener("selectionchange", onSel);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("selectionchange", onSel);
    };
  }, []);

  return {
    anchor,
    clear: () => {
      if (toolbarEl.current) {
        toolbarEl.current.style.display = "none";
      }
      setAnchor(null);
    },
    refresh: showForCurrentSelection,
  };
}
