# Design Document

## Overview

This design document outlines the implementation approach for replacing Flint's horizontal tab navigation with a modern collapsible sidebar. The sidebar will be a fixed-position vertical navigation component that smoothly transitions between expanded (240px) and collapsed (72px) states while maintaining full integration with Flint's OKLCH design token system.

The design prioritizes minimal code changes to existing components, leveraging React hooks for state management and CSS transitions for smooth animations. All visual styling will use existing Flint design tokens to ensure seamless theme compatibility.

## Architecture

### Component Hierarchy

```
Panel (panel.tsx)
├── Sidebar (new component)
│   ├── Toggle Button
│   ├── Search Input
│   └── Navigation List
│       ├── Navigation Button (Home/Voice)
│       ├── Navigation Button (Projects/Rewrite)
│       ├── Navigation Button (Analytics/Summary)
│       └── Navigation Button (Settings)
└── Content Area
    ├── VoiceRecorder
    ├── RewritePanel
    ├── SummaryPanel
    └── Settings
```

### State Management

The sidebar will manage two pieces of state:

1. **Local UI State**: `isCollapsed` (boolean) - managed via React useState
2. **Persistent State**: Sidebar collapsed preference - stored in chrome.storage.local

State flow:
- Component mounts → Read from chrome.storage.local → Initialize isCollapsed
- User clicks toggle → Update isCollapsed → Persist to chrome.storage.local
- Parent Panel component maintains activeTab state (unchanged from current implementation)

### Layout Strategy

The Panel component will use CSS Flexbox with the following structure:

```css
.panel-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  flex-shrink: 0;
  width: 240px; /* or 72px when collapsed */
}

.content-area {
  flex: 1;
  overflow-y: auto;
}
```

This ensures the sidebar has fixed width while content area fills remaining space.

## Components and Interfaces

### Sidebar Component

**File**: `src/components/Sidebar.tsx`

**Props Interface**:
```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: NavigationItem[];
  activeItemId: string;
  onNavigate: (itemId: string) => void;
}
```

**Internal State**:
```typescript
const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
```

**Key Methods**:
- `toggleSidebar()`: Toggles collapsed state and persists to storage
- `handleNavigate(itemId: string)`: Calls parent onNavigate callback
- `loadSidebarState()`: Reads initial state from chrome.storage.local (useEffect)
- `saveSidebarState()`: Persists state changes to chrome.storage.local (useEffect)

**Component Structure**:
```tsx
<div className={`flint-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
  <button className="flint-icon-btn sidebar-toggle" onClick={toggleSidebar}>
    ☰
  </button>
  
  <div className="sidebar-content">
    <input 
      type="text" 
      className="flint-input sidebar-search" 
      placeholder="Search..." 
    />
    
    <nav className="sidebar-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={`flint-btn ${activeItemId === item.id ? 'active' : ''}`}
          onClick={() => handleNavigate(item.id)}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  </div>
</div>
```

### Panel Component Updates

**File**: `src/panel/panel.tsx`

**Changes Required**:
1. Import new Sidebar component
2. Replace horizontal toolbar with Sidebar + content area layout
3. Map navigation items to existing tab IDs
4. Pass activeTab and setActiveTab to Sidebar

**Updated Structure**:
```tsx
function Panel() {
  const [activeTab, setActiveTab] = useState<Tab>('voice');

  const navigationItems: NavigationItem[] = [
    { id: 'voice', label: 'Home', icon: '🏠' },
    { id: 'rewrite', label: 'Projects', icon: '📁' },
    { id: 'summary', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flint-bg flex h-screen">
      <Sidebar
        items={navigationItems}
        activeItemId={activeTab}
        onNavigate={(id) => setActiveTab(id as Tab)}
      />
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'voice' && <VoiceRecorder />}
        {activeTab === 'rewrite' && <RewritePanel />}
        {activeTab === 'summary' && <SummaryPanel />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
}
```

## Data Models

### Storage Schema

**Key**: `flint.sidebar.collapsed`

**Type**: `boolean`

**Default**: `false`

**Storage API Usage**:
```typescript
// Read
const { 'flint.sidebar.collapsed': isCollapsed } = 
  await chrome.storage.local.get({ 'flint.sidebar.collapsed': false });

// Write
await chrome.storage.local.set({ 'flint.sidebar.collapsed': true });
```

### Navigation Item Model

```typescript
interface NavigationItem {
  id: string;        // Unique identifier matching Tab type
  label: string;     // Display text (e.g., "Home", "Projects")
  icon: string;      // Emoji or icon character (e.g., "🏠", "📁")
}
```

## Styling Implementation

### CSS Structure

**File**: `src/styles/index.css` (append to existing file)

**Base Sidebar Styles**:
```css
.flint-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 240px;
  background: var(--surface);
  border-right: 1px solid var(--border-muted);
  box-shadow: var(--shadow-soft);
  transition: width 0.25s ease, background 0.25s ease;
  overflow: hidden;
  z-index: 999;
}

.flint-sidebar.collapsed {
  width: 72px;
}
```

**Toggle Button Styles**:
```css
.sidebar-toggle {
  border: none;
  background: transparent;
  color: var(--text);
  font-size: var(--fs-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--toolbar-height);
  transition: background 0.2s ease;
}

.sidebar-toggle:hover {
  background: var(--surface-2);
}
```

**Content Layout Styles**:
```css
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.sidebar-search {
  width: 100%;
  transition: opacity 0.2s ease, width 0.25s ease;
}

.flint-sidebar.collapsed .sidebar-search {
  opacity: 0;
  width: 0;
  pointer-events: none;
}
```

**Navigation Styles**:
```css
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-nav .flint-btn {
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  color: var(--text);
  transition: background 0.15s ease, color 0.15s ease;
}

.sidebar-nav .flint-btn:hover {
  background: var(--surface-2);
}

.sidebar-nav .flint-btn.active {
  background: var(--primary);
  border-color: color-mix(in oklab, var(--primary) 70%, black 30%);
  color: oklch(0.12 0 60);
}

.sidebar-nav .icon {
  font-size: 18px;
  width: 28px;
  text-align: center;
}

.flint-sidebar.collapsed .flint-btn span:not(.icon) {
  display: none;
}

.flint-sidebar.collapsed .flint-btn {
  justify-content: center;
  padding: 10px 0;
}
```

### Design Token Usage

All styles leverage existing Flint tokens:

- **Colors**: `--surface`, `--surface-2`, `--text`, `--text-muted`, `--primary`, `--border-muted`
- **Spacing**: `--toolbar-height`, `--btn-height`, `--radius-md`
- **Shadows**: `--shadow-soft`, `--shadow-focus`
- **Typography**: `--fs-lg`, `--fs-sm`, `--font-sans`

This ensures automatic theme compatibility without additional CSS.

## Error Handling

### Storage Access Errors

**Scenario**: chrome.storage.local is unavailable or quota exceeded

**Handling**:
```typescript
try {
  await chrome.storage.local.set({ 'flint.sidebar.collapsed': isCollapsed });
} catch (error) {
  console.warn('Failed to persist sidebar state:', error);
  // Continue with in-memory state only
}
```

**User Impact**: Sidebar state won't persist across sessions but remains functional

### Invalid Storage Data

**Scenario**: Corrupted or unexpected data type in storage

**Handling**:
```typescript
const result = await chrome.storage.local.get({ 'flint.sidebar.collapsed': false });
const isCollapsed = typeof result['flint.sidebar.collapsed'] === 'boolean' 
  ? result['flint.sidebar.collapsed'] 
  : false;
```

**User Impact**: Falls back to default expanded state

### Missing Navigation Items

**Scenario**: Empty or undefined items array passed to Sidebar

**Handling**:
```typescript
if (!items || items.length === 0) {
  console.error('Sidebar requires at least one navigation item');
  return null;
}
```

**User Impact**: Sidebar doesn't render, preventing broken UI

## Testing Strategy

### Unit Testing

**Component**: Sidebar.tsx

**Test Cases**:
1. Renders with correct initial state (expanded by default)
2. Toggles collapsed state when toggle button clicked
3. Calls onNavigate callback with correct item ID when navigation button clicked
4. Applies 'active' class to button matching activeItemId prop
5. Hides text labels when in collapsed state
6. Shows text labels when in expanded state
7. Persists state to chrome.storage.local on toggle
8. Loads initial state from chrome.storage.local on mount

**Mocking Strategy**:
```typescript
// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ 'flint.sidebar.collapsed': false }),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
};
```

### Integration Testing

**Component**: Panel.tsx with Sidebar

**Test Cases**:
1. Renders Sidebar with correct navigation items
2. Switches content area when navigation item clicked
3. Maintains active state synchronization between Sidebar and content
4. Preserves sidebar collapsed state when switching between views

### Visual Regression Testing

**Scenarios**:
1. Sidebar in expanded state (light theme)
2. Sidebar in collapsed state (light theme)
3. Sidebar in expanded state (dark theme)
4. Sidebar in collapsed state (dark theme)
5. Sidebar transition animation (expanded → collapsed)
6. Active navigation item highlighting
7. Hover states on navigation buttons

**Tool**: Playwright with screenshot comparison

### Accessibility Testing

**Checks**:
1. Keyboard navigation through all interactive elements
2. Focus indicators visible on all focusable elements
3. Screen reader announces toggle button label
4. Screen reader announces navigation button labels
5. Color contrast ratios meet WCAG AA standards (4.5:1 for text)

**Tool**: Playwright with axe-core integration

## Implementation Notes

### Transition Performance

CSS transitions target only `width`, `background`, and `opacity` properties to ensure smooth 60fps animations. Avoid transitioning `height` or `transform` on the sidebar container as this can cause layout thrashing.

### Z-Index Management

Sidebar uses `z-index: 999` to ensure it appears above content but below any modal overlays (which should use `z-index: 1000+`).

### Overflow Handling

The sidebar uses `overflow: hidden` to clip content during width transitions. The search input and navigation list are contained within `.sidebar-content` which handles internal scrolling if needed.

### Icon Selection

Using emoji icons (🏠, 📁, 📊, ⚙️) provides zero-dependency visual indicators that work across all platforms. Future enhancement could replace these with SVG icons for more design control.

### Search Input Placeholder

The search input is included in the design for future functionality but is non-functional in this implementation. It serves as a visual placeholder for potential future search features.

## Migration Path

### Phase 1: Component Creation
1. Create `src/components/Sidebar.tsx`
2. Add sidebar styles to `src/styles/index.css`
3. Verify TypeScript compilation

### Phase 2: Panel Integration
1. Update `src/panel/panel.tsx` to import Sidebar
2. Replace toolbar with Sidebar + content layout
3. Map navigation items to existing tabs
4. Test in Chrome as unpacked extension

### Phase 3: Storage Integration
1. Implement chrome.storage.local persistence
2. Add error handling for storage operations
3. Test state persistence across browser restarts

### Phase 4: Polish
1. Verify transitions in both light and dark themes
2. Test keyboard navigation and focus management
3. Validate accessibility with screen reader
4. Confirm bundle size remains under 1MB

## Design Decisions and Rationales

### Decision: Fixed 240px/72px Widths

**Rationale**: Fixed widths provide predictable layout behavior and simplify CSS transitions. These dimensions are industry-standard (used by Linear, Notion, Figma) and provide good balance between content visibility and navigation usability.

### Decision: Emoji Icons Instead of SVG

**Rationale**: Emoji icons require zero additional dependencies, work across all platforms, and automatically adapt to system font rendering. This keeps bundle size minimal and reduces maintenance overhead.

### Decision: Single Toggle Button Instead of Hover-to-Expand

**Rationale**: Explicit toggle provides better user control and avoids accidental expansions during mouse movement. This pattern is more predictable and accessible for keyboard users.

### Decision: Persist State to chrome.storage.local

**Rationale**: Users expect UI preferences to persist across sessions. chrome.storage.local provides reliable persistence without requiring external dependencies or network calls, aligning with Flint's local-first architecture.

### Decision: Map Navigation Labels to Different Names

**Rationale**: "Home", "Projects", "Analytics" provide more intuitive navigation labels than "Voice", "Rewrite", "Summary" while maintaining backward compatibility with existing component structure. This improves discoverability without requiring component refactoring.
