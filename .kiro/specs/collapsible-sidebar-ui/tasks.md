# Implementation Plan

- [x] 1. Create Sidebar component with base structure
  - Create `src/components/Sidebar.tsx` with TypeScript interfaces for NavigationItem and SidebarProps
  - Implement functional component with useState hook for isCollapsed state (default: false)
  - Add JSX structure with toggle button, search input, and navigation list
  - Export Sidebar component as named export
  - _Requirements: 1.1, 7.1, 7.2_

- [x] 2. Implement sidebar styling with Flint design tokens
  - Add `.flint-sidebar` base styles to `src/styles/index.css` with fixed positioning and 240px width
  - Add `.flint-sidebar.collapsed` styles with 72px width
  - Implement CSS transitions for width (250ms ease) and background (250ms ease)
  - Style `.sidebar-toggle` button with transparent background and hover state using var(--surface-2)
  - Style `.sidebar-content` with flexbox column layout and 16px gap
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_

- [x] 3. Style navigation buttons and collapsed state behavior
  - Add `.sidebar-nav` styles with vertical flexbox and 8px gap
  - Style `.sidebar-nav .flint-btn` with left-aligned content, 12px gap, and transparent background
  - Implement hover state with var(--surface-2) background (150ms transition)
  - Add `.active` class styles with var(--primary) background and dark text color
  - Implement collapsed state styles that hide text labels and center icons
  - Style `.sidebar-search` with fade-out transition when collapsed (opacity 0, 200ms)
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.4, 4.3, 4.4_

- [x] 4. Implement toggle functionality and state management
  - Create `toggleSidebar` function that updates isCollapsed state
  - Wire toggle button onClick handler to call toggleSidebar
  - Apply conditional className to sidebar div based on isCollapsed state
  - Verify toggle animation works smoothly in browser
  - _Requirements: 1.2, 1.3, 1.4, 7.2_

- [x] 5. Implement navigation item rendering and click handling
  - Create `handleNavigate` function that calls onNavigate prop with item id
  - Map over items prop to render navigation buttons with key, icon, and label
  - Apply conditional 'active' className when item.id matches activeItemId prop
  - Wire button onClick handlers to call handleNavigate with item.id
  - Verify navigation switching works correctly
  - _Requirements: 2.5, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Add chrome.storage.local persistence
  - Create `loadSidebarState` function that reads 'flint.sidebar.collapsed' from chrome.storage.local
  - Add useEffect hook on mount to call loadSidebarState and update isCollapsed state
  - Create `saveSidebarState` function that writes isCollapsed to chrome.storage.local
  - Add useEffect hook with isCollapsed dependency to call saveSidebarState on changes
  - Add try-catch error handling for storage operations with console.warn fallback
  - _Requirements: 1.5, 7.3_

- [x] 7. Update Panel component to integrate Sidebar
  - Import Sidebar component in `src/panel/panel.tsx`
  - Define navigationItems array with id, label, and icon for all four views
  - Replace existing toolbar div with flex container layout
  - Add Sidebar component with items, activeItemId, and onNavigate props
  - Wrap content area in flex-1 div with overflow-y-auto
  - Remove old toolbar and button-group markup
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Add accessibility attributes and keyboard support
  - Add aria-label="Toggle sidebar" to toggle button
  - Ensure all navigation buttons are keyboard focusable (native button elements)
  - Verify focus-visible styles apply using var(--shadow-focus) from tokens.css
  - Test Tab/Shift+Tab navigation through all interactive elements
  - Test Enter/Space key activation for toggle and navigation buttons
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Verify TypeScript compilation and bundle size
  - Run `npm run build` to compile TypeScript and bundle code
  - Check for zero TypeScript errors in strict mode
  - Verify bundle size remains under 1MB compressed
  - Fix any type errors or linting warnings
  - _Requirements: 7.1, 7.4, 7.5_

- [x] 10. Test in Chrome browser as unpacked extension
  - Load extension as unpacked in Chrome from dist directory
  - Open side panel and verify sidebar renders correctly
  - Test toggle button collapses and expands sidebar smoothly
  - Test navigation switching between all four views (Voice, Rewrite, Summary, Settings)
  - Verify active state highlighting works correctly
  - Test state persistence by closing and reopening browser
  - Test in both light and dark themes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5, 4.5, 5.2, 5.5_
