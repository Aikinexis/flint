# Design Document

## Overview

The unified editor workflow transforms Flint from a multi-panel tool into a cohesive document editor with inline AI capabilities. Users work in a single persistent editor, apply AI operations that replace text in-place, manage multiple projects, and track version history through a collapsible panel. This design leverages existing components and services, minimizing code changes while dramatically improving the user experience.

## Architecture

### High-Level Component Structure

```
Panel (existing)
├── Sidebar (existing - modified)
│   ├── Projects Button (new)
│   ├── History Toggle (new)
│   ├── Generate Tab (existing)
│   ├── Rewrite Tab (existing)
│   ├── Summarize Tab (existing)
│   └── Settings Tab (existing - unchanged)
│
├── Main Content Area (modified)
│   ├── Unified Editor Component (new)
│   │   ├── Shared Textarea (new)
│   │   └── Tool Controls (existing - repositioned)
│   │       ├── Generate Controls (existing)
│   │       ├── Rewrite Controls (existing)
│   │       └── Summarize Controls (existing - simplified)
│   │
│   └── Mini Bar (existing - behavior modified)
│
├── History Panel (new)
│   ├── Toggle Button (new)
│   └── Snapshot List (new)
│
└── Project Manager Modal (new)
    ├── Project Grid (new)
    └── Project Cards (new)
```

### Data Flow

```
User Action → Unified Editor → AI Service (existing) → Inline Replacement → Snapshot Creation → History Panel Update
                                                                                                    ↓
                                                                                            IndexedDB Storage
```

## Components and Interfaces

### 1. Unified Editor Component

**Purpose:** Single shared textarea that persists across all tool tabs

**Props:**
```typescript
interface UnifiedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  activeTool: 'generate' | 'rewrite' | 'summarize';
  onSelectionChange: (selection: SelectionRange) => void;
}
```

**Implementation Notes:**
- Reuse existing textarea styling from current panels
- Maintain selection state in component state
- Emit selection changes for Mini Bar positioning
- Support standard keyboard shortcuts (Ctrl+Z, Ctrl+C, etc.)

### 2. Tool Controls Container

**Purpose:** Display tool-specific options below the editor

**Props:**
```typescript
interface ToolControlsProps {
  activeTool: 'generate' | 'rewrite' | 'summarize';
  onExecute: (options: ToolOptions) => Promise<void>;
}
```

**Implementation Notes:**
- Reuse existing Generate, Rewrite, Summarize control components
- Simplify Summary controls to match Generate/Rewrite layout
- No changes to existing control functionality
- Controls change based on active tab

### 3. History Panel Component

**Purpose:** Collapsible panel displaying version snapshots

**Props:**
```typescript
interface HistoryPanelProps {
  projectId: string;
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  onSnapshotSelect: (snapshotId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

**State:**
```typescript
interface Snapshot {
  id: string;
  projectId: string;
  content: string;
  actionType: 'generate' | 'rewrite' | 'summarize';
  actionDescription: string;
  timestamp: number;
  selectionRange?: { start: number; end: number };
}
```

**Implementation Notes:**
- Slides in/out from left side of sidebar
- Dark background (#1a1a1a) matching mockup
- Scrollable list of snapshot cards
- Toggle button on sidebar (‹/› arrows)
- Limit to 50 most recent snapshots per project

### 4. Project Manager Component

**Purpose:** Modal for managing multiple writing projects

**Props:**
```typescript
interface ProjectManagerProps {
  projects: Project[];
  onProjectSelect: (projectId: string) => void;
  onProjectCreate: () => void;
  onProjectDelete: (projectId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}
```

**State:**
```typescript
interface Project {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  snapshots: Snapshot[];
}
```

**Implementation Notes:**
- Full-screen modal overlay
- Grid layout with project cards
- "New Project" card for creation
- Auto-save current project before switching
- Store projects in IndexedDB

### 5. Inline Replacement Logic

**Purpose:** Replace selected text with AI results

**Function Signature:**
```typescript
async function replaceTextInline(
  textarea: HTMLTextAreaElement,
  newText: string,
  selectionStart: number,
  selectionEnd: number
): Promise<void>
```

**Implementation:**
1. Get current textarea value
2. Create snapshot with current content
3. Replace text between selectionStart and selectionEnd
4. Update textarea value
5. Set new selection to highlight replaced text
6. Trigger input event for React state update
7. Add visual feedback (brief highlight animation)

## Data Models

### Storage Schema

**IndexedDB Database:** `flint-storage`

**Object Stores:**

1. **projects** (existing store - modified)
   - Key: `id` (string)
   - Indexes: `updatedAt` (for sorting)
   - Fields: `id`, `title`, `content`, `createdAt`, `updatedAt`

2. **snapshots** (new store)
   - Key: `id` (string)
   - Indexes: `projectId`, `timestamp`
   - Fields: `id`, `projectId`, `content`, `actionType`, `actionDescription`, `timestamp`, `selectionRange`

3. **pinnedNotes** (existing - unchanged)

4. **history** (existing - deprecated, migrate to snapshots)

### State Management

**App State Updates:**
```typescript
interface AppState {
  // Existing state
  activeTab: string;
  settings: Settings;
  pinnedNotes: PinnedNote[];
  aiAvailability: AIAvailability;
  
  // New state
  currentProject: Project | null;
  projects: Project[];
  currentSnapshot: Snapshot | null;
  snapshots: Snapshot[];
  isHistoryPanelOpen: boolean;
  isProjectManagerOpen: boolean;
}
```

## Error Handling

### Inline Replacement Errors

1. **AI Operation Fails:**
   - Show error message in toast notification
   - Do not create snapshot
   - Keep original text unchanged

2. **Storage Quota Exceeded:**
   - Delete oldest snapshots (beyond 50 limit)
   - Retry save operation
   - Show warning if still failing

3. **Project Load Fails:**
   - Show error message
   - Fall back to empty project
   - Log error for debugging

## Testing Strategy

### Unit Tests (Optional - only if requested)
- Test inline replacement logic
- Test snapshot creation
- Test project CRUD operations
- Test history panel filtering

### Integration Tests (Optional - only if requested)
- Test full workflow: edit → AI operation → inline replace → snapshot creation
- Test project switching with content preservation
- Test history panel snapshot restoration

### Manual Testing Checklist
1. Create new project and verify it saves
2. Switch between projects and verify content persists
3. Perform AI operation and verify inline replacement
4. Check snapshot appears in history panel
5. Click snapshot and verify content restores
6. Toggle history panel and verify smooth animation
7. Test with existing projects (migration)
8. Verify Settings tab remains unchanged
9. Test Mini Bar with inline replacement
10. Verify accessibility (keyboard navigation, screen reader)

## Migration Strategy

### Phase 1: Add New Components (No Breaking Changes)
- Create Unified Editor component
- Create History Panel component
- Create Project Manager component
- Add new storage methods for projects and snapshots
- Keep existing panels functional

### Phase 2: Wire Up New Workflow
- Connect Unified Editor to existing AI services
- Implement inline replacement logic
- Connect Mini Bar to inline replacement
- Add snapshot creation on AI operations
- Test alongside existing workflow

### Phase 3: Remove Old Components
- Remove individual textareas from Generate/Rewrite/Summarize panels
- Remove CompareView component (no longer needed)
- Remove old History tab
- Migrate existing history data to snapshots
- Clean up unused code

## Accessibility Considerations

### Keyboard Navigation
- Tab order: Sidebar → Editor → Tool Controls → History Panel
- Escape key closes History Panel and Project Manager
- Arrow keys navigate snapshot list
- Enter key selects snapshot

### Screen Reader Support
- ARIA labels for all buttons and controls
- ARIA live region for AI operation status
- ARIA expanded state for History Panel
- Descriptive labels for snapshots ("Rewrote closing at 2:45 PM")

### Visual Accessibility
- Maintain existing color contrast ratios
- Visible focus indicators on all interactive elements
- Smooth animations (under 300ms)
- Reduced motion support (prefers-reduced-motion)

## Performance Considerations

### Bundle Size
- Reuse existing components (no size increase)
- New components are small (< 50 KB total)
- Total bundle remains under 1 MB

### Runtime Performance
- Debounce auto-save (500ms delay)
- Limit snapshots to 50 per project
- Lazy load project list (paginate if > 100 projects)
- Use React.memo for snapshot list items

### Storage Performance
- Index snapshots by projectId for fast queries
- Batch delete old snapshots
- Compress snapshot content if > 10 KB

## Design Decisions and Rationale

### Why Inline Replacement Instead of CompareView?
- **Faster workflow:** No navigation required
- **Better for iteration:** Make multiple changes quickly
- **Undo via history:** Can still compare versions through History Panel
- **Simpler mental model:** One document, direct edits

### Why Collapsible History Panel Instead of Tab?
- **More space for editor:** History doesn't need constant visibility
- **Better for mobile/small screens:** Can hide when not needed
- **Lightroom-style familiarity:** Users understand filmstrip metaphor
- **Keeps sidebar clean:** Only essential tools visible

### Why Project Management Instead of Single Document?
- **Multiple use cases:** Email, blog post, notes all separate
- **Context switching:** Work on different documents without losing progress
- **Better organization:** Find previous work easily
- **Matches user expectations:** Like files in a word processor

### Why Reuse Existing Components?
- **Faster implementation:** Less code to write and test
- **Lower risk:** Proven components, fewer bugs
- **Consistent UX:** Users already know how controls work
- **Smaller bundle:** No duplicate code
