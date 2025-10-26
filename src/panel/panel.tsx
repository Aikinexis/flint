import { useState, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RewritePanel } from '../components/RewritePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { Settings } from '../components/Settings';
import { WelcomePanel } from '../components/WelcomePanel';
import { CompareView } from '../components/CompareView';
import { Sidebar, NavigationItem } from '../components/Sidebar';

type Tab = 'home' | 'voice' | 'rewrite' | 'summary' | 'settings';

/**
 * Main panel component with sidebar navigation
 */
function Panel() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [compareMode, setCompareMode] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');

  // Reordered: Rewrite, Summary, Voice, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'voice', label: 'Voice', icon: 'mic' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Load last selected tab from storage on mount
  useEffect(() => {
    chrome.storage.local.get({ 'flint.lastTab': 'home' }).then((result) => {
      setActiveTab(result['flint.lastTab'] as Tab);
    });
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
   */
  const handleAccept = async () => {
    console.log('[Panel] User accepted rewritten text');
    
    try {
      // Send message to content script to replace text
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'REPLACE_TEXT',
          payload: {
            text: rewrittenText,
          },
        });

        if (response?.success) {
          console.log('[Panel] Text replaced successfully');
          // Clear compare mode and return to rewrite panel
          setCompareMode(false);
          setOriginalText('');
          setRewrittenText('');
        } else {
          console.warn('[Panel] Text replacement failed, falling back to clipboard');
          // Fallback to clipboard
          await navigator.clipboard.writeText(rewrittenText);
          alert('Unable to replace text automatically. The result has been copied to your clipboard.');
          // Still clear compare mode
          setCompareMode(false);
          setOriginalText('');
          setRewrittenText('');
        }
      } else {
        console.warn('[Panel] No active tab found');
        // Fallback to clipboard
        await navigator.clipboard.writeText(rewrittenText);
        alert('Unable to replace text automatically. The result has been copied to your clipboard.');
        setCompareMode(false);
        setOriginalText('');
        setRewrittenText('');
      }
    } catch (error) {
      console.error('[Panel] Failed to replace text:', error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(rewrittenText);
        alert('Unable to replace text automatically. The result has been copied to your clipboard.');
      } catch (clipboardError) {
        console.error('[Panel] Failed to copy to clipboard:', clipboardError);
        alert('Failed to replace text. Please copy the result manually.');
      }
      // Clear compare mode
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
