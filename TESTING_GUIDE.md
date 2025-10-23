# Collapsible Sidebar Testing Guide

## Prerequisites
✅ Build completed successfully
✅ Extension files ready in `dist/` directory

## Step 1: Load Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `dist` folder from this project
6. Verify extension appears with name "Flint" and version "1.0.0"

## Step 2: Open Side Panel

1. Click the Flint extension icon in Chrome toolbar (puzzle piece icon → Flint)
2. Or right-click the extension icon and select "Open side panel"
3. Side panel should open on the right side of the browser

## Step 3: Verify Sidebar Renders Correctly

**Expected behavior:**
- ✅ Sidebar appears on the left edge of the panel
- ✅ Sidebar width is 240px (expanded state)
- ✅ Toggle button (☰) visible at the top
- ✅ Search input field visible below toggle button
- ✅ Four navigation items visible with icons and labels:
  - 🏠 Home
  - 📁 Projects
  - 📊 Analytics
  - ⚙️ Settings
- ✅ "Home" item is highlighted (active state)
- ✅ Sidebar has subtle border and shadow

**Requirements tested:** 1.1, 2.2, 5.1

## Step 4: Test Toggle Button (Collapse)

1. Click the toggle button (☰) at the top of the sidebar
2. **Expected behavior:**
   - ✅ Sidebar smoothly animates to 72px width
   - ✅ Animation completes within 250ms
   - ✅ Search input fades out (opacity 0)
   - ✅ Text labels disappear, only icons remain
   - ✅ Icons are centered in the 72px width
   - ✅ Navigation items remain clickable

**Requirements tested:** 1.2, 1.3, 2.3, 4.1

## Step 5: Test Toggle Button (Expand)

1. Click the toggle button (☰) again
2. **Expected behavior:**
   - ✅ Sidebar smoothly animates back to 240px width
   - ✅ Animation completes within 250ms
   - ✅ Search input fades in
   - ✅ Text labels reappear next to icons
   - ✅ Layout returns to original state

**Requirements tested:** 1.4, 4.1

## Step 6: Test Navigation Switching

### Test Home → Projects
1. Ensure sidebar is expanded
2. Click "Projects" (📁) navigation item
3. **Expected behavior:**
   - ✅ Projects item becomes highlighted (primary color background)
   - ✅ Home item loses highlight
   - ✅ Content area switches to Rewrite Panel
   - ✅ Transition is smooth

### Test Projects → Analytics
1. Click "Analytics" (📊) navigation item
2. **Expected behavior:**
   - ✅ Analytics item becomes highlighted
   - ✅ Projects item loses highlight
   - ✅ Content area switches to Summary Panel

### Test Analytics → Settings
1. Click "Settings" (⚙️) navigation item
2. **Expected behavior:**
   - ✅ Settings item becomes highlighted
   - ✅ Analytics item loses highlight
   - ✅ Content area switches to Settings Panel

### Test Settings → Home
1. Click "Home" (🏠) navigation item
2. **Expected behavior:**
   - ✅ Home item becomes highlighted
   - ✅ Settings item loses highlight
   - ✅ Content area switches to Voice Recorder

**Requirements tested:** 2.5, 5.2, 5.3, 5.4, 5.5

## Step 7: Test Navigation in Collapsed State

1. Collapse the sidebar (click toggle button)
2. Click each navigation icon (without labels)
3. **Expected behavior:**
   - ✅ Navigation still works correctly
   - ✅ Active state indicator remains visible
   - ✅ Content area switches appropriately
   - ✅ Icons remain clickable and responsive

**Requirements tested:** 5.5

## Step 8: Test Hover States

### Expanded State
1. Expand sidebar if collapsed
2. Hover over toggle button
3. **Expected behavior:**
   - ✅ Background changes to var(--surface-2)
   - ✅ Transition completes within 200ms

4. Hover over each navigation item
5. **Expected behavior:**
   - ✅ Background changes to var(--surface-2)
   - ✅ Transition completes within 150ms
   - ✅ Active item maintains primary color background

### Collapsed State
1. Collapse sidebar
2. Hover over navigation icons
3. **Expected behavior:**
   - ✅ Hover effects still work
   - ✅ Icons respond to hover

**Requirements tested:** 4.3, 4.4

## Step 9: Test State Persistence

1. Set sidebar to collapsed state (click toggle button)
2. Close the side panel completely
3. Reopen the side panel
4. **Expected behavior:**
   - ✅ Sidebar opens in collapsed state (72px width)
   - ✅ State was persisted to chrome.storage.local

5. Expand the sidebar (click toggle button)
6. Close the side panel
7. Reopen the side panel
8. **Expected behavior:**
   - ✅ Sidebar opens in expanded state (240px width)
   - ✅ State was persisted correctly

9. Close Chrome browser completely
10. Reopen Chrome and open side panel
11. **Expected behavior:**
    - ✅ Sidebar state persists across browser restarts

**Requirements tested:** 1.5, 7.3

## Step 10: Test Light Theme

1. Open Chrome Settings → Appearance
2. Set theme to "Light"
3. Open Flint side panel
4. **Expected behavior:**
   - ✅ Sidebar uses light theme colors
   - ✅ Text is readable (good contrast)
   - ✅ Borders and shadows are visible
   - ✅ Active state is clearly visible
   - ✅ Hover states work correctly
   - ✅ All transitions are smooth

**Requirements tested:** 4.5

## Step 11: Test Dark Theme

1. Open Chrome Settings → Appearance
2. Set theme to "Dark"
3. Open Flint side panel
4. **Expected behavior:**
   - ✅ Sidebar uses dark theme colors
   - ✅ Text is readable (good contrast)
   - ✅ Borders and shadows are visible
   - ✅ Active state is clearly visible
   - ✅ Hover states work correctly
   - ✅ All transitions are smooth

**Requirements tested:** 4.5

## Step 12: Test Keyboard Navigation

1. Open side panel
2. Press Tab key repeatedly
3. **Expected behavior:**
   - ✅ Focus moves to toggle button first
   - ✅ Focus ring visible (var(--shadow-focus))
   - ✅ Focus moves to search input
   - ✅ Focus moves through navigation items in order
   - ✅ All interactive elements are reachable

4. Press Shift+Tab to navigate backwards
5. **Expected behavior:**
   - ✅ Focus moves in reverse order
   - ✅ Focus rings remain visible

6. Focus on toggle button and press Enter
7. **Expected behavior:**
   - ✅ Sidebar toggles collapsed/expanded

8. Focus on navigation item and press Enter
9. **Expected behavior:**
   - ✅ Navigation switches to that view

**Requirements tested:** 6.1, 6.2, 6.3, 6.4, 6.5

## Troubleshooting

### Sidebar doesn't appear
- Check browser console for errors (F12)
- Verify build completed successfully
- Reload extension in chrome://extensions/

### Styles look wrong
- Check if design tokens are loaded
- Verify src/styles/index.css is included
- Check for CSS conflicts in browser DevTools

### State doesn't persist
- Check chrome.storage.local permissions in manifest
- Open DevTools → Application → Storage → Extension Storage
- Verify 'flint.sidebar.collapsed' key exists

### Navigation doesn't work
- Check browser console for errors
- Verify Panel component is passing correct props
- Check activeTab state in React DevTools

## Success Criteria

All checkboxes above should be ✅ for the task to be complete.

**Core functionality:**
- Sidebar renders correctly in both states
- Toggle animation is smooth (250ms)
- Navigation switching works for all views
- Active state highlighting is correct
- State persists across sessions
- Works in both light and dark themes
- Keyboard navigation is fully functional

**Requirements coverage:**
- 1.1, 1.2, 1.3, 1.4, 1.5 ✅
- 2.5 ✅
- 4.5 ✅
- 5.2, 5.5 ✅
