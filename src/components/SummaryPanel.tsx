import { useState } from 'react';

/**
 * Summary panel with mode selection
 * Applies Gestalt similarity: mode buttons share visual attributes, actions grouped
 */
export function SummaryPanel() {
  const [selectedMode, setSelectedMode] = useState<string>('bullets');
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');

  const modes = [
    { id: 'bullets', label: 'Bullet points' },
    { id: 'paragraph', label: 'Paragraph' },
    { id: 'outline', label: 'Outline' },
  ];

  const handleSummarize = () => {
    // Mock summarize
    setSummary(`Summary (${selectedMode} mode):\n\n• Key point 1\n• Key point 2\n• Key point 3`);
  };

  return (
    <div className="flint-section">
      <h2 className="flint-section-header">Summarize text</h2>

      {/* Input area */}
      <textarea
        className="flint-textarea w-full mb-3"
        placeholder="Paste or type text to summarize..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={5}
      />

      {/* Mode selection - all buttons share same visual attributes */}
      <div className="mb-6">
        <label className="text-text-muted text-sm mb-2 block">Summary mode</label>
        <div className="flint-button-group">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={`flint-btn ${selectedMode === mode.id ? 'secondary' : ''}`}
              onClick={() => setSelectedMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary action group */}
      <div className="flint-button-group mb-6">
        <button className="flint-btn primary" onClick={handleSummarize}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="12" height="2" rx="1" />
            <rect x="2" y="7" width="8" height="2" rx="1" />
            <rect x="2" y="11" width="10" height="2" rx="1" />
          </svg>
          Summarize
        </button>
        <button className="flint-btn ghost">Clear</button>
      </div>

      {/* Output area */}
      {summary && (
        <>
          <div className="border-t border-border-muted pt-4 mt-4">
            <label className="text-text-muted text-sm mb-2 block">Summary</label>
            <textarea
              className="flint-textarea w-full mb-3"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
            />
          </div>

          {/* Secondary actions - consistent alignment */}
          <div className="flint-button-group">
            <button className="flint-btn">Copy</button>
            <button className="flint-btn">Insert</button>
          </div>
        </>
      )}
    </div>
  );
}
