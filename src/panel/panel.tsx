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
import { replaceTextInline } from '../utils/inlineReplace';
import { ProjectManager } from '../components/ProjectManager';
import { HistoryPanel } from '../components/HistoryPanel';
import { StorageService, Project, Snapshot } from '../services/storage';

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
  
  // Refs for unified editors (one per tool tab)
  const generateEditorRef = useRef<UnifiedEditorRef>(null);
  const rewriteEditorRef = useRef<UnifiedEditorRef>(null);
  const summarizeEditorRef = useRef<UnifiedEditorRef>(null);

  // Project management state
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // History panel state
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  
  // Debounced auto-save ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation order: Projects, Generate, Rewrite, Summary, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'generate', label: 'Generate', icon: 'sparkles' },
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Load last selected tab from storage on mount
  useEffect(() => {
    let mounted = true;

    chrome.storage.local.get({ 'flint.lastTab': 'home' }).then((result) => {
      if (!mounted) return;
      
      const tab = result['flint.lastTab'] as Tab;
      actions.setActiveTab(tab);
      // Mark initial tab as visited
      setVisitedTabs(prev => new Set(prev).add(tab));
    });

    return () => {
      mounted = false;
    };
  }, [actions]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
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
      document.documentElement.style.setProperty('--accent-hue', state.settings.accentHue.toString());
    }
  }, [state.settings.theme, state.settings.accentHue]);

  // Listen for messages from content script (via background worker)
  useEffect(() => {
    const messageListener = (
      message: { type: string; payload?: { text?: string }; source?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void
    ) => {
      console.log('[Panel] Received message:', message);

      // Only handle messages from content script
      if (message.source !== 'content-script') {
        return;
      }

      switch (message.type) {
        case 'PING_PANEL':
          // Simple ping to check if panel is open
          sendResponse({ success: true, data: { message: 'Panel is open' } });
          return true;

        case 'OPEN_GENERATE_TAB':
          actions.setActiveTab('generate');
          setVisitedTabs(prev => new Set(prev).add('generate'));
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
          setVisitedTabs(prev => new Set(prev).add('summary'));
          // Store the selected text for the summary panel to use
          if (message.payload?.text) {
            setEditorContent(message.payload.text);
            actions.setCurrentText(message.payload.text);
            chrome.storage.local.set({ 
              'flint.lastTab': 'summary',
              'flint.selectedText': message.payload.text 
            });
          } else {
            chrome.storage.local.set({ 'flint.lastTab': 'summary' });
          }
          sendResponse({ success: true, data: { message: 'Opened Summary tab' } });
          break;

        case 'OPEN_REWRITE_TAB':
          actions.setActiveTab('rewrite');
          setVisitedTabs(prev => new Set(prev).add('rewrite'));
          // Clear any previous rewrite state and set new selected text
          if (message.payload?.text) {
            setEditorContent(message.payload.text);
            actions.setCurrentText(message.payload.text);
            actions.setCurrentResult(''); // Clear previous result
            chrome.storage.local.set({ 
              'flint.lastTab': 'rewrite',
              'flint.selectedText': message.payload.text 
            });
          } else {
            chrome.storage.local.set({ 'flint.lastTab': 'rewrite' });
          }
          sendResponse({ success: true, data: { message: 'Opened Rewrite tab' } });
          break;

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
    // Special handling for Projects button - open modal instead of navigating
    if (id === 'projects') {
      setIsProjectManagerOpen(true);
      return;
    }

    const newTab = id as Tab;
    actions.setActiveTab(newTab);
    // Mark tab as visited for lazy mounting
    setVisitedTabs(prev => new Set(prev).add(newTab));
    // Clear any text selection when switching tabs
    window.getSelection()?.removeAllRanges();
    // Save to storage
    chrome.storage.local.set({ 'flint.lastTab': newTab });
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
   * Handle unified editor content change with auto-save
   */
  const handleEditorContentChange = useCallback((content: string) => {
    setEditorContent(content);
    actions.setCurrentText(content);
    
    // Clear active snapshot when content changes (user is editing)
    // This indicates we're no longer viewing a specific snapshot
    if (activeSnapshotId !== null) {
      setActiveSnapshotId(null);
    }
    
    // Debounced auto-save if there's a current project
    if (currentProject) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (500ms delay)
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveProject(currentProject.id, content);
      }, 500);
    }
  }, [actions, currentProject, autoSaveProject, activeSnapshotId]);

  /**
   * Handle unified editor selection change
   */
  const handleEditorSelectionChange = useCallback((selection: SelectionRange) => {
    setEditorSelection(selection);
  }, []);

  /**
   * Handle snapshot creation before MiniBar AI operations
   */
  const handleBeforeMiniBarOperation = useCallback(async (operationType: 'rewrite' | 'summarize') => {
    if (!currentProject) {
      console.log('[Panel] No current project, skipping snapshot creation');
      return;
    }

    try {
      // Generate action description based on operation type
      let actionDescription = '';
      switch (operationType) {
        case 'rewrite':
          actionDescription = 'Rewrote selection';
          break;
        case 'summarize':
          actionDescription = 'Summarized selection';
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
      setSnapshots(prev => [snapshot, ...prev]);

      console.log(`[Panel] Created snapshot before MiniBar ${operationType} operation:`, snapshot.id);
    } catch (error) {
      console.error('[Panel] Failed to create snapshot from MiniBar:', error);
      // Continue with operation even if snapshot creation fails
    }
  }, [currentProject, editorContent, editorSelection]);

  /**
   * Handle operation start from tool controls
   */
  const handleOperationStart = useCallback(() => {
    actions.setIsProcessing(true);
  }, [actions]);

  /**
   * Handle operation complete from tool controls
   */
  const handleOperationComplete = useCallback(async (result: string, operationType: ToolType) => {
    actions.setIsProcessing(false);
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
        setSnapshots(prev => [snapshot, ...prev]);
        
        console.log(`[Panel] Created snapshot before ${operationType} operation:`, snapshot.id);
      } catch (error) {
        console.error('[Panel] Failed to create snapshot:', error);
        // Continue with operation even if snapshot creation fails
      }
    }
    
    // Get the appropriate editor ref based on active tab
    let editorRef: React.RefObject<UnifiedEditorRef> | null = null;
    if (state.activeTab === 'generate') {
      editorRef = generateEditorRef;
    } else if (state.activeTab === 'rewrite') {
      editorRef = rewriteEditorRef;
    } else if (state.activeTab === 'summary') {
      editorRef = summarizeEditorRef;
    }
    
    // Get textarea element
    const textarea = editorRef?.current?.getTextarea();
    
    if (textarea) {
      try {
        // Use inline replacement with current selection range
        await replaceTextInline(
          textarea,
          result,
          editorSelection.start,
          editorSelection.end
        );
        
        console.log(`[Panel] ${operationType} operation completed with inline replacement`);
      } catch (error) {
        console.error('[Panel] Inline replacement failed:', error);
        // Fallback: just update content
        setEditorContent(result);
      }
    } else {
      // Fallback: just update content if textarea not available
      setEditorContent(result);
      console.log(`[Panel] ${operationType} operation completed (no inline replacement)`);
    }
  }, [actions, state.activeTab, editorSelection, currentProject, editorContent]);

  /**
   * Handle operation error from tool controls
   */
  const handleOperationError = useCallback((error: string) => {
    actions.setIsProcessing(false);
    actions.setError(error);
    alert(error); // Simple error display for now
    console.error('[Panel] Operation error:', error);
  }, [actions]);

  /**
   * Load projects from storage
   */
  const loadProjects = useCallback(async () => {
    try {
      const loadedProjects = await StorageService.getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('[Panel] Failed to load projects:', error);
    }
  }, []);

  /**
   * Handle project selection
   */
  const handleProjectSelect = useCallback(async (projectId: string) => {
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
        setIsProjectManagerOpen(false);
        console.log('[Panel] Loaded project:', project.title);
      }
    } catch (error) {
      console.error('[Panel] Failed to load project:', error);
      alert('Failed to load project. Please try again.');
    }
  }, [currentProject, editorContent, autoSaveProject, actions]);

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
      setIsProjectManagerOpen(false);
      
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
  const handleProjectDelete = useCallback(async (projectId: string) => {
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
  }, [currentProject, actions, loadProjects]);

  /**
   * Load projects on mount
   */
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
  const handleSnapshotSelect = useCallback((snapshotId: string) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      setEditorContent(snapshot.content);
      actions.setCurrentText(snapshot.content);
      setActiveSnapshotId(snapshotId);
      console.log('[Panel] Loaded snapshot:', snapshotId);
    }
  }, [snapshots, actions]);

  /**
   * Handle history panel toggle
   */
  const handleHistoryPanelToggle = useCallback(() => {
    actions.toggleHistoryPanel();
  }, [actions]);

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
          isOpen={state.isHistoryPanelOpen}
          onToggle={handleHistoryPanelToggle}
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

      {/* Project Manager Modal */}
      <ProjectManager
        projects={projects}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={handleProjectDelete}
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
      />

      <div className={`content-area ${state.activeTab ? 'expanded' : ''} ${state.isHistoryPanelOpen ? 'history-panel-open' : ''}`}>
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
          
          {visitedTabs.has('generate') && (
            <div 
              style={{ 
                display: state.activeTab === 'generate' ? 'flex' : 'none', 
                height: '100%',
                flexDirection: 'column',
                padding: '24px',
              }}
            >
              <UnifiedEditor
                ref={generateEditorRef}
                content={editorContent}
                onContentChange={handleEditorContentChange}
                activeTool="generate"
                onSelectionChange={handleEditorSelectionChange}
                placeholder="Generated text will appear here..."
                pinnedNotes={state.pinnedNotes.map(note => note.content)}
                onBeforeMiniBarOperation={handleBeforeMiniBarOperation}
              />
              <ToolControlsContainer
                activeTool="generate"
                pinnedNotes={state.pinnedNotes}
                content={editorContent}
                selection={editorSelection}
                onOperationStart={handleOperationStart}
                onOperationComplete={handleOperationComplete}
                onOperationError={handleOperationError}
              />
            </div>
          )}
          
          {visitedTabs.has('rewrite') && (
            <div 
              style={{ 
                display: state.activeTab === 'rewrite' ? 'flex' : 'none', 
                height: '100%',
                flexDirection: 'column',
                padding: '24px',
              }}
            >
              <UnifiedEditor
                ref={rewriteEditorRef}
                content={editorContent}
                onContentChange={handleEditorContentChange}
                activeTool="rewrite"
                onSelectionChange={handleEditorSelectionChange}
                placeholder="Paste or type text to rewrite..."
                pinnedNotes={state.pinnedNotes.map(note => note.content)}
                onBeforeMiniBarOperation={handleBeforeMiniBarOperation}
              />
              <ToolControlsContainer
                activeTool="rewrite"
                pinnedNotes={state.pinnedNotes}
                content={editorContent}
                selection={editorSelection}
                onOperationStart={handleOperationStart}
                onOperationComplete={handleOperationComplete}
                onOperationError={handleOperationError}
              />
            </div>
          )}
          
          {visitedTabs.has('summary') && (
            <div 
              style={{ 
                display: state.activeTab === 'summary' ? 'flex' : 'none', 
                height: '100%',
                flexDirection: 'column',
                padding: '24px',
              }}
            >
              <UnifiedEditor
                ref={summarizeEditorRef}
                content={editorContent}
                onContentChange={handleEditorContentChange}
                activeTool="summarize"
                onSelectionChange={handleEditorSelectionChange}
                placeholder="Paste or type text to summarize..."
                pinnedNotes={state.pinnedNotes.map(note => note.content)}
                onBeforeMiniBarOperation={handleBeforeMiniBarOperation}
              />
              <ToolControlsContainer
                activeTool="summarize"
                pinnedNotes={state.pinnedNotes}
                content={editorContent}
                selection={editorSelection}
                onOperationStart={handleOperationStart}
                onOperationComplete={handleOperationComplete}
                onOperationError={handleOperationError}
              />
            </div>
          )}
          
          {visitedTabs.has('settings') && (
            <div style={{ display: state.activeTab === 'settings' ? 'block' : 'none', height: '100%' }}>
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
