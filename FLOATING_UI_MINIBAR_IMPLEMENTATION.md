# Floating UI MiniBar Implementation

## Overview

Replaced manual coordinate calculation with Floating UI library to fix the "stuck in title bar" positioning issue and provide robust, automatic positioning for the selection mini bar.

## Problem

The previous implementation used manual coordinate conversion between viewport and container space, which caused the mini bar to appear in the wrong location (stuck in the title area) because:

1. Selection rectangles are in viewport space
2. The mini bar was positioned inside a container with offsets
3. Manual coordinate conversion didn't account for all edge cases

## Solution

Implemented Floating UI with React portals and virtual element approach:

- **React Portal**: Renders mini bar at `document.body` level to bypass containing block issues
- **Virtual Element**: Represents the selection's bounding rectangle
- **Fixed Positioning**: Positions relative to viewport in true screen coordinates
- **Auto Update**: Automatically repositions on scroll, resize, and content changes
- **Middleware Stack**:
  - `inline()`: Anchors to the actual inline line box (handles multi-line selections)
  - `offset(8)`: Positions 8px above the selection
  - `flip()`: Flips to below if no room above
  - `shift({padding: 8})`: Keeps onscreen with 8px padding

## Changes Made

### 1. Installed Dependency

```bash
npm install @floating-ui/dom
```

### 2. Created New Hook: `useSelectionToolbar.ts`

Generic hook for positioning toolbars near selections using Floating UI. Can be used for any selection-based toolbar.

**Key Features:**
- Virtual element tied to selection geometry
- Fixed positioning strategy
- Auto-update on scroll/resize
- Event listeners for mouseup, keyup, selectionchange

### 3. Updated `usePanelMiniBar.ts`

Replaced manual coordinate calculation with Floating UI implementation:

**Before:**
```typescript
// Manual viewport → container coordinate conversion
const c = el.getBoundingClientRect();
const x = line.right - c.left + el.scrollLeft;
const y = line.top - c.top + el.scrollTop - 12;
```

**After:**
```typescript
// Floating UI with virtual element
const virtualRef = {
  getBoundingClientRect: () => getSelectionRect() ?? new DOMRect(anchor.x, anchor.y, 0, 0)
};

await computePosition(virtualRef, el, {
  placement: "top",
  strategy: "fixed",
  middleware: [inline(), offset(8), flip(), shift({padding: 8})]
});
```

### 4. Updated `MiniBar.tsx`

- **Added React Portal**: Uses `createPortal(ui, document.body)` to render at body level
- Added `toolbarRef` prop to receive ref from parent
- Changed to `position: fixed` with `display: none` (set to `flex` by hook)
- Updated styling to match design system tokens
- Removed `title` attributes (use aria-label only)
- Uses `onPointerDown` instead of `onClick` for better focus handling

### 5. Updated Parent Components

**RewritePanel.tsx:**
- Created `miniBarRef` ref
- Passed ref to both `usePanelMiniBar` hook and `MiniBar` component

**SummaryPanel.tsx:**
- Same updates as RewritePanel

### 6. Updated CarouselMiniBar.tsx

Replaced manual positioning with Floating UI:
- Uses `autoUpdate` to track textarea position
- Positions relative to textarea bounding box (not selection, since textareas don't expose selection geometry)
- Applies same middleware stack: offset, flip, shift
- Removed manual viewport boundary calculations

### 7. Removed Unused Components

**PanelMiniBar.tsx:**
- Deleted - was not being used anywhere
- Functionality replaced by MiniBar + usePanelMiniBar hook

## Benefits

1. **Accurate Positioning**: No more "stuck in title bar" issue
2. **Automatic Updates**: Handles scroll, resize, transforms automatically
3. **Multi-line Support**: Correctly anchors to last line of selection
4. **Edge Case Handling**: Flip and shift middleware keep toolbar onscreen
5. **Maintainable**: Less custom positioning logic to maintain
6. **Battle-tested**: Floating UI is used by major libraries (Radix, Mantine, etc.)

## Testing

Created `test-floating-minibar.html` with test cases:

1. Regular paragraph selection
2. Multi-line selection
3. Textarea selection
4. Edge cases (viewport boundaries)

**To Test:**
1. Load extension in Chrome
2. Open side panel
3. Navigate to Rewrite or Summary tab
4. Select text in textareas or content areas
5. Verify mini bar appears correctly positioned
6. Test scrolling, resizing, multi-line selections

## Technical Details

### Virtual Element Pattern

Floating UI supports "virtual elements" - objects that implement `getBoundingClientRect()` but aren't actual DOM elements. This is perfect for selections because:

- Selection geometry comes from `Range.getClientRects()`
- We don't need to create a DOM element to represent the selection
- The virtual element updates dynamically as the selection changes

### Middleware Order

The middleware order matters:

1. `inline()`: Must be first to get accurate line box positioning
2. `offset()`: Applies spacing after inline positioning
3. `flip()`: Checks if there's room and flips if needed
4. `shift()`: Final adjustment to stay within viewport bounds

### Auto Update

`autoUpdate()` sets up observers for:
- Scroll events
- Resize events
- DOM mutations
- Animation frames

Returns a cleanup function that disconnects all observers.

## References

- [Floating UI Documentation](https://floating-ui.com/)
- [Virtual Elements Guide](https://floating-ui.com/docs/virtual-elements)
- [MDN: Range.getClientRects()](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [Popper.js Virtual Elements](https://popper.js.org/docs/v2/virtual-elements/)

## Future Improvements

1. Consider adding `hide()` middleware to hide toolbar when reference is clipped
2. Add `arrow()` middleware for visual pointer to selection
3. Implement keyboard navigation for toolbar buttons
4. Add animation/transition when toolbar appears/moves
