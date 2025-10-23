import { useState } from 'react';

/**
 * Voice recorder component with recording controls
 * Applies Gestalt similarity: all recording controls share same size, shape, spacing
 */
export function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handleRecord = () => {
    setIsRecording(!isRecording);
  };

  const handleClear = () => {
    setTranscript('');
  };

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">Voice to text</h2>

      {/* Primary action group - Record and Clear */}
      <div className="flint-button-group mb-6">
        <button
          className={`flint-btn ${isRecording ? 'secondary' : 'primary'}`}
          onClick={handleRecord}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="6" />
          </svg>
          {isRecording ? 'Stop' : 'Record'}
        </button>
        <button className="flint-btn ghost" onClick={handleClear}>
          Clear
        </button>
      </div>

      {/* Secondary actions - Insert and Copy - ABOVE text field */}
      <div className="flint-button-group mb-6">
        <button className="flint-btn">Insert at cursor</button>
        <button className="flint-btn ghost">Copy</button>
      </div>

      {/* Transcript area - fills remaining space with visible border */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          className="flint-textarea w-full h-full resize-none"
          placeholder="Your transcript will appear here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>
    </div>
  );
}
