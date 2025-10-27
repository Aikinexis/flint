import { useState, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { AppProvider, useAppState } from '../state';
import { GeneratePanel } from '../components/GeneratePanel';
import { RewritePanel } from '../components/RewritePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { Settings } from '../components/Settings';
import { WelcomePanel } from '../components/WelcomePanel';
import { CompareView } from '../components/CompareView';
import { History } from '../components/History';
import { Sidebar, NavigationItem } from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { messagingService } from '../services/messaging';
import type { Tab } from '../state/store';

/**
 * Main panel component with sidebar navigation
 * Wrapped with AppProvider for state management
 */
function PanelContent() {
  const { state, actions } = useAppState();
  const [compareMode, setCompareMode] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  
  // Track which panels have been visited to lazy mount them
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['home']));

  // Navigation order: Generate, Rewrite, Summary, History, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'generate', label: 'Generate', icon: 'sparkles' },
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'history', label: 'History', icon: 'clock' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Load last selected tab from storage on mount
  useEffect(() => {
    chrome.storage.local.get({ 'flint.lastTab': 'home' }).then((result) => {
      const tab = result['flint.lastTab'] as Tab;
      actions.setActiveTab(tab);
      // Mark initial tab as visited
      setVisitedTabs(prev => new Set(prev).add(tab));
    });
  }, [actions]);

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
        case 'OPEN_GENERATE_TAB':
          actions.setActiveTab('generate');
          setVisitedTabs(prev => new Set(prev).add('generate'));
          setCompareMode(false);
          chrome.storage.local.set({ 'flint.lastTab': 'generate' });
          sendResponse({ success: true, data: { message: 'Opened Generate tab' } });
          break;

        case 'OPEN_SUMMARY_TAB':
          actions.setActiveTab('summary');
          setVisitedTabs(prev => new Set(prev).add('summary'));
          setCompareMode(false);
          // Store the selected text for the summary panel to use
          if (message.payload?.text) {
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
          setCompareMode(false);
          // Store the selected text for the rewrite panel to use
          if (message.payload?.text) {
            setOriginalText(message.payload.text);
            actions.setCurrentText(message.payload.text);
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
    const newTab = id as Tab;
    actions.setActiveTab(newTab);
    // Mark tab as visited for lazy mounting
    setVisitedTabs(prev => new Set(prev).add(newTab));
    // Clear compare mode when navigating away
    setCompareMode(false);
    // Save to storage
    chrome.storage.local.set({ 'flint.lastTab': newTab });
  };

  /**
   * Handle rewrite completion - navigate to CompareView
   */
  const handleRewriteComplete = (original: string, rewritten: string) => {
    setOriginalText(original);
    setRewrittenText(rewritten);
    actions.setCurrentText(original);
    actions.setCurrentResult(rewritten);
    setCompareMode(true);
    console.log('[Panel] Navigating to CompareView');
  };

  /**
   * Handle accept in CompareView - replace text in source field
   * Uses messaging service to send REPLACE_TEXT message to content script
   * Handles success/failure responses and clipboard fallback
   */
  const handleAccept = async () => {
    console.log('[Panel] User accepted rewritten text');
    
    try {
      // Use messaging service to replace text
      const result = await messagingService.replaceText(rewrittenText);

      if (result.success) {
        // Check if clipboard fallback was used
        if (result.usedClipboard) {
          console.log('[Panel] Text copied to clipboard (direct replacement not supported)');
          const message = result.data?.message || 'Unable to replace text automatically. The result has been copied to your clipboard.';
          alert(message);
        } else {
          console.log('[Panel] Text replaced successfully in page');
          // Show brief success message (optional - could use a toast notification)
          // For now, just log success
        }
        
        // Close compare view after successful replacement
        setCompareMode(false);
        setOriginalText('');
        setRewrittenText('');
      } else {
        // Handle failure response
        console.warn('[Panel] Text replacement failed:', result.error);
        
        // Attempt clipboard fallback
        try {
          await navigator.clipboard.writeText(rewrittenText);
          const errorMessage = result.error 
            ? `${result.error}\n\nThe result has been copied to your clipboard.`
            : 'Unable to replace text automatically. The result has been copied to your clipboard.';
          alert(errorMessage);
        } catch (clipboardError) {
          console.error('[Panel] Clipboard fallback also failed:', clipboardError);
          alert('Failed to replace text and copy to clipboard. Please copy the result manually from the compare view.');
          // Don't close compare view so user can still copy manually
          return;
        }
        
        // Close compare view after clipboard fallback
        setCompareMode(false);
        setOriginalText('');
        setRewrittenText('');
      }
    } catch (error) {
      console.error('[Panel] Error during text replacement:', error);
      
      // Attempt clipboard fallback on any error
      try {
        await navigator.clipboard.writeText(rewrittenText);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Error replacing text: ${errorMessage}\n\nThe result has been copied to your clipboard.`);
      } catch (clipboardError) {
        console.error('[Panel] Clipboard fallback failed:', clipboardError);
        alert('Failed to replace text and copy to clipboard. Please copy the result manually from the compare view.');
        // Don't close compare view so user can still copy manually
        return;
      }
      
      // Close compare view after clipboard fallback
      setCompareMode(false);
      setOriginalText('');
      setRewrittenText('');
    }
  };

  /**
   * Handle reject in CompareView - return to rewrite panel
   */
  const handleReject = () => {
    console.log('[Panel] User rejected rewritten text');
    // Just exit compare mode, keep the original text in the rewrite panel
    setCompareMode(false);
  };

  return (
    <div className="flint-bg h-screen relative">
      <Sidebar items={navigationItems} activeItemId={state.activeTab} onNavigate={handleNavigate} />

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
          
          {visitedTabs.has('generate') && (
            <div style={{ display: state.activeTab === 'generate' ? 'block' : 'none', height: '100%' }}>
              <GeneratePanel pinnedNotes={state.pinnedNotes} />
            </div>
          )}
          
          {visitedTabs.has('rewrite') && (
            <div style={{ display: state.activeTab === 'rewrite' ? 'block' : 'none', height: '100%' }}>
              {compareMode ? (
                <CompareView
                  originalText={originalText}
                  rewrittenText={rewrittenText}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ) : (
                <RewritePanel 
                  initialText={originalText}
                  pinnedNotes={state.pinnedNotes}
                  onRewriteComplete={handleRewriteComplete} 
                />
              )}
            </div>
          )}
          
          {visitedTabs.has('summary') && (
            <div style={{ display: state.activeTab === 'summary' ? 'block' : 'none', height: '100%' }}>
              <SummaryPanel pinnedNotes={state.pinnedNotes} />
            </div>
          )}
          
          {visitedTabs.has('history') && (
            <div style={{ display: state.activeTab === 'history' ? 'block' : 'none', height: '100%' }}>
              <History history={state.history} />
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
