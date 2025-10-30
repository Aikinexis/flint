import { useState, useEffect, useCallback, useRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { AppProvider, useAppState } from '../state';
import { Settings } from '../components/Settings';
import { WelcomePanel } from '../components/WelcomePanel';
import { Sidebar, NavigationItem } from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UnifiedEditor, UnifiedEditorRef, SelectionRange } from '../components/UnifiedEditor';
import { ToolControlsContainer, ToolType } from '../components/ToolControlsContainer';
import { ensureSpacing } from '../utils/textSelection';
import { simulateStreaming } from '../utils/streamingEffect';
import { ProjectManager } from '../components/ProjectManager';
import { HistoryPanel } from '../components/HistoryPanel';
import { StorageService, Project, Snapshot } from '../services/storage';
import { exportProject, autoFormatText, type ExportFormat } from '../utils/export';

import type { Tab } from '../state/store';

/**
 * Main panel component with sidebar navigation
 * Wrapped with AppProvider for state management
 */
function PanelContent() {
  const { state, actions } = useAppState();

  // Track which panels have been visited to lazy mount them
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['home']));

  // Unified editor state
  const [editorContent, setEditorContent] = useState('');
  const [editorSelection, setEditorSelection] = useState<SelectionRange>({ start: 0, end: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Single unified editor ref shared across all tools
  const unifiedEditorRef = useRef<UnifiedEditorRef>(null);

  // Persistent prompt state across tool switches
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [summarizePrompt, setSummarizePrompt] = useState('');

  // Track if content change is from AI or manual input (for future features)
  const isAIGeneratedRef = useRef<boolean>(false);

  // Project management state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // History panel state
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Project title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // Debounced auto-save ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-snapshot state for manual edits
  const lastSnapshotContentRef = useRef<string>('');
  const autoSnapshotTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialization flag to prevent multiple runs
  const isInitializedRef = useRef(false);

  // Ref to current project for use in timeouts
  const currentProjectRef = useRef<Project | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  // Navigation order: Projects, Generate, Rewrite, Summary, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'generate', label: 'Generate', icon: 'sparkles' },
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Note: Tab initialization is handled in initializeProjects effect below
  // to avoid race conditions

  // Cleanup auto-save and auto-snapshot timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (autoSnapshotTimeoutRef.current) {
        clearTimeout(autoSnapshotTimeoutRef.current);
      }
    };
  }, []);

  // Apply theme classes when settings change
  useEffect(() => {
    // Apply light mode class
    if (state.settings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Apply custom accent hue
    if (state.settings.accentHue !== undefined) {
      document.documentElement.style.setProperty(
        '--accent-hue',
        state.settings.accentHue.toString()
      );
    }
  }, [state.settings.theme, state.settings.accentHue]);

  // Listen for messages from content script (via background worker)
  useEffect(() => {
    const messageListener = (
      message: { type: string; payload?: { text?: string }; source?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void
    ) => {
      // Don't log PING_PANEL messages (they're just noise)
      if (message.type !== 'PING_PANEL') {
        console.log('[Panel] Received message:', message);
      }

      // Only handle messages relayed through background worker
      // This prevents double-delivery (content script sends to background, background relays to panel)
      if (message.source !== 'background-relay') {
        return;
      }

      switch (message.type) {
        case 'PING_PANEL':
          // Simple ping to check if panel is open
          sendResponse({ success: true, data: { message: 'Panel is open' } });
          return true;

        case 'OPEN_GENERATE_TAB':
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));
          // Optionally set editor content if text is provided
          if (message.payload?.text) {
            setEditorContent(message.payload.text);
            actions.setCurrentText(message.payload.text);
          }
          chrome.storage.local.set({ 'flint.lastTab': 'generate' });
          sendResponse({ success: true, data: { message: 'Opened Generate tab' } });
          break;

        case 'OPEN_SUMMARY_TAB':
          actions.setActiveTab('summary');
          setVisitedTabs((prev) => new Set(prev).add('summary'));
          // Store the selected text for the summary panel to use
          if (message.payload?.text) {
            setEditorContent(message.payload.text);
            actions.setCurrentText(message.payload.text);
            chrome.storage.local.set({
              'flint.lastTab': 'summary',
              'flint.selectedText': message.payload.text,
            });
          } else {
            chrome.storage.local.set({ 'flint.lastTab': 'summary' });
          }
          sendResponse({ success: true, data: { message: 'Opened Summary tab' } });
          break;

        case 'OPEN_REWRITE_TAB':
          actions.setActiveTab('rewrite');
          setVisitedTabs((prev) => new Set(prev).add('rewrite'));
          // Clear any previous rewrite state and set new selected text
          if (message.payload?.text) {
            setEditorContent(message.payload.text);
            actions.setCurrentText(message.payload.text);
            actions.setCurrentResult(''); // Clear previous result
            chrome.storage.local.set({
              'flint.lastTab': 'rewrite',
              'flint.selectedText': message.payload.text,
            });
          } else {
            chrome.storage.local.set({ 'flint.lastTab': 'rewrite' });
          }
          sendResponse({ success: true, data: { message: 'Opened Rewrite tab' } });
          break;

        case 'INSERT_AND_OPEN_GENERATE':
          // Insert text at cursor position
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_GENERATE - inserting text:',
              textToInsert.substring(0, 50) + '...'
            );
            unifiedEditorRef.current.insertAtCursor(textToInsert);
          }
          // Open generate tab
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));
          chrome.storage.local.set({ 'flint.lastTab': 'generate' });
          sendResponse({
            success: true,
            data: { message: 'Inserted text and opened Generate tab' },
          });
          return true;

        case 'INSERT_AND_OPEN_SUMMARY':
          // Insert text at cursor position and select it for summarizing
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_SUMMARY - inserting text:',
              textToInsert.substring(0, 50) + '...'
            );
            unifiedEditorRef.current.insertAtCursor(textToInsert, true); // true = select after insert
          }
          // Open summary tab
          actions.setActiveTab('summary');
          setVisitedTabs((prev) => new Set(prev).add('summary'));
          chrome.storage.local.set({ 'flint.lastTab': 'summary' });
          sendResponse({
            success: true,
            data: { message: 'Inserted text and opened Summary tab' },
          });
          return true;

        case 'INSERT_AND_OPEN_REWRITE':
          // Insert text at cursor position and select it for rewriting
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_REWRITE - inserting text:',
              textToInsert.substring(0, 50) + '...'
            );
            unifiedEditorRef.current.insertAtCursor(textToInsert, true); // true = select after insert
          }
          // Open rewrite tab
          actions.setActiveTab('rewrite');
          setVisitedTabs((prev) => new Set(prev).add('rewrite'));
          chrome.storage.local.set({ 'flint.lastTab': 'rewrite' });
          sendResponse({
            success: true,
            data: { message: 'Inserted text and opened Rewrite tab' },
          });
          return true;

        default:
          // Not a message we handle
          return;
      }

      // Return true to indicate we'll send a response
      return true;
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [actions]);

  const handleNavigate = (id: string) => {
    const newTab = id as Tab;
    actions.setActiveTab(newTab);
    // Mark tab as visited for lazy mounting
    setVisitedTabs((prev) => new Set(prev).add(newTab));
    // Clear any text selection when switching tabs
    window.getSelection()?.removeAllRanges();
    // Save to storage
    chrome.storage.local.set({ 'flint.lastTab': newTab });

    // Reload projects when navigating to Projects tab to show latest changes
    if (newTab === 'projects') {
      loadProjects();
    }
  };

  /**
   * Auto-save current project with debouncing
   */
  const autoSaveProject = useCallback(async (projectId: string, content: string) => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const updatedProject = await StorageService.updateProject(projectId, { content });

      if (updatedProject) {
        // Update current project state with new updatedAt timestamp
        setCurrentProject(updatedProject);
        console.log('[Panel] Project auto-saved:', projectId);
      }
    } catch (error) {
      console.error('[Panel] Auto-save failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      setSaveError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Handle unified editor content change with auto-save, auto-snapshot, and auto-correct
   */
  const handleEditorContentChange = useCallback(
    (content: string) => {
      setEditorContent(content);
      actions.setCurrentText(content);

      // Clear active snapshot when content changes (user is editing)
      setActiveSnapshotId(null);

      // Debounced auto-save if there's a current project
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (500ms delay)
      autoSaveTimeoutRef.current = setTimeout(async () => {
        // Get current project from ref (stable reference)
        let projectToSave = currentProjectRef.current;

        // If no project exists and user is typing, auto-create one
        if (!projectToSave && content.trim()) {
          try {
            console.log('[Panel] No project selected, auto-creating new project');
            const newProject = await StorageService.createProject('Untitled Project', content);
            setCurrentProject(newProject);
            currentProjectRef.current = newProject;
            setProjects((prev) => [newProject, ...prev]);
            projectToSave = newProject;
            console.log('[Panel] Auto-created project:', newProject.id);
          } catch (error) {
            console.error('[Panel] Failed to auto-create project:', error);
            return;
          }
        }

        if (projectToSave) {
          try {
            setIsSaving(true);
            console.log('[Panel] Auto-saving content:', content.substring(0, 50) + '...');
            const updatedProject = await StorageService.updateProject(projectToSave.id, {
              content,
            });
            if (updatedProject) {
              setCurrentProject(updatedProject);
              // Also update the projects list so export from project card has latest content
              setProjects((prev) =>
                prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
              );
              console.log(
                '[Panel] Project auto-saved successfully:',
                projectToSave.id,
                'Content length:',
                content.length
              );
            }
          } catch (error) {
            console.error('[Panel] Auto-save failed:', error);
          } finally {
            setIsSaving(false);
          }
        } else if (!content.trim()) {
          console.log('[Panel] No content to save, skipping project creation');
        }
      }, 500);

      // Debounced auto-snapshot for manual edits (3 seconds after typing stops)
      if (autoSnapshotTimeoutRef.current) {
        clearTimeout(autoSnapshotTimeoutRef.current);
      }

      autoSnapshotTimeoutRef.current = setTimeout(async () => {
        const projectForSnapshot = currentProjectRef.current;
        if (projectForSnapshot) {
          const lastContent = lastSnapshotContentRef.current;
          if (lastContent) {
            const contentDiff = Math.abs(content.length - lastContent.length);
            if (contentDiff >= 50) {
              try {
                const snapshot = await StorageService.createSnapshot(
                  projectForSnapshot.id,
                  lastContent,
                  'generate',
                  'Manual edit',
                  undefined
                );
                setSnapshots((prev) => [snapshot, ...prev]);
                lastSnapshotContentRef.current = content;
                console.log('[Panel] Created auto-snapshot for manual edit');
              } catch (error) {
                console.error('[Panel] Failed to create auto-snapshot:', error);
              }
            }
          } else {
            lastSnapshotContentRef.current = content;
          }
        }
      }, 3000);
    },
    [actions]
  );

  /**
   * Force save current project immediately (for export)
   */
  const handleForceSave = useCallback(async () => {
    // Clear any pending auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const projectToSave = currentProjectRef.current;
    if (projectToSave) {
      try {
        console.log('[Panel] Force saving project before export');
        const updatedProject = await StorageService.updateProject(projectToSave.id, {
          content: editorContent,
        });
        if (updatedProject) {
          setCurrentProject(updatedProject);
          setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
          console.log('[Panel] Force save completed');
        }
      } catch (error) {
        console.error('[Panel] Force save failed:', error);
        throw error;
      }
    }
  }, [editorContent]);

  /**
   * Handle unified editor selection change
   */
  const handleEditorSelectionChange = useCallback((selection: SelectionRange) => {
    setEditorSelection(selection);
    // No need to track shared selection - single editor naturally persists selection
  }, []);

  /**
   * Handle operation start from tool controls
   */
  const handleOperationStart = useCallback(
    (operationType?: ToolType) => {
      actions.setIsProcessing(true);
      setIsProcessing(true); // Disable editor during processing

      // Show appropriate indicator based on operation type
      const editorRef = unifiedEditorRef;

      if (editorRef?.current && operationType) {
        if (operationType === 'generate') {
          // Show cursor indicator for generate
          editorRef.current.showCursorIndicator();
        } else {
          // Show selection overlay for rewrite/summarize
          editorRef.current.showSelectionOverlay();
        }
      }
    },
    [actions, state.activeTab]
  );

  /**
   * Handle operation complete from tool controls
   */
  const handleOperationComplete = useCallback(
    async (result: string, operationType: ToolType) => {
      actions.setIsProcessing(false);
      setIsProcessing(false); // Re-enable editor after processing
      actions.setCurrentResult(result);

      // Create snapshot before replacement if we have a current project
      if (currentProject) {
        try {
          // Generate action description based on operation type
          let actionDescription = '';
          switch (operationType) {
            case 'generate':
              actionDescription = 'Generated new text';
              break;
            case 'rewrite':
              actionDescription = 'Rewrote text';
              break;
            case 'summarize':
              actionDescription = 'Summarized text';
              break;
          }

          // Create snapshot with current content before replacement
          const snapshot = await StorageService.createSnapshot(
            currentProject.id,
            editorContent,
            operationType,
            actionDescription,
            editorSelection
          );

          // Add snapshot to local state immediately
          setSnapshots((prev) => [snapshot, ...prev]);

          // Update last snapshot content ref for auto-snapshot tracking
          lastSnapshotContentRef.current = editorContent;

          console.log(`[Panel] Created snapshot before ${operationType} operation:`, snapshot.id);
        } catch (error) {
          console.error('[Panel] Failed to create snapshot:', error);
          // Continue with operation even if snapshot creation fails
        }
      }

      // Get the appropriate editor ref based on active tab
      const editorRef = unifiedEditorRef;

      // Get the appropriate textarea and captured selection for all operations
      const textarea = editorRef?.current?.getTextarea();
      const capturedSelection = editorRef?.current?.getCapturedSelection();
      console.log('[Panel] Using captured selection from editor ref:', capturedSelection);

      // Mark that this content change is from AI (not manual input)
      isAIGeneratedRef.current = true;

      // For generate operations, insert at cursor position with streaming effect
      if (operationType === 'generate') {
        if (textarea && capturedSelection) {
          try {
            // Check if we need to add a space before the generated text
            // Add space if cursor is right after a non-whitespace character
            const charBefore =
              capturedSelection.start > 0 ? editorContent[capturedSelection.start - 1] : '';
            const firstChar = result[0] || '';
            const needsSpaceBefore =
              charBefore && !/\s/.test(charBefore) && firstChar && !/\s/.test(firstChar);

            // Check if we need to add a space after the generated text
            const charAfter =
              capturedSelection.start < editorContent.length
                ? editorContent[capturedSelection.start]
                : '';
            const lastChar = result[result.length - 1] || '';
            const needsSpaceAfter =
              charAfter && !/\s/.test(charAfter) && lastChar && !/\s/.test(lastChar);

            // Add spaces if needed
            const spacedResult =
              (needsSpaceBefore ? ' ' : '') + result + (needsSpaceAfter ? ' ' : '');

            // Store the content before streaming for undo history
            const contentBeforeGenerate = editorContent;

            // Use streaming effect to type out the text
            await simulateStreaming(
              textarea,
              spacedResult,
              capturedSelection.start,
              capturedSelection.start, // No selection, just insert at cursor
              (currentText, _currentLength) => {
                // Update React state as text streams in
                const beforeCursor = contentBeforeGenerate.substring(0, capturedSelection.start);
                const afterCursor = contentBeforeGenerate.substring(capturedSelection.start);
                const newContent = beforeCursor + currentText + afterCursor;
                setEditorContent(newContent);
              },
              () => {
                // On complete, place cursor at end of inserted text
                const insertEnd = capturedSelection.start + spacedResult.length;
                textarea.focus();
                textarea.setSelectionRange(insertEnd, insertEnd);

                // Update captured selection in editor ref
                if (editorRef?.current) {
                  editorRef.current.updateCapturedSelection(insertEnd, insertEnd);
                }

                // Push to undo history AFTER streaming completes
                const finalContent =
                  contentBeforeGenerate.substring(0, capturedSelection.start) +
                  spacedResult +
                  contentBeforeGenerate.substring(capturedSelection.start);
                if (editorRef?.current) {
                  editorRef.current.pushToHistory(finalContent, insertEnd, insertEnd);
                  console.log('[Panel] Pushed AI generate to undo history');
                }

                // Trigger auto-save/auto-create by calling handleEditorContentChange
                handleEditorContentChange(finalContent);

                // Reset AI flag after streaming completes
                isAIGeneratedRef.current = false;
              }
            );

            console.log(
              `[Panel] Generate operation completed with streaming, inserted at position ${capturedSelection.start}`
            );
          } catch (error) {
            console.error('[Panel] Streaming failed:', error);
            // Fallback: just insert the text
            const beforeCursor = editorContent.substring(0, capturedSelection.start);
            const afterCursor = editorContent.substring(capturedSelection.start);
            const newContent = beforeCursor + result + afterCursor;
            setEditorContent(newContent);
          }
        } else {
          // Fallback: replace all content if no cursor position
          setEditorContent(result);
          console.log(`[Panel] Generate operation completed, content set (no cursor position)`);
        }
        return;
      }

      // For rewrite/summarize, use inline replacement

      if (textarea && capturedSelection && capturedSelection.start !== capturedSelection.end) {
        try {
          // Ensure proper spacing around the replacement text
          const spacedResult = ensureSpacing(
            editorContent,
            result,
            capturedSelection.start,
            capturedSelection.end
          );

          // Store the content before streaming for undo history
          const contentBeforeRewrite = editorContent;

          // Use streaming effect to type out the text
          await simulateStreaming(
            textarea,
            spacedResult,
            capturedSelection.start,
            capturedSelection.end,
            (currentText, currentLength) => {
              // Update React state as text streams in
              const beforeSelection = contentBeforeRewrite.substring(0, capturedSelection.start);
              const afterSelection = contentBeforeRewrite.substring(capturedSelection.end);
              const newContent = beforeSelection + currentText + afterSelection;
              setEditorContent(newContent);

              // Update overlay to grow with the text
              const newEnd = capturedSelection.start + currentLength;
              editorRef?.current?.updateCapturedSelection(capturedSelection.start, newEnd);
            },
            () => {
              // On complete, select the final text
              const newEnd = capturedSelection.start + spacedResult.length;
              textarea.focus();
              textarea.setSelectionRange(capturedSelection.start, newEnd);

              // Update captured selection in editor ref
              if (editorRef?.current) {
                editorRef.current.updateCapturedSelection(capturedSelection.start, newEnd);
              }

              // Push to undo history AFTER streaming completes
              const finalContent =
                contentBeforeRewrite.substring(0, capturedSelection.start) +
                spacedResult +
                contentBeforeRewrite.substring(capturedSelection.end);
              if (editorRef?.current) {
                editorRef.current.pushToHistory(finalContent, capturedSelection.start, newEnd);
                console.log('[Panel] Pushed AI rewrite/summarize to undo history');
              }

              // Trigger auto-save/auto-create by calling handleEditorContentChange
              handleEditorContentChange(finalContent);
            }
          );

          console.log(`[Panel] ${operationType} operation completed with inline replacement`);
        } catch (error) {
          console.error('[Panel] Inline replacement failed:', error);
          // Fallback: just update content
          setEditorContent(result);
        }
      } else {
        // Fallback: just update content if no selection or textarea not available
        setEditorContent(result);
        console.log(`[Panel] ${operationType} operation completed (no inline replacement)`);
      }
    },
    [actions, state.activeTab, editorSelection, currentProject, editorContent]
  );

  /**
   * Handle operation error from tool controls
   */
  const handleOperationError = useCallback(
    (error: string) => {
      actions.setIsProcessing(false);
      setIsProcessing(false); // Re-enable editor after error
      actions.setError(error);
      alert(error); // Simple error display for now
      console.error('[Panel] Operation error:', error);
    },
    [actions]
  );

  /**
   * Load projects from storage
   */
  const loadProjects = useCallback(async () => {
    try {
      const loadedProjects = await StorageService.getProjects();
      setProjects(loadedProjects);

      // If current project was updated, refresh it too
      if (currentProject) {
        const updatedCurrentProject = loadedProjects.find(p => p.id === currentProject.id);
        if (updatedCurrentProject) {
          setCurrentProject(updatedCurrentProject);
          console.log('[Panel] Current project refreshed after update:', updatedCurrentProject.title);
        }
      }
    } catch (error) {
      console.error('[Panel] Failed to load projects:', error);
    }
  }, [currentProject]);

  /**
   * Handle project selection
   */
  const handleProjectSelect = useCallback(
    async (projectId: string) => {
      try {
        // Save current project before switching (if there's pending changes)
        if (currentProject && autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          await autoSaveProject(currentProject.id, editorContent);
        }

        // Load selected project
        const project = await StorageService.getProject(projectId);
        if (project) {
          setCurrentProject(project);
          setEditorContent(project.content);
          actions.setCurrentText(project.content);

          // Navigate to generate tab after selecting project
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));

          // Initialize last snapshot content for auto-snapshot tracking
          lastSnapshotContentRef.current = project.content;

          // Save as last used project
          await StorageService.setLastProjectId(project.id);

          console.log('[Panel] Loaded project:', project.title);
        }
      } catch (error) {
        console.error('[Panel] Failed to load project:', error);
        alert('Failed to load project. Please try again.');
      }
    },
    [currentProject, editorContent, autoSaveProject, actions]
  );

  /**
   * Handle new project creation
   */
  const handleProjectCreate = useCallback(async () => {
    try {
      // Save current project before creating new one
      if (currentProject && autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        await autoSaveProject(currentProject.id, editorContent);
      }

      // Create new project with default title
      const newProject = await StorageService.createProject('Untitled Project', '');
      setCurrentProject(newProject);
      setEditorContent('');
      actions.setCurrentText('');

      // Navigate to generate tab after creating project
      actions.setActiveTab('generate');
      setVisitedTabs((prev) => new Set(prev).add('generate'));

      // Initialize last snapshot content for auto-snapshot tracking
      lastSnapshotContentRef.current = '';

      // Save as last used project
      await StorageService.setLastProjectId(newProject.id);

      // Reload projects list
      await loadProjects();

      console.log('[Panel] Created new project:', newProject.id);
    } catch (error) {
      console.error('[Panel] Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  }, [currentProject, editorContent, autoSaveProject, actions, loadProjects]);

  /**
   * Handle project deletion
   */
  const handleProjectDelete = useCallback(
    async (projectId: string) => {
      try {
        await StorageService.deleteProject(projectId);

        // If deleted project was current, clear editor
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
          setEditorContent('');
          actions.setCurrentText('');
        }

        // Reload projects list
        await loadProjects();

        console.log('[Panel] Deleted project:', projectId);
      } catch (error) {
        console.error('[Panel] Failed to delete project:', error);
        alert('Failed to delete project. Please try again.');
      }
    },
    [currentProject, actions, loadProjects]
  );

  /**
   * Load projects and last used project on mount
   */
  useEffect(() => {
    const initializeProjects = async () => {
      // Prevent multiple initializations
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      await loadProjects();

      // Try to load the last used project
      const lastProjectId = await StorageService.getLastProjectId();
      if (lastProjectId) {
        try {
          const project = await StorageService.getProject(lastProjectId);
          if (project) {
            setCurrentProject(project);
            setEditorContent(project.content);
            actions.setCurrentText(project.content);
            lastSnapshotContentRef.current = project.content;

            // Always start on generate tab
            actions.setActiveTab('generate');
            setVisitedTabs((prev) => new Set(prev).add('generate'));

            console.log('[Panel] Loaded last used project:', project.title);
            return;
          }
        } catch (error) {
          console.error('[Panel] Failed to load last project:', error);
        }
      }

      // If no last project or it failed to load, check if any projects exist
      const allProjects = await StorageService.getProjects();
      if (allProjects.length === 0) {
        // No projects exist - auto-create a default project
        try {
          const defaultProject = await StorageService.createProject('My First Project', '');
          setCurrentProject(defaultProject);
          setEditorContent('');
          actions.setCurrentText('');
          lastSnapshotContentRef.current = '';
          await StorageService.setLastProjectId(defaultProject.id);

          // Start on generate tab
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));

          console.log('[Panel] Created default project:', defaultProject.id);
        } catch (error) {
          console.error('[Panel] Failed to create default project:', error);
        }
      } else {
        // Load the most recent project
        const mostRecent = allProjects[0];
        if (mostRecent) {
          setCurrentProject(mostRecent);
          setEditorContent(mostRecent.content);
          actions.setCurrentText(mostRecent.content);
          lastSnapshotContentRef.current = mostRecent.content;
          await StorageService.setLastProjectId(mostRecent.id);

          // Always start on generate tab
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));

          console.log('[Panel] Loaded most recent project:', mostRecent.title);
        }
      }
    };

    initializeProjects();
  }, [loadProjects, actions]);

  /**
   * Check and run history migration on mount
   */
  useEffect(() => {
    const runMigration = async () => {
      try {
        await StorageService.checkAndMigrateHistory();
        // Reload projects after migration in case a default project was created
        await loadProjects();
      } catch (error) {
        console.error('[Panel] Migration check failed:', error);
        // Don't block app initialization if migration fails
      }
    };

    runMigration();
  }, [loadProjects]);

  /**
   * Load snapshots when current project changes
   */
  useEffect(() => {
    const loadSnapshots = async () => {
      if (currentProject) {
        try {
          const projectSnapshots = await StorageService.getSnapshots(currentProject.id);
          setSnapshots(projectSnapshots);
        } catch (error) {
          console.error('[Panel] Failed to load snapshots:', error);
        }
      } else {
        setSnapshots([]);
      }
    };

    loadSnapshots();
  }, [currentProject]);

  /**
   * Handle snapshot selection
   */
  const handleSnapshotSelect = useCallback(
    (snapshotId: string) => {
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (snapshot) {
        setEditorContent(snapshot.content);
        actions.setCurrentText(snapshot.content);
        setActiveSnapshotId(snapshotId);
        console.log('[Panel] Loaded snapshot:', snapshotId);
      }
    },
    [snapshots, actions]
  );

  /**
   * Handle snapshot restore from detail modal
   */
  const handleSnapshotRestore = useCallback(
    (content: string) => {
      setEditorContent(content);
      actions.setCurrentText(content);
      actions.setIsHistoryPanelOpen(false); // Close history panel to show restored content
      console.log('[Panel] Restored snapshot content to editor');
    },
    [actions]
  );

  /**
   * Handle history panel toggle
   */
  const handleHistoryPanelToggle = useCallback(() => {
    actions.toggleHistoryPanel();
  }, [actions]);

  /**
   * Auto-close history panel when switching to non-editor tabs
   */
  useEffect(() => {
    const nonEditorTabs = ['settings', 'projects', 'home'];
    if (nonEditorTabs.includes(state.activeTab) && state.isHistoryPanelOpen) {
      actions.setIsHistoryPanelOpen(false);
    }
  }, [state.activeTab, state.isHistoryPanelOpen, actions]);

  /**
   * Handle export in specified format (with auto-format)
   */
  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!currentProject) {
        alert('No project to export. Please create or select a project first.');
        return;
      }

      try {
        // Auto-format content before export
        const formattedContent = autoFormatText(editorContent);

        // Create a project snapshot with formatted content for export
        const projectToExport: Project = {
          ...currentProject,
          content: formattedContent,
        };

        exportProject(projectToExport, format);
        setShowExportMenu(false);
        console.log(`[Panel] Exported project as ${format} (auto-formatted)`);
      } catch (error) {
        console.error('[Panel] Export failed:', error);
        alert('Failed to export project. Please try again.');
      }
    },
    [currentProject, editorContent]
  );

  /**
   * Handle project title edit start
   */
  const handleTitleEditStart = useCallback(() => {
    if (currentProject) {
      setEditingTitle(currentProject.title);
      setIsEditingTitle(true);
    }
  }, [currentProject]);

  /**
   * Handle project title save
   */
  const handleTitleSave = useCallback(async () => {
    if (!currentProject || !editingTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const updatedProject = await StorageService.updateProject(currentProject.id, {
        title: editingTitle.trim(),
      });

      if (updatedProject) {
        setCurrentProject(updatedProject);
        // Reload projects list to update ProjectManager
        await loadProjects();
        console.log('[Panel] Project title updated:', editingTitle);
      }
    } catch (error) {
      console.error('[Panel] Failed to update title:', error);
      alert('Failed to update project title. Please try again.');
    } finally {
      setIsEditingTitle(false);
    }
  }, [currentProject, editingTitle, loadProjects]);

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  return (
    <div className="flint-bg h-screen relative">
      <Sidebar items={navigationItems} activeItemId={state.activeTab} onNavigate={handleNavigate} />

      {/* History Panel */}
      {currentProject && (
        <HistoryPanel
          projectId={currentProject.id}
          snapshots={snapshots}
          activeSnapshotId={activeSnapshotId}
          onSnapshotSelect={handleSnapshotSelect}
          onRestore={handleSnapshotRestore}
          isOpen={state.isHistoryPanelOpen}
          onToggle={handleHistoryPanelToggle}
          hideToggle={
            state.activeTab === 'settings' ||
            state.activeTab === 'projects' ||
            state.activeTab === 'home'
          }
          onSnapshotsChange={async () => {
            // Reload snapshots when they're modified (e.g., liked/unliked)
            if (currentProject) {
              const updatedSnapshots = await StorageService.getSnapshots(currentProject.id);
              setSnapshots(updatedSnapshots);
            }
          }}
        />
      )}

      {/* Save indicator */}
      {(isSaving || saveError) && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 999,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: saveError ? 'var(--error)' : 'var(--bg-muted)',
            border: `1px solid ${saveError ? 'var(--error)' : 'var(--border)'}`,
            color: 'var(--text)',
            fontSize: 'var(--fs-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-soft)',
          }}
          role="status"
          aria-live="polite"
        >
          {isSaving && (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Saving...</span>
            </>
          )}
          {saveError && (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{saveError}</span>
            </>
          )}
        </div>
      )}

      <div className={`content-area ${state.activeTab ? 'expanded' : ''}`}>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Log error details for debugging
            console.error('[Panel] Error boundary caught error:', {
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
              activeTab: state.activeTab,
            });
          }}
        >
          {/* Lazy mount panels on first visit, then keep mounted but hidden to preserve state */}
          {visitedTabs.has('home') && (
            <div style={{ display: state.activeTab === 'home' ? 'block' : 'none', height: '100%' }}>
              <WelcomePanel />
            </div>
          )}

          {/* Unified editor workspace - shared across Generate, Rewrite, and Summarize */}
          {(visitedTabs.has('generate') ||
            visitedTabs.has('rewrite') ||
            visitedTabs.has('summary')) && (
              <div
                style={{
                  display: ['generate', 'rewrite', 'summary'].includes(state.activeTab)
                    ? 'flex'
                    : 'none',
                  height: '100%',
                  flexDirection: 'column',
                  padding: '24px 14px', // 24px top/bottom, 14px left/right
                }}
              >
                {/* Shared Editor Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTitleSave();
                        } else if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                        }
                      }}
                      autoFocus
                      style={{
                        fontSize: 'var(--fs-lg)',
                        fontWeight: 600,
                        color: 'var(--text)',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        outline: 'none',
                        flex: 1,
                        maxWidth: '400px',
                      }}
                    />
                  ) : (
                    <h2
                      onClick={handleTitleEditStart}
                      style={{
                        fontSize: 'var(--fs-lg)',
                        fontWeight: 600,
                        color: 'var(--text)',
                        margin: 0,
                        cursor: 'pointer',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'auto',
                        maxWidth: '400px',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click to edit project name"
                    >
                      {currentProject?.title || 'Untitled Project'}
                    </h2>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Processing indicator */}
                    {state.isProcessing && (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid var(--border)',
                          borderTopColor: 'var(--text)',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                        aria-label="Processing"
                      />
                    )}

                    {/* Copy button */}
                    <button
                      onClick={() => {
                        if (editorContent) {
                          navigator.clipboard
                            .writeText(editorContent)
                            .then(() => {
                              console.log('[Panel] Content copied to clipboard');
                            })
                            .catch((err) => {
                              console.error('[Panel] Failed to copy:', err);
                            });
                        }
                      }}
                      disabled={!editorContent}
                      aria-label="Copy content"
                      title="Copy content to clipboard"
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                        cursor: editorContent ? 'pointer' : 'not-allowed',
                        opacity: editorContent ? 1 : 0.5,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (editorContent) {
                          e.currentTarget.style.background = 'var(--surface-2)';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    {/* Export button */}
                    <div ref={exportMenuRef} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={!currentProject}
                        aria-label="Export project"
                        aria-expanded={showExportMenu}
                        title="Export (auto-formats on export)"
                        style={{
                          width: '32px',
                          height: '32px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-muted)',
                          cursor: currentProject ? 'pointer' : 'not-allowed',
                          opacity: currentProject ? 1 : 0.5,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (currentProject) {
                            e.currentTarget.style.background = 'var(--surface-2)';
                            e.currentTarget.style.color = 'var(--text)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </button>

                      {showExportMenu && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            right: 0,
                            minWidth: '160px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-soft)',
                            padding: '4px',
                            zIndex: 100,
                          }}
                        >
                          <button
                            onClick={() => handleExport('txt')}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: 'var(--fs-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-3)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            Plain Text (.txt)
                          </button>
                          <button
                            onClick={() => handleExport('md')}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: 'var(--fs-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-3)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            Markdown (.md)
                          </button>
                          <button
                            onClick={() => handleExport('html')}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: 'var(--fs-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-3)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            HTML (.html)
                          </button>
                          <button
                            onClick={() => handleExport('docx')}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: 'var(--fs-sm)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-3)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            Docs (.doc)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Single Unified Editor - shared across all tools */}
                <UnifiedEditor
                  ref={unifiedEditorRef}
                  content={editorContent}
                  onContentChange={handleEditorContentChange}
                  activeTool={state.activeTab as 'generate' | 'rewrite' | 'summarize'}
                  onSelectionChange={handleEditorSelectionChange}
                  placeholder="Let's start writing!"
                  disabled={isProcessing}
                />

                {/* Tool-specific controls - only one visible at a time */}
                {state.activeTab === 'generate' && (
                  <ToolControlsContainer
                    activeTool="generate"
                    pinnedNotes={state.pinnedNotes}
                    content={editorContent}
                    selection={editorSelection}
                    editorRef={unifiedEditorRef}
                    generatePrompt={generatePrompt}
                    onGeneratePromptChange={setGeneratePrompt}
                    onOperationStart={handleOperationStart}
                    onOperationComplete={handleOperationComplete}
                    onOperationError={handleOperationError}
                  />
                )}

                {state.activeTab === 'rewrite' && (
                  <ToolControlsContainer
                    activeTool="rewrite"
                    pinnedNotes={state.pinnedNotes}
                    content={editorContent}
                    selection={editorSelection}
                    editorRef={unifiedEditorRef}
                    rewritePrompt={rewritePrompt}
                    onRewritePromptChange={setRewritePrompt}
                    onOperationStart={handleOperationStart}
                    onOperationComplete={handleOperationComplete}
                    onOperationError={handleOperationError}
                  />
                )}

                {state.activeTab === 'summary' && (
                  <ToolControlsContainer
                    activeTool="summarize"
                    pinnedNotes={state.pinnedNotes}
                    content={editorContent}
                    selection={editorSelection}
                    editorRef={unifiedEditorRef}
                    summarizePrompt={summarizePrompt}
                    onSummarizePromptChange={setSummarizePrompt}
                    onOperationStart={handleOperationStart}
                    onOperationComplete={handleOperationComplete}
                    onOperationError={handleOperationError}
                  />
                )}
              </div>
            )}

          {/* Old separate tab divs removed - now using single unified editor above */}

          {visitedTabs.has('projects') && (
            <div
              style={{ display: state.activeTab === 'projects' ? 'block' : 'none', height: '100%' }}
            >
              <ProjectManager
                projects={projects}
                onProjectSelect={handleProjectSelect}
                onProjectCreate={handleProjectCreate}
                onProjectDelete={handleProjectDelete}
                onProjectUpdate={loadProjects}
                onForceSave={handleForceSave}
                currentProjectId={currentProject?.id}
                isOpen={state.activeTab === 'projects'}
                onClose={() => actions.setActiveTab('generate')}
              />
            </div>
          )}

          {visitedTabs.has('settings') && (
            <div
              style={{ display: state.activeTab === 'settings' ? 'block' : 'none', height: '100%' }}
            >
              <Settings
                settings={state.settings}
                pinnedNotes={state.pinnedNotes}
                onSettingsChange={actions.setSettings}
                onPinnedNotesChange={actions.setPinnedNotes}
              />
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Custom scrollbar styling for project title */}
      <style>{`
        /* Hide scrollbar by default */
        h2[title="Click to edit project name"] {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        
        h2[title="Click to edit project name"]::-webkit-scrollbar {
          height: 6px;
          background: transparent;
        }
        
        h2[title="Click to edit project name"]::-webkit-scrollbar-track {
          background: transparent;
        }
        
        h2[title="Click to edit project name"]::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
        }
        
        h2[title="Click to edit project name"]::-webkit-scrollbar-corner {
          background: transparent;
        }
        
        /* Show scrollbar on hover */
        h2[title="Click to edit project name"]:hover {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: var(--border) transparent; /* Firefox */
        }
        
        h2[title="Click to edit project name"]:hover::-webkit-scrollbar-thumb {
          background: var(--border);
        }
        
        h2[title="Click to edit project name"]:hover::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

/**
 * Main Panel component wrapped with AppProvider and top-level ErrorBoundary
 */
export function Panel() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log top-level errors for debugging
        console.error('[Panel] Top-level error boundary caught error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <AppProvider>
        <PanelContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

// Mount the React app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Panel />
    </StrictMode>
  );
}
