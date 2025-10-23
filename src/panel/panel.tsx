import { useState, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RewritePanel } from '../components/RewritePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { Settings } from '../components/Settings';
import { Sidebar, NavigationItem } from '../components/Sidebar';

type Tab = 'voice' | 'rewrite' | 'summary' | 'settings';

/**
 * Main panel component with sidebar navigation
 */
function Panel() {
  const [activeTab, setActiveTab] = useState<Tab>('rewrite');

  // Reordered: Rewrite, Summary, Voice, Settings
  const navigationItems: NavigationItem[] = [
    { id: 'rewrite', label: 'Rewrite', icon: 'edit' },
    { id: 'summary', label: 'Summary', icon: 'list' },
    { id: 'voice', label: 'Voice', icon: 'mic' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Load last selected tab from storage on mount
  useEffect(() => {
    chrome.storage.local.get({ 'flint.lastTab': 'rewrite' }).then((result) => {
      setActiveTab(result['flint.lastTab'] as Tab);
    });
  }, []);

  const handleNavigate = (id: string) => {
    const newTab = id as Tab;
    setActiveTab(newTab);
    // Save to storage
    chrome.storage.local.set({ 'flint.lastTab': newTab });
  };

  return (
    <div className="flint-bg h-screen relative">
      <Sidebar items={navigationItems} activeItemId={activeTab} onNavigate={handleNavigate} />

      <div className={`content-area ${activeTab ? 'expanded' : ''}`}>
        {activeTab && (
          <>
            {activeTab === 'voice' && <VoiceRecorder />}
            {activeTab === 'rewrite' && <RewritePanel />}
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
