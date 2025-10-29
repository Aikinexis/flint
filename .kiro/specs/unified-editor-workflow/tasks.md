# Implementation Plan

This plan breaks down the unified editor workflow into actionable tasks. Each task builds incrementally and focuses only on code implementation.

## Phase 1: Unified Editor Foundation

- [x] 1. Create Unified Editor component structure
  - Create `src/components/UnifiedEditor.tsx` with component skeleton
  - Define UnifiedEditorProps interface
  - Create single shared textarea element
  - Reuse existing textarea styling from current panels
  - Set up state for content, selection, and cursor position
  - Add onChange handler to update content
  - Add onSelect handler to track selection changes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create Tool Controls container component
  - Create `src/components/ToolControlsContainer.tsx`
  - Define ToolControlsProps interface
  - Import existing Generate, Rewrite, Summarize control components
  - Implement conditional rendering based on activeTool prop
  - Position controls below editor with consistent spacing
  - Pass through existing callbacks and props to child controls
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Simplify Summary Panel controls
  - Modify `src/components/SummaryPanel.tsx` layout
  - Move mode selector and reading level to horizontal layout
  - Match Generate/Rewrite button style and positioning
  - Remove any extra spacing or containers
  - Keep all existing functionality unchanged
  - _Requirements: 7.3_

- [x] 4. Integrate Unified Editor into main panel
  - Modify `src/panel/panel.tsx` to use UnifiedEditor
  - Replace individual panel textareas with shared editor
  - Pass activeTool based on current tab
  - Connect editor content to app state
  - Ensure content persists when switching tabs
  - _Requirements: 1.1, 1.2_

## Phase 2: Inline Text Replacement

- [x] 5. Create inline replacement utility function
  - Create `src/utils/inlineReplace.ts`
  - Implement replaceTextInline(textarea, newText, start, end)
  - Replace text between selection range
  - Update textarea value and trigger input event
  - Set new selection to highlight replaced text
  - Add brief highlight animation (CSS class toggle)
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 6. Modify AI operation handlers for inline replacement
  - Update Generate operation handler in panel
  - Update Rewrite operation handler in panel
  - Update Summarize operation handler in panel
  - Call replaceTextInline instead of navigating to CompareView
  - Pass selection range from editor state
  - Show loading indicator during operation
  - _Requirements: 2.1, 2.3_

- [x] 7. Update Mini Bar to use inline replacement
  - Modify `src/components/MiniBar.tsx` button handlers
  - Remove navigation to CompareView
  - Call inline replacement after AI operation completes
  - Maintain existing Mini Bar positioning and auto-hide
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Phase 3: Project Management

- [x] 8. Create Project data model and storage methods
  - Add Project interface to `src/services/storage.ts`
  - Create projects object store in IndexedDB
  - Implement createProject(title, content)
  - Implement getProjects() to fetch all projects
  - Implement getProject(id) to fetch single project
  - Implement updateProject(id, updates)
  - Implement deleteProject(id)
  - _Requirements: 3.1, 3.6_

- [x] 9. Create Project Manager modal component
  - Create `src/components/ProjectManager.tsx`
  - Define ProjectManagerProps interface
  - Create full-screen modal overlay
  - Implement grid layout for project cards
  - Add close button in header
  - Apply modal styles (white background, centered)
  - _Requirements: 3.1, 3.2_

- [x] 10. Create Project Card component
  - Create `src/components/ProjectCard.tsx`
  - Display project title, date, and content preview
  - Add hover effect (border color, shadow, translateY)
  - Add click handler to select project
  - Create "New Project" card variant with + icon
  - Apply card styles from mockup
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 11. Integrate Project Manager into panel
  - Add Projects button to sidebar in `src/panel/panel.tsx`
  - Add isProjectManagerOpen state
  - Render ProjectManager modal when open
  - Handle project selection (load content into editor)
  - Handle new project creation (create blank project)
  - Auto-save current project before switching
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 12. Implement auto-save for current project
  - Add debounced save function (500ms delay)
  - Call updateProject when editor content changes
  - Update project's updatedAt timestamp
  - Show save indicator (optional)
  - Handle save errors gracefully
  - _Requirements: 3.5_

## Phase 4: Version History Panel

- [x] 13. Create Snapshot data model and storage methods
  - Add Snapshot interface to `src/services/storage.ts`
  - Create snapshots object store in IndexedDB
  - Add indexes for projectId and timestamp
  - Implement createSnapshot(projectId, content, actionType, description)
  - Implement getSnapshots(projectId) to fetch project snapshots
  - Implement deleteOldSnapshots(projectId, limit) to keep only 50 recent
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 14. Create History Panel component structure
  - Create `src/components/HistoryPanel.tsx`
  - Define HistoryPanelProps interface
  - Create collapsible panel container
  - Apply dark background (#1a1a1a) and border styles
  - Add slide-in/out animation (CSS transitions)
  - Position panel between main content and sidebar
  - _Requirements: 4.1, 4.5_

- [x] 15. Create Snapshot Item component
  - Create `src/components/SnapshotItem.tsx`
  - Display action label, timestamp, and content preview
  - Add active state styling (blue border, glow)
  - Add hover effect (gray border, translateX)
  - Add click handler to select snapshot
  - Format timestamp (e.g., "2:45 PM")
  - _Requirements: 4.3, 4.4_

- [x] 16. Implement History Panel toggle
  - Add history toggle button to sidebar
  - Use ‹/› arrow icons
  - Add isHistoryPanelOpen state to app
  - Toggle panel visibility on button click
  - Update arrow direction based on open/closed state
  - Position button on left edge of sidebar
  - _Requirements: 4.5, 4.6_

- [x] 17. Integrate History Panel into panel
  - Add HistoryPanel component to main layout
  - Fetch snapshots for current project on mount
  - Pass snapshots and active snapshot to panel
  - Handle snapshot selection (load content into editor)
  - Update active snapshot when content changes
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 18. Create snapshots on AI operations
  - Modify AI operation handlers to create snapshot before replacement
  - Pass actionType ('generate', 'rewrite', 'summarize')
  - Generate actionDescription (e.g., "Rewrote with formal tone")
  - Store selection range with snapshot
  - Add snapshot to history panel immediately
  - Limit to 50 snapshots per project
  - _Requirements: 2.2, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 5: History Migration and Cleanup

- [x] 19. Migrate existing history data to snapshots
  - Create migration function in storage service
  - Read existing history items from old storage
  - Convert to Snapshot format
  - Create default project for orphaned history
  - Save snapshots to new storage
  - Mark migration as complete in settings
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 20. Remove History tab and old components
  - Remove History tab from sidebar navigation
  - Remove History component file
  - Remove history-related state from app
  - Remove old history storage methods
  - Update Settings to keep all existing functionality
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 21. Remove CompareView component
  - Delete `src/components/CompareView.tsx`
  - Remove CompareView imports from panel
  - Remove navigation to CompareView from AI handlers
  - Remove CompareView-related state
  - _Requirements: 2.1_

## Phase 6: Accessibility and Polish

- [ ] 22. Add ARIA labels to all interactive elements
  - Add aria-label to all buttons (sidebar, tools, history)
  - Add aria-describedby for form fields
  - Add role="region" to History Panel
  - Add aria-live="polite" for AI operation status
  - Add aria-expanded to History Panel toggle
  - Test with screen reader (VoiceOver or NVDA)
  - _Requirements: 9.1, 9.2, 9.5_

- [ ] 23. Implement keyboard navigation
  - Ensure all interactive elements are keyboard accessible
  - Add visible focus indicators (orange glow from tokens)
  - Implement logical tab order (sidebar → editor → controls → history)
  - Add Escape key handler to close History Panel and Project Manager
  - Add Arrow keys for snapshot navigation
  - Test full keyboard navigation flow
  - _Requirements: 9.1, 9.3, 9.5_

- [ ] 24. Verify color contrast and accessibility
  - Test all text against backgrounds with contrast checker
  - Ensure WCAG 2.1 AA compliance (4.5:1 for text)
  - Test with high contrast mode
  - Verify focus indicators are visible
  - Test with color blindness simulators
  - _Requirements: 9.4_

- [ ] 25. Add animations and micro-interactions
  - Add button press animation (translateY on active)
  - Add hover glow effect to buttons (existing in tokens)
  - Add fade transitions between tabs (if not already present)
  - Add success checkmark animation for inline replacement
  - Add smooth slide animation for History Panel
  - Keep animations under 300ms for responsiveness
  - Add prefers-reduced-motion support
  - _Requirements: 10.1, 10.2_

- [ ] 26. Optimize bundle size
  - Run production build and check bundle size
  - Analyze bundle with Vite's rollup-plugin-visualizer
  - Remove unused dependencies (if any)
  - Verify tree-shaking is working
  - Compress with terser minification
  - Verify total size is under 1 MB compressed
  - _Requirements: 10.3_

- [ ] 27. Add performance monitoring
  - Add timing measurements for panel render
  - Measure AI operation latency
  - Measure inline replacement latency
  - Log performance metrics to console (dev mode only)
  - Verify panel renders within 3 seconds
  - Verify operations complete within 5 seconds
  - _Requirements: 10.4, 10.5_

## Summary

This implementation plan contains 27 tasks organized into 6 phases:

1. **Phase 1**: Unified Editor Foundation (Tasks 1-4)
2. **Phase 2**: Inline Text Replacement (Tasks 5-7)
3. **Phase 3**: Project Management (Tasks 8-12)
4. **Phase 4**: Version History Panel (Tasks 13-18)
5. **Phase 5**: History Migration and Cleanup (Tasks 19-21)
6. **Phase 6**: Accessibility and Polish (Tasks 22-27)

**Key Notes:**
- All tasks reuse existing components and services where possible
- No changes to Settings tab or existing AI service logic
- Tasks build incrementally with minimal breaking changes
- Each task is designed to take 1-3 hours
- All tasks reference specific requirements from requirements.md

**Estimated Timeline:**
- Phase 1-2: ~8-12 hours (Core editor and inline replacement)
- Phase 3: ~8-10 hours (Project management)
- Phase 4: ~10-12 hours (History panel)
- Phase 5: ~4-6 hours (Migration and cleanup)
- Phase 6: ~8-10 hours (Accessibility and polish)
- **Total**: ~38-50 hours

**Next Steps:**
1. Review this task list
2. Begin with Phase 1 (Unified Editor Foundation)
3. Test each feature as it's completed
4. Deploy when all tasks are done
