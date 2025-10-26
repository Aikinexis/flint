import { useState, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RewritePanel } from '../components/RewritePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { Settings } from '../components/Settings';
import { WelcomePanel } from '../components/WelcomePanel';
import { CompareView } from '../components/CompareView';
import { History } from '../components/History';
import { Sidebar, NavigationItem } from '../components/Sidebar';

type Tab = 'home' | 'voice' | 'rewrite' | 'summary' | 'history' | 'settings';

/**
 * Main panel component with sidebar navigation
 */
function Panel() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [compareMode, setCompareMode] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');

  // Reordered: Rewrite, Summary, Voice, History, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'voice', label: 'Voice', icon: 'mic' },
    { id: 'history', label: 'History', icon: 'clock' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Load last selected tab from storage on mount
  useEffect(() => {
    chrome.storage.local.get({ 'flint.lastTab': 'home' }).then((result) => {
      setActiveTab(result['flint.lastTab'] as Tab);
    });
  }, []);

  // Apply theme classes on mount based on saved settings
  useEffect(() => {
    chrome.storage.local.get('settings').then((result) => {
      if (result.settings) {
        const settings = result.settings;
        
        // Apply light mode class
        if (settings.theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
        
        // Apply custom accent hue
        if (settings.accentHue !== undefined) {
          document.documentElement.style.setProperty('--accent-hue', settings.accentHue.toString());
        }
      }
    });
  }, []);

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
        case 'OPEN_VOICE_TAB':
          setActiveTab('voice');
          setCompareMode(false);
          chrome.storage.local.set({ 'flint.lastTab': 'voice' });
          sendResponse({ success: true, data: { message: 'Opened Voice tab' } });
          break;

        case 'OPEN_SUMMARY_TAB':
          setActiveTab('summary');
          setCompareMode(false);
          // Store the selected text for the summary panel to use
          if (message.payload?.text) {
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
          setActiveTab('rewrite');
          setCompareMode(false);
          // Store the selected text for the rewrite panel to use
          if (message.payload?.text) {
            setOriginalText(message.payload.text);
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
  }, []);

  const handleNavigate = (id: string) => {
    const newTab = id as Tab;
    setActiveTab(newTab);
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
    setCompareMode(true);
    console.log('[Panel] Navigating to CompareView');
  };

  /**
   * Handle accept in CompareView - replace text in source field
   * Sends REPLACE_TEXT message to content script with rewritten text
   * Handles success/failure responses and clipboard fallback
   */
  const handleAccept = async () => {
    console.log('[Panel] User accepted rewritten text');
    
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        console.warn('[Panel] No active tab found');
        // Fallback to clipboard when no active tab
        await navigator.clipboard.writeText(rewrittenText);
        alert('Unable to replace text automatically. The result has been copied to your clipboard.');
        setCompareMode(false);
        setOriginalText('');
        setRewrittenText('');
        return;
      }

      // Send REPLACE_TEXT message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'REPLACE_TEXT',
        payload: {
          text: rewrittenText,
        },
      });

      // Handle success response
      if (response?.success) {
        // Check if clipboard fallback was used
        if (response.data?.usedClipboard) {
          console.log('[Panel] Text copied to clipboard (direct replacement not supported)');
          alert(response.data.message || 'Unable to replace text automatically. The result has been copied to your clipboard.');
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
        console.warn('[Panel] Text replacement failed:', response?.error);
        
        // Attempt clipboard fallback
        try {
          await navigator.clipboard.writeText(rewrittenText);
          alert(response?.error 
            ? `${response.error}\n\nThe result has been copied to your clipboard.`
            : 'Unable to replace text automatically. The result has been copied to your clipboard.');
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
      <Sidebar items={navigationItems} activeItemId={activeTab} onNavigate={handleNavigate} />

      <div className={`content-area ${activeTab ? 'expanded' : ''}`}>
        {activeTab && (
          <>
            {activeTab === 'home' && <WelcomePanel />}
            {activeTab === 'voice' && <VoiceRecorder />}
            {activeTab === 'rewrite' && (
              compareMode ? (
                <CompareView
                  originalText={originalText}
                  rewrittenText={rewrittenText}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ) : (
                <RewritePanel 
                  initialText={originalText}
                  onRewriteComplete={handleRewriteComplete} 
                />
              )
            )}
            {activeTab === 'summary' && <SummaryPanel />}
            {activeTab === 'history' && <History />}
            {activeTab === 'settings' && <Settings />}
          </>
        )}
      </div>
    </div>
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
