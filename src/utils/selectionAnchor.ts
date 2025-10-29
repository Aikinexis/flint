/**
 * Get the bounding rectangle for the current text selection
 * Returns viewport coordinates suitable for fixed positioning
 */
export function getSelectionAnchor(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const r = sel.getRangeAt(0);
  // Prefer last visual line of the selection
  const rects = Array.from(r.getClientRects()).filter((rc) => rc.width && rc.height);
  if (rects.length) return rects[rects.length - 1] || null;

  // Fallback: place a zero-width marker at range end and measure it
  const marker = document.createElement('span');
  marker.style.cssText = 'position:relative; display:inline-block; width:0; height:1em;';
  const clone = r.cloneRange();
  clone.collapse(false); // end of selection
  clone.insertNode(marker);
  const mrect = marker.getBoundingClientRect();
  marker.remove();
  return mrect;
}
