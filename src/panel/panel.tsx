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
import { PinnedNotesPanel } from '../components/PinnedNotesPanel';
import { StorageService, Project, Snapshot, PinnedNote } from '../services/storage';
import { exportProject, autoFormatText, type ExportFormat } from '../utils/export';
import { AIService } from '../services/ai';
import { generateSmartTitle } from '../utils/documentAnalysis';

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

  // Track if current selection is from automatic webpage mini bar insertion
  const isAutoSelectionRef = useRef<boolean>(false);

  // Project management state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI download progress state
  const [aiDownloadProgress, setAiDownloadProgress] = useState<number | null>(null);

  // History panel state
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);

  // Pinned notes panel state
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
  const [activePinnedNoteIds, setActivePinnedNoteIds] = useState<string[]>([]);
  const [isPinnedNotesPanelOpen, setIsPinnedNotesPanelOpen] = useState(false);

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
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
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
          // Insert text from webpage - always append at end
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_GENERATE - appending text at end:',
              textToInsert.substring(0, 50) + '...'
            );

            // Move cursor to end of content
            const textarea = unifiedEditorRef.current.getTextarea();
            if (textarea) {
              const endPosition = editorContent.length;
              textarea.setSelectionRange(endPosition, endPosition);
              console.log('[Panel] Moved cursor to end:', endPosition);
            }

            // Insert at cursor (which is now at end), DON'T select - just move cursor to end
            unifiedEditorRef.current.insertAtCursor(textToInsert, false, false);
          }
          // Open generate tab
          actions.setActiveTab('generate');
          setVisitedTabs((prev) => new Set(prev).add('generate'));
          chrome.storage.local.set({ 'flint.lastTab': 'generate' });

          // Clear selection and move cursor to end when switching to Generate
          setTimeout(() => {
            const textarea = unifiedEditorRef.current?.getTextarea();
            if (textarea) {
              const endPos = textarea.value.length;
              textarea.setSelectionRange(endPos, endPos);
              console.log('[Panel] Cleared selection, cursor at end for Generate');
            }
          }, 100);

          sendResponse({
            success: true,
            data: { message: 'Inserted text and opened Generate tab' },
          });
          return true;

        case 'INSERT_AND_OPEN_SUMMARY':
          // Insert text from webpage - always append at end
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_SUMMARY - appending text at end:',
              textToInsert.substring(0, 50) + '...'
            );

            // Move cursor to end of content
            const textarea = unifiedEditorRef.current.getTextarea();
            if (textarea) {
              const endPosition = editorContent.length;
              textarea.setSelectionRange(endPosition, endPosition);
              console.log('[Panel] Moved cursor to end:', endPosition);
            }

            // Insert at cursor (which is now at end), SELECT the new text
            unifiedEditorRef.current.insertAtCursor(textToInsert, true, false);

            // Move cursor to END of selection (so it's ready to continue)
            setTimeout(() => {
              if (textarea) {
                const selectionEnd = editorContent.length + textToInsert.length;
                // Keep selection but move cursor to end
                textarea.setSelectionRange(editorContent.length, selectionEnd);
                console.log('[Panel] Cursor at end of selection');
              }
            }, 50);
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
          // Insert text from webpage - always append at end
          if (message.payload?.text && unifiedEditorRef.current) {
            const textToInsert = message.payload.text.trim();
            console.log(
              '[Panel] INSERT_AND_OPEN_REWRITE - appending text at end:',
              textToInsert.substring(0, 50) + '...'
            );

            // Move cursor to end of content
            const textarea = unifiedEditorRef.current.getTextarea();
            if (textarea) {
              const endPosition = editorContent.length;
              textarea.setSelectionRange(endPosition, endPosition);
              console.log('[Panel] Moved cursor to end:', endPosition);
            }

            // Insert at cursor (which is now at end), SELECT the new text
            unifiedEditorRef.current.insertAtCursor(textToInsert, true, false);

            // Move cursor to END of selection (so it's ready to continue)
            setTimeout(() => {
              if (textarea) {
                const selectionEnd = editorContent.length + textToInsert.length;
                // Keep selection but move cursor to end
                textarea.setSelectionRange(editorContent.length, selectionEnd);
                console.log('[Panel] Cursor at end of selection');
              }
            }, 50);
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

    // When switching to Generate tab, move cursor to end (but can be overridden by manual click)
    if (newTab === 'generate') {
      setTimeout(() => {
        const textarea = unifiedEditorRef.current?.getTextarea();
        if (textarea) {
          const endPos = textarea.value.length;
          textarea.setSelectionRange(endPos, endPos);
          textarea.focus();
          console.log('[Panel] Switched to Generate - cursor at end:', endPos);
          
          // Listen for manual cursor repositioning
          const handleClick = () => {
            console.log('[Panel] User manually repositioned cursor');
            textarea.removeEventListener('click', handleClick);
          };
          textarea.addEventListener('click', handleClick, { once: true });
        }
      }, 100);
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

        // Show saved checkmark briefly
        setJustSaved(true);
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => {
          setJustSaved(false);
        }, 2000); // Show checkmark for 2 seconds
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

      // Set new timeout for auto-save (200ms delay - faster saves)
      autoSaveTimeoutRef.current = setTimeout(async () => {
        // Get current project from ref (stable reference)
        let projectToSave = currentProjectRef.current;

        // If no project exists and user is typing, auto-create one
        if (!projectToSave && content.trim()) {
          try {
            console.log('[Panel] No project selected, auto-creating new project');
            // Get appropriate default title
            const allProjects = await StorageService.getProjects();
            const defaultTitle = allProjects.length === 0 ? 'My first project' : 'My project';
            const newProject = await StorageService.createProject(defaultTitle, content);
            setCurrentProject(newProject);
            currentProjectRef.current = newProject;
            setProjects((prev) => [newProject, ...prev]);
            projectToSave = newProject;
            console.log('[Panel] Auto-created project:', newProject.id, 'with title:', defaultTitle);
          } catch (error) {
            console.error('[Panel] Failed to auto-create project:', error);
            return;
          }
        }

        if (projectToSave) {
          try {
            setIsSaving(true);
            
            // Note: Title auto-generation is now handled explicitly after AI operations
            // (see handleOperationComplete callbacks for generate/rewrite/summarize)
            // We don't auto-update titles during manual typing to avoid overwriting AI-generated titles
            
            // Reduced logging verbosity - only log on errors
            const updatedProject = await StorageService.updateProject(projectToSave.id, {
              content,
            });
            if (updatedProject) {
              setCurrentProject(updatedProject);
              currentProjectRef.current = updatedProject;
              // Also update the projects list so export from project card has latest content
              setProjects((prev) =>
                prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
              );

              // Show saved checkmark briefly
              setJustSaved(true);
              if (savedTimeoutRef.current) {
                clearTimeout(savedTimeoutRef.current);
              }
              savedTimeoutRef.current = setTimeout(() => {
                setJustSaved(false);
              }, 2000);
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
    // Reset auto-selection flag when user manually changes selection
    // (This happens when user clicks/drags to select text)
    isAutoSelectionRef.current = false;
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
    async (result: string, operationType: ToolType, userPrompt?: string) => {
      actions.setIsProcessing(false);
      setIsProcessing(false); // Re-enable editor after processing
      actions.setCurrentResult(result);

      // Auto-generate title will happen after content is updated
      // (moved to after streaming completes)

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
      // Reduced logging
      // console.log('[Panel] Using captured selection from editor ref:', capturedSelection);

      // Mark that this content change is from AI (not manual input)
      isAIGeneratedRef.current = true;

      // For generate operations, insert at cursor position or replace selection with streaming effect
      if (operationType === 'generate') {
        if (textarea && capturedSelection) {
          try {
            // Check if there's a selection to replace
            const hasSelection = capturedSelection.start !== capturedSelection.end;
            const endPosition = hasSelection ? capturedSelection.end : capturedSelection.start;

            // Check if we need to add a space before the generated text
            // Add space if cursor is right after a non-whitespace character
            const charBefore =
              capturedSelection.start > 0 ? editorContent[capturedSelection.start - 1] : '';
            const firstChar = result[0] || '';
            const needsSpaceBefore =
              charBefore && !/\s/.test(charBefore) && firstChar && !/\s/.test(firstChar);

            // Check if we need to add a space after the generated text
            const charAfter = endPosition < editorContent.length ? editorContent[endPosition] : '';
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
              endPosition, // Use end position (will replace selection if exists)
              (currentText, _currentLength) => {
                // Update React state as text streams in
                const beforeSelection = contentBeforeGenerate.substring(0, capturedSelection.start);
                const afterSelection = contentBeforeGenerate.substring(endPosition);
                const newContent = beforeSelection + currentText + afterSelection;
                setEditorContent(newContent);
              },
              () => {
                // On complete, place cursor at end of inserted text OR select the text if replacing
                const insertEnd = capturedSelection.start + spacedResult.length;
                textarea.focus();

                if (hasSelection) {
                  // If we replaced a selection, highlight the new text
                  textarea.setSelectionRange(capturedSelection.start, insertEnd);
                  // Update captured selection in editor ref to the new selection
                  if (editorRef?.current) {
                    editorRef.current.updateCapturedSelection(capturedSelection.start, insertEnd);
                  }
                } else {
                  // If we just inserted at cursor, place cursor at end
                  textarea.setSelectionRange(insertEnd, insertEnd);
                  // Update captured selection in editor ref
                  if (editorRef?.current) {
                    editorRef.current.updateCapturedSelection(insertEnd, insertEnd);
                  }
                }

                // Push to undo history AFTER streaming completes
                const finalContent =
                  contentBeforeGenerate.substring(0, capturedSelection.start) +
                  spacedResult +
                  contentBeforeGenerate.substring(endPosition);
                if (editorRef?.current) {
                  editorRef.current.pushToHistory(finalContent, insertEnd, insertEnd);
                  console.log('[Panel] Pushed AI generate to undo history');
                }

                // Trigger auto-save/auto-create by calling handleEditorContentChange
                handleEditorContentChange(finalContent);

                // Auto-generate title using AI if project title is default (not customized)
                if (currentProject && isDefaultTitle(currentProject.title) && userPrompt) {
                  setTimeout(async () => {
                    try {
                      // Use AI to generate a smart title based on prompt only
                      const smartTitle = await AIService.generateTitle(userPrompt);
                      if (smartTitle && smartTitle !== 'Untitled') {
                        console.log('[Panel] AI-generated title:', smartTitle);
                        const updatedProject = await StorageService.updateProject(
                          currentProject.id,
                          {
                            title: smartTitle,
                          }
                        );
                        if (updatedProject) {
                          setCurrentProject(updatedProject);
                          currentProjectRef.current = updatedProject;
                          await loadProjects();
                        }
                      }
                    } catch (error) {
                      console.error('[Panel] Failed to AI-generate title, falling back to simple extraction:', error);
                      // Fallback to simple title extraction
                      const fallbackTitle = generateSmartTitle(finalContent);
                      if (fallbackTitle && fallbackTitle !== 'Untitled') {
                        try {
                          const updatedProject = await StorageService.updateProject(
                            currentProject.id,
                            { title: fallbackTitle }
                          );
                          if (updatedProject) {
                            setCurrentProject(updatedProject);
                            currentProjectRef.current = updatedProject;
                            await loadProjects();
                          }
                        } catch (e) {
                          console.error('[Panel] Fallback title update failed:', e);
                        }
                      }
                    }
                  }, 500);
                }

                // Reset AI flag after streaming completes
                isAIGeneratedRef.current = false;
              }
            );

            console.log(
              `[Panel] Generate operation completed with streaming, ${hasSelection ? 'replaced selection' : 'inserted at cursor'} at position ${capturedSelection.start}-${endPosition}`
            );
          } catch (error) {
            console.error('[Panel] Streaming failed:', error);
            // Fallback: just insert/replace the text
            const endPosition =
              capturedSelection.start !== capturedSelection.end
                ? capturedSelection.end
                : capturedSelection.start;
            const beforeSelection = editorContent.substring(0, capturedSelection.start);
            const afterSelection = editorContent.substring(endPosition);
            const newContent = beforeSelection + result + afterSelection;
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

              // Auto-generate title using AI if project title is default (not customized)
              if (currentProject && isDefaultTitle(currentProject.title) && userPrompt) {
                setTimeout(async () => {
                  try {
                    // Use AI to generate a smart title based on prompt only
                    const smartTitle = await AIService.generateTitle(userPrompt);
                    if (smartTitle && smartTitle !== 'Untitled') {
                      console.log('[Panel] AI-generated title:', smartTitle);
                      const updatedProject = await StorageService.updateProject(currentProject.id, {
                        title: smartTitle,
                      });
                      if (updatedProject) {
                        setCurrentProject(updatedProject);
                        currentProjectRef.current = updatedProject;
                        await loadProjects();
                      }
                    }
                  } catch (error) {
                    console.error('[Panel] Failed to AI-generate title, falling back to simple extraction:', error);
                    // Fallback to simple title extraction
                    const fallbackTitle = generateSmartTitle(finalContent);
                    if (fallbackTitle && fallbackTitle !== 'Untitled') {
                      try {
                        const updatedProject = await StorageService.updateProject(currentProject.id, {
                          title: fallbackTitle,
                        });
                        if (updatedProject) {
                          setCurrentProject(updatedProject);
                          currentProjectRef.current = updatedProject;
                          await loadProjects();
                        }
                      } catch (e) {
                        console.error('[Panel] Fallback title update failed:', e);
                      }
                    }
                  }
                }, 500);
              }
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

      // If current project was updated, refresh it too (use ref to avoid dependency)
      const currentProj = currentProjectRef.current;
      if (currentProj) {
        const updatedCurrentProject = loadedProjects.find((p) => p.id === currentProj.id);
        if (updatedCurrentProject) {
          setCurrentProject(updatedCurrentProject);
          // Only log if title actually changed to reduce noise
          if (currentProj.title !== updatedCurrentProject.title) {
            console.log(
              '[Panel] Current project refreshed after update:',
              updatedCurrentProject.title
            );
          }
        }
      }
    } catch (error) {
      console.error('[Panel] Failed to load projects:', error);
    }
  }, []); // No dependencies - use refs for stable reference

  /**
   * Load pinned notes from storage
   */
  const loadPinnedNotes = useCallback(async () => {
    try {
      const notes = await StorageService.getPinnedNotes();
      setPinnedNotes(notes);
    } catch (error) {
      console.error('[Panel] Failed to load pinned notes:', error);
    }
  }, []);

  /**
   * Reload pinned notes when switching tabs (to sync with Settings changes)
   */
  useEffect(() => {
    loadPinnedNotes();
  }, [state.activeTab, loadPinnedNotes]);

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
   * Gets the default title for a new project
   * First project: "My first project"
   * Subsequent projects: "My project"
   */
  const getDefaultProjectTitle = useCallback(async (): Promise<string> => {
    const allProjects = await StorageService.getProjects();
    // Check if this is the first project (excluding current one if it exists)
    const existingProjects = allProjects.filter((p) => p.id !== currentProject?.id);
    return existingProjects.length === 0 ? 'My first project' : 'My project';
  }, [currentProject]);

  /**
   * Checks if a title is a default title that can be auto-replaced
   */
  const isDefaultTitle = (title: string): boolean => {
    const defaultTitles = ['Untitled', 'Untitled Project', 'My project', 'My first project', 'My First Project'];
    return defaultTitles.includes(title);
  };

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

      // Get appropriate default title
      const defaultTitle = await getDefaultProjectTitle();

      // Create new project with smart default title
      const newProject = await StorageService.createProject(defaultTitle, '');
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

      console.log('[Panel] Created new project:', newProject.id, 'with title:', defaultTitle);
    } catch (error) {
      console.error('[Panel] Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  }, [
    currentProject,
    editorContent,
    autoSaveProject,
    actions,
    loadProjects,
    getDefaultProjectTitle,
  ]);

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

      // Set up download progress callback for models that need downloading
      AIService.setDownloadProgressCallback((progress) => {
        setAiDownloadProgress(progress);
        if (progress >= 1) {
          // Download complete, hide progress after 2 seconds
          setTimeout(() => setAiDownloadProgress(null), 2000);
        }
      });

      // Pre-warm AI models for faster first use (runs in parallel)
      AIService.checkAvailability()
        .then((availability) => {
          const needsDownload =
            availability.summarizerAPI === 'after-download' ||
            availability.rewriterAPI === 'after-download' ||
            availability.writerAPI === 'after-download';

          if (needsDownload) {
            console.log('[Panel] AI models need download, pre-warming with progress...');
            return AIService.prewarmModels();
          } else {
            console.log('[Panel] AI models available, pre-warming silently...');
            // Clear progress callback for silent warmup
            AIService.setDownloadProgressCallback(null);
            return AIService.prewarmModels();
          }
        })
        .catch((error) => {
          console.error('[Panel] AI warmup failed:', error);
        });

      await loadProjects();
      await loadPinnedNotes();

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
   * Auto-close pinned notes panel when switching to non-editor tabs
   */
  useEffect(() => {
    const nonEditorTabs = ['settings', 'projects', 'home'];
    if (nonEditorTabs.includes(state.activeTab) && isPinnedNotesPanelOpen) {
      setIsPinnedNotesPanelOpen(false);
    }
  }, [state.activeTab, isPinnedNotesPanelOpen]);

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
            state.activeTab === 'home' ||
            isPinnedNotesPanelOpen
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

      {/* Pinned Notes Panel */}
      <PinnedNotesPanel
        pinnedNotes={pinnedNotes}
        activePinnedNoteIds={activePinnedNoteIds}
        onToggleNote={(noteId) => {
          setActivePinnedNoteIds((prev) =>
            prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
          );
        }}
        onToggleAll={() => {
          setActivePinnedNoteIds(pinnedNotes.map((note) => note.id));
        }}
        onToggleNone={() => {
          setActivePinnedNoteIds([]);
        }}
        isOpen={isPinnedNotesPanelOpen}
        onToggle={() => setIsPinnedNotesPanelOpen(!isPinnedNotesPanelOpen)}
        hideToggle={
          state.activeTab === 'settings' ||
          state.activeTab === 'projects' ||
          state.activeTab === 'home' ||
          state.isHistoryPanelOpen
        }
      />

      {/* AI Download Progress indicator - centered modal */}
      {aiDownloadProgress !== null && aiDownloadProgress < 1 && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
          />
          {/* Modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 'var(--fs-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              minWidth: '300px',
              maxWidth: '400px',
            }}
            role="status"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span style={{ fontWeight: 500, fontSize: 'var(--fs-md)' }}>
                Downloading AI model...
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--surface-2)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(aiDownloadProgress * 100)}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 'var(--fs-sm)', opacity: 0.7, textAlign: 'center' }}>
              {Math.round(aiDownloadProgress * 100)}% - First use only, ~1-2 min
            </span>
          </div>
        </>
      )}

      {/* Save indicator removed - now shown as icon in editor header */}

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
                  padding: '24px 14px 24px 14px', // Reduced right padding
                  paddingRight: '8px', // Less space on right side
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

                    {/* Save button */}
                    <button
                      onClick={async () => {
                        if (currentProject && editorContent) {
                          // Clear existing timeout
                          if (autoSaveTimeoutRef.current) {
                            clearTimeout(autoSaveTimeoutRef.current);
                          }
                          // Save immediately
                          await autoSaveProject(currentProject.id, editorContent);
                        }
                      }}
                      disabled={!currentProject || isSaving}
                      aria-label={
                        isSaving
                          ? 'Saving...'
                          : justSaved
                            ? 'Saved!'
                            : saveError
                              ? 'Save failed'
                              : 'Save'
                      }
                      title={
                        isSaving
                          ? 'Saving...'
                          : justSaved
                            ? 'Saved!'
                            : saveError
                              ? saveError
                              : 'Save project'
                      }
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
                        color: saveError
                          ? 'var(--error)'
                          : justSaved
                            ? 'var(--success, #10b981)'
                            : 'var(--text-muted)',
                        cursor: currentProject && !isSaving ? 'pointer' : 'not-allowed',
                        opacity: currentProject ? 1 : 0.5,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (currentProject && !isSaving && !justSaved) {
                          e.currentTarget.style.background = 'var(--surface-2)';
                          e.currentTarget.style.color = saveError ? 'var(--error)' : 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = saveError
                          ? 'var(--error)'
                          : justSaved
                            ? 'var(--success, #10b981)'
                            : 'var(--text-muted)';
                      }}
                    >
                      {isSaving ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animation: 'spin 1s linear infinite' }}
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : justSaved ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      )}
                    </button>

                    {/* Copy button */}
                    <button
                      onClick={() => {
                        // Get textarea and check for selection
                        const textarea = unifiedEditorRef.current?.getTextarea();
                        const selection = unifiedEditorRef.current?.getCapturedSelection();

                        let textToCopy = editorContent;

                        // If there's a selection, copy only the selected text
                        if (textarea && selection && selection.start !== selection.end) {
                          textToCopy = editorContent.substring(selection.start, selection.end);
                          console.log('[Panel] Copying selected text');
                        } else {
                          console.log('[Panel] Copying all content');
                        }

                        if (textToCopy) {
                          navigator.clipboard
                            .writeText(textToCopy)
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
                      title="Copy selected text (or all if nothing selected)"
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
                  undoHistoryLimit={state.settings.undoHistoryLimit || 10}
                />

                {/* Tool-specific controls - only one visible at a time */}
                {state.activeTab === 'generate' && (
                  <ToolControlsContainer
                    activeTool="generate"
                    pinnedNotes={pinnedNotes.filter((note) => activePinnedNoteIds.includes(note.id))}
                    content={editorContent}
                    projectTitle={currentProject?.title}
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
                    pinnedNotes={pinnedNotes.filter((note) => activePinnedNoteIds.includes(note.id))}
                    content={editorContent}
                    projectTitle={currentProject?.title}
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
                    pinnedNotes={pinnedNotes.filter((note) => activePinnedNoteIds.includes(note.id))}
                    content={editorContent}
                    projectTitle={currentProject?.title}
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
                activePinnedNoteIds={activePinnedNoteIds}
                onSettingsChange={actions.setSettings}
                onPinnedNotesChange={actions.setPinnedNotes}
                onActivePinnedNoteIdsChange={setActivePinnedNoteIds}
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
