import { useState } from 'react';

/**
 * Visual demo component showing all design tokens and Gestalt principles
 * Use this to verify the design system implementation
 */
export function VisualDemo() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
    <div className="flint-bg min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flint-toolbar mb-6">
          <h1 className="text-xl font-semibold">Flint Design System Demo</h1>
          <button 
            className="flint-btn" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Color Palette */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Color palette</h2>
          <div className="grid grid-cols-4 gap-3">
            <ColorSwatch label="Primary" color="var(--primary)" />
            <ColorSwatch label="Secondary" color="var(--secondary)" />
            <ColorSwatch label="Danger" color="var(--danger)" />
            <ColorSwatch label="Success" color="var(--success)" />
          </div>
        </div>

        {/* Buttons - Gestalt Similarity */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Buttons (similar actions look alike)</h2>
          
          <div className="mb-4">
            <p className="text-text-muted text-sm mb-2">Primary actions - all share same style:</p>
            <div className="flint-action-group">
              <button className="flint-btn primary">Record</button>
              <button className="flint-btn primary">Rewrite</button>
              <button className="flint-btn primary">Summarize</button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-text-muted text-sm mb-2">Secondary actions - all share same style:</p>
            <div className="flint-action-group">
              <button className="flint-btn">Copy</button>
              <button className="flint-btn">Insert</button>
              <button className="flint-btn">Export</button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-text-muted text-sm mb-2">Cancel/Clear actions - all share same style:</p>
            <div className="flint-action-group">
              <button className="flint-btn ghost">Cancel</button>
              <button className="flint-btn ghost">Clear</button>
              <button className="flint-btn ghost">Discard</button>
            </div>
          </div>

          <div>
            <p className="text-text-muted text-sm mb-2">Selected state - all share same style:</p>
            <div className="flint-action-group">
              <button className="flint-btn secondary">Active Tab</button>
              <button className="flint-btn secondary">Selected Tone</button>
              <button className="flint-btn secondary">Current Mode</button>
            </div>
          </div>
        </div>

        {/* Icon Buttons */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Icon buttons (same size, shape, spacing)</h2>
          <div className="flint-action-group">
            <button className="flint-icon-btn primary" aria-label="Record">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <circle cx="9" cy="9" r="7" />
              </svg>
            </button>
            <button className="flint-icon-btn primary" aria-label="Summarize">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="3" y="4" width="12" height="2" rx="1" />
                <rect x="3" y="8" width="8" height="2" rx="1" />
                <rect x="3" y="12" width="10" height="2" rx="1" />
              </svg>
            </button>
            <button className="flint-icon-btn primary" aria-label="Rewrite">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                <path d="M9 3L15 9L9 15M15 9H3" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Inputs (consistent border, radius, padding)</h2>
          <label htmlFor="demo-text-input" className="sr-only">
            Demo text input
          </label>
          <input
            id="demo-text-input"
            type="text"
            className="flint-input w-full mb-3"
            placeholder="Text input..."
            aria-label="Demo text input"
          />
          <label htmlFor="demo-textarea" className="sr-only">
            Demo textarea
          </label>
          <textarea
            id="demo-textarea"
            className="flint-textarea w-full"
            placeholder="Textarea..."
            rows={3}
            aria-label="Demo textarea"
          />
        </div>

        {/* Status Badges */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Status badges</h2>
          <div className="flint-action-group">
            <span className="flint-badge danger">Error</span>
            <span className="flint-badge warning">Warning</span>
            <span className="flint-badge success">Success</span>
            <span className="flint-badge info">Info</span>
          </div>
        </div>

        {/* Spacing & Alignment */}
        <div className="flint-section mb-4">
          <h2 className="flint-section-header">Spacing & alignment (8px gap, consistent)</h2>
          <div className="flint-action-group mb-3">
            <button className="flint-btn primary">Action 1</button>
            <button className="flint-btn primary">Action 2</button>
            <button className="flint-btn primary">Action 3</button>
          </div>
          <p className="text-text-muted text-xs">↑ All buttons have 8px gap between them</p>
        </div>

        {/* Focus States */}
        <div className="flint-section">
          <h2 className="flint-section-header">Focus states (tab to see)</h2>
          <p className="text-text-muted text-sm mb-3">
            Press Tab to navigate. All interactive elements show visible focus outline.
          </p>
          <div className="flint-action-group">
            <button className="flint-btn primary">Button 1</button>
            <button className="flint-btn">Button 2</button>
            <label htmlFor="demo-focus-input" className="sr-only">
              Demo focus input
            </label>
            <input 
              id="demo-focus-input"
              type="text" 
              className="flint-input" 
              placeholder="Input" 
              style={{ width: '150px' }}
              aria-label="Demo focus input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Color swatch component for palette display
 */
function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <div
        className="h-16 rounded-md border border-border-muted mb-2"
        style={{ background: color }}
        role="img"
        aria-label={`${label} color swatch`}
      />
      <p className="text-xs text-text-muted text-center">{label}</p>
    </div>
  );
}
