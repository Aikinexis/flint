import { useState, useEffect, useRef } from 'react';
import { SpeechService, SpeechError } from '../services/speech';
import { messagingService } from '../services/messaging';

/**
 * VoiceRecorder component props
 */
export interface VoiceRecorderProps {
  /**
   * Callback when transcript is complete and ready to insert
   */
  onTranscriptComplete?: (text: string) => void;
  
  /**
   * Language for speech recognition (e.g., 'en-US')
   */
  language?: string;
}

/**
 * VoiceRecorder component for voice-to-text capture
 * Provides recording controls, real-time transcript display, and insert functionality
 */
export function VoiceRecorder({ 
  onTranscriptComplete, 
  language = 'en-US' 
}: VoiceRecorderProps) {
  // Component state
  const [isRecording, setIsRecording] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Speech service reference
  const speechServiceRef = useRef<SpeechService | null>(null);

  /**
   * Initialize speech service on mount
   */
  useEffect(() => {
    if (!SpeechService.isSupported()) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const speechService = new SpeechService();
    speechServiceRef.current = speechService;

    // Set up event callbacks
    speechService.onPartialResult((text: string) => {
      setPartialTranscript(text);
      setError(null);
    });

    speechService.onFinalResult((text: string, conf: number) => {
      setFinalTranscript(text);
      setPartialTranscript('');
      setConfidence(conf);
      setError(null);
    });

    speechService.onError((_errorType: SpeechError, message: string) => {
      setError(message);
      setIsRecording(false);
    });

    // Cleanup on unmount
    return () => {
      speechService.cleanup();
    };
  }, []);

  /**
   * Handles record button click
   */
  const handleRecord = () => {
    if (!speechServiceRef.current) return;

    if (isRecording) {
      // Stop recording
      speechServiceRef.current.stop();
      setIsRecording(false);
    } else {
      // Start recording - SpeechRecognition will request permission automatically
      setError(null);
      setPartialTranscript('');
      
      try {
        speechServiceRef.current.start({
          language,
          continuous: false,
          interimResults: true,
        });
        setIsRecording(true);
      } catch (error) {
        console.error('[VoiceRecorder] Failed to start recording:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to start recording. Please try again.');
        }
      }
    }
  };

  /**
   * Handles insert button click
   * Sends INSERT_TEXT message to content script via messaging service
   */
  const handleInsert = async () => {
    if (!finalTranscript) {
      return;
    }

    try {
      // Use messaging service to insert text
      const result = await messagingService.insertText(finalTranscript);

      if (result.success) {
        // Show success feedback
        console.log('[VoiceRecorder] Text inserted successfully:', result.data);
        
        // If clipboard fallback was used, show a different message
        if (result.usedClipboard) {
          setError('Text copied to clipboard. Please paste it manually.');
        } else {
          // Clear transcript after successful insertion
          handleClear();
          
          // Optionally call the callback if provided
          if (onTranscriptComplete) {
            onTranscriptComplete(finalTranscript);
          }
        }
      } else {
        // Show error message
        const errorMessage = result.error || 'Failed to insert text';
        console.error('[VoiceRecorder] Insert failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('[VoiceRecorder] Error inserting text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to insert text. Please try again.';
      setError(errorMessage);
    }
  };

  /**
   * Handles clear button click
   * Resets all transcript state, confidence, and errors
   */
  const handleClear = () => {
    setFinalTranscript('');
    setPartialTranscript('');
    setConfidence(null);
    setError(null);
  };

  /**
   * Handles retry button click after an error
   * Clears error state and attempts to start recording again
   */
  const handleRetry = async () => {
    setError(null);
    await handleRecord();
  };

  /**
   * Render microphone icon
   */
  const renderMicIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );

  return (
    <div className="flint-section flex flex-col h-full">
      <h2 className="flint-section-header">Generate</h2>

      {/* Transcript Area - scrollable, no border */}
      <div className="flex-1 flex flex-col min-h-0" style={{ marginBottom: '16px', position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        {/* Clear button - top right, always show when there's any text */}
        {(finalTranscript.trim() || partialTranscript.trim()) && (
          <button
            onClick={handleClear}
            disabled={isRecording}
            aria-label="Clear transcript"
            title="Clear all"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'var(--bg)',
              color: 'var(--text-muted)',
              cursor: isRecording ? 'not-allowed' : 'pointer',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.15s ease',
              zIndex: 100,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              if (!isRecording) {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRecording) {
                e.currentTarget.style.background = 'var(--bg)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        
        <div 
          style={{ 
            width: '100%',
            height: '100%',
            padding: '16px',
            overflow: 'auto',
            color: 'var(--text)',
            fontSize: 'var(--fs-md)',
            lineHeight: '1.6',
          }}
        >
          {/* Partial transcript (gray) */}
          {partialTranscript && !finalTranscript && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {partialTranscript}
            </div>
          )}

          {/* Final transcript (normal) */}
          {finalTranscript && (
            <div style={{ color: 'var(--text)' }}>
              {finalTranscript}
            </div>
          )}

          {/* Placeholder when empty */}
          {!partialTranscript && !finalTranscript && !error && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {isRecording ? 'Listening...' : 'Click Record to start speaking'}
            </div>
          )}
        </div>
      </div>

      {/* Transcribe Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          className={`flint-btn ${isRecording ? 'recording' : 'primary'} transcribe-btn`}
          onClick={handleRecord}
          aria-label={isRecording ? 'Stop transcribing' : 'Start transcribing'}
          aria-live="polite"
          onMouseEnter={(e) => {
            e.currentTarget.setAttribute('data-hovered', 'true');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.removeAttribute('data-hovered');
          }}
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            border: isRecording ? undefined : 'none',
            boxShadow: isRecording ? undefined : 'none',
          }}
        >
          {renderMicIcon()}
          <span
            style={{
              maxWidth: isRecording ? '100px' : '0',
              opacity: isRecording ? 1 : 0,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            className="transcribe-text"
          >
            {isRecording ? 'Stop' : 'Transcribe'}
          </span>
        </button>
      </div>

      {/* Insert and Clear Buttons */}
      <div className="flint-button-group" style={{ marginBottom: '16px' }}>
        <button
          className="flint-btn secondary"
          onClick={handleInsert}
          disabled={!finalTranscript}
          aria-label="Insert transcript"
          style={{ flex: 1 }}
        >
          Insert
        </button>
        <button
          className="flint-btn ghost"
          onClick={handleClear}
          disabled={!finalTranscript && !partialTranscript}
          aria-label="Clear transcript"
        >
          Clear
        </button>
      </div>

      {/* Visual Recording Indicator */}
      {isRecording && (
        <div 
          style={{ 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--danger)',
            fontSize: 'var(--fs-sm)',
            fontWeight: 500,
          }}
          role="status"
          aria-live="polite"
        >
          <span 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--danger)',
              animation: 'recording-pulse 1.5s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
          Recording...
        </div>
      )}

      {/* Confidence Indicator */}
      {confidence !== null && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: 'var(--fs-sm)', 
            color: 'var(--text-muted)', 
            marginBottom: '4px' 
          }}>
            Confidence: {Math.round(confidence * 100)}%
          </div>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: 'var(--surface-2)', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${confidence * 100}%`, 
              height: '100%', 
              background: 'var(--success)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: 'var(--fs-sm)',
            color: '#ef4444',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ flex: 1 }}>{error}</span>
          </div>
          <button
            className="flint-btn ghost"
            onClick={handleRetry}
            aria-label="Retry recording"
            style={{
              fontSize: 'var(--fs-xs)',
              height: '32px',
              padding: '0 12px',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// Add hover styles for transcribe button
const style = document.createElement('style');
style.textContent = `
  .transcribe-btn:not(.recording) {
    border: none !important;
    box-shadow: none !important;
  }
  
  .transcribe-btn:not(.recording):hover,
  .transcribe-btn:not(.recording):focus-visible {
    border: 1px solid var(--primary) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }
  
  .flint-btn[data-hovered] .transcribe-text {
    max-width: 100px !important;
    opacity: 1 !important;
  }
`;
if (!document.getElementById('voice-recorder-styles')) {
  style.id = 'voice-recorder-styles';
  document.head.appendChild(style);
}
