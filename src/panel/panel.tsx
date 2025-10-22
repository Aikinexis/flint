import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';

/**
 * Main panel component - placeholder demonstrating design system
 */
function Panel() {
  return (
    <div className="flint-bg min-h-screen p-4">
      <div className="flint-surface p-6 mb-4">
        <h1 className="text-2xl mb-2">Flint Panel</h1>
        <p className="text-muted mb-4">Chrome extension with design tokens and Tailwind</p>
        <div className="flex gap-2">
          <button className="flint-btn primary">Primary Button</button>
          <button className="flint-btn">Secondary Button</button>
          <button className="flint-btn ghost">Ghost Button</button>
        </div>
      </div>

      <div className="flint-card p-4 mb-4">
        <h2 className="text-lg mb-2">Input Examples</h2>
        <input
          type="text"
          className="flint-input w-full mb-2"
          placeholder="Type something..."
        />
        <textarea
          className="flint-textarea w-full"
          placeholder="Enter longer text here..."
          rows={3}
        />
      </div>

      <div className="bg-surface2 border border-stroke rounded-lg p-4">
        <h2 className="text-sm text-muted uppercase tracking-wide mb-2">Tailwind Utilities</h2>
        <p className="text-text">
          This demonstrates both custom Flint classes and Tailwind utilities working together.
        </p>
        <div className="flex gap-2 mt-3">
          <span className="flint-badge">Badge 1</span>
          <span className="flint-badge">Badge 2</span>
        </div>
      </div>
    </div>
  );
}

// Mount the React app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Panel />
    </React.StrictMode>
  );
}
