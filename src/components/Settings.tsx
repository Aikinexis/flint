import { useState, useEffect } from 'react';

/**
 * Settings component with theme toggle
 * Applies Gestalt similarity: settings controls share consistent layout
 */
export function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check initial theme
    const root = document.documentElement;
    const isLight = root.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    if (newTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }

    setTheme(newTheme);
  };

  return (
    <div className="flint-section">
      <h2 className="flint-section-header">Settings</h2>

      {/* Setting row - consistent layout */}
      <div
        className="flex items-center justify-between border-b border-border-muted"
        style={{ paddingTop: '12px', paddingBottom: '12px' }}
      >
        <div>
          <div className="text-text text-sm font-medium">Theme</div>
          <div className="text-text-muted text-xs mt-1">
            Switch between light and dark mode
          </div>
        </div>
        <button
          className="flint-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1v2M8 13v2M15 8h-2M3 8H1M13.5 2.5l-1.4 1.4M3.9 12.1l-1.4 1.4M13.5 13.5l-1.4-1.4M3.9 3.9L2.5 2.5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 5 11.9A5.5 5.5 0 0 1 8 1z" />
            </svg>
          )}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Additional settings can follow same pattern */}
      <div
        className="flex items-center justify-between"
        style={{ paddingTop: '12px', paddingBottom: '12px' }}
      >
        <div>
          <div className="text-text text-sm font-medium">Language</div>
          <div className="text-text-muted text-xs mt-1">
            Voice recognition language
          </div>
        </div>
        <select className="flint-input" style={{ width: '120px', height: '36px' }}>
          <option>English</option>
          <option>Spanish</option>
          <option>French</option>
        </select>
      </div>
    </div>
  );
}
