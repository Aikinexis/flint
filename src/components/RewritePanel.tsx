import { useState } from 'react';

/**
 * Rewrite panel with tone presets and custom prompt
 * Applies Gestalt similarity: tone buttons share size/shape, action buttons grouped separately
 */
export function RewritePanel() {
  const [selectedTone, setSelectedTone] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');

  const tones = [
    { id: 'formal', label: 'More formal' },
    { id: 'casual', label: 'More casual' },
    { id: 'concise', label: 'Make concise' },
    { id: 'expand', label: 'Expand' },
  ];

  const handleRewrite = () => {
    // Mock rewrite
    setOutputText(`Rewritten with ${selectedTone} tone: ${inputText}`);
  };

  return (
    <div className="flint-section">
      <h2 className="flint-section-header">Rewrite text</h2>

      {/* Input area */}
      <textarea
        className="flint-textarea w-full mb-3"
        placeholder="Paste or type text to rewrite..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={4}
      />

      {/* Tone presets - all share same visual attributes (similarity) */}
      <div className="mb-6">
        <label className="text-text-muted text-sm mb-2 block">Tone</label>
        <div className="flint-button-group-wrap">
          {tones.map((tone) => (
            <button
              key={tone.id}
              className={`flint-btn ${selectedTone === tone.id ? 'secondary' : ''}`}
              onClick={() => setSelectedTone(tone.id)}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt input */}
      <input
        type="text"
        className="flint-input w-full mb-6"
        placeholder="Or enter custom instruction..."
      />

      {/* Primary action group - visually distinct from tone buttons */}
      <div className="flint-button-group mb-6">
        <button className="flint-btn primary" onClick={handleRewrite}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2L14 8L8 14M14 8H2" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          Rewrite
        </button>
        <button className="flint-btn ghost">Cancel</button>
      </div>

      {/* Output area - only shown when there's output */}
      {outputText && (
        <>
          <div className="border-t border-border-muted pt-4 mt-4">
            <label className="text-text-muted text-sm mb-2 block">Result</label>
            <textarea
              className="flint-textarea w-full mb-3"
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              rows={4}
            />
          </div>

          {/* Secondary actions - aligned consistently */}
          <div className="flint-button-group">
            <button className="flint-btn primary">Accept & replace</button>
            <button className="flint-btn">Copy</button>
            <button className="flint-btn ghost">Discard</button>
          </div>
        </>
      )}
    </div>
  );
}
