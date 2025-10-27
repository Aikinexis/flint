import { useState, useEffect, useRef } from 'react';
import { SpeechService, SpeechError } from '../services/speech';

/**
 * VoiceButton component props
 */
export interface VoiceButtonProps {
  /**
   * Callback when transcript is complete
   */
  onTranscript: (text: string) => void;
  
  /**
   * Language for speech recognition (e.g., 'en-US')
   */
  language?: string;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

/**
 * Compact voice recording button for inline use in panels
 * Provides recording controls and real-time transcript feedback
 */
export function VoiceButton({ 
  onTranscript, 
  language = 'en-US',
  disabled = false,
}: VoiceButtonProps) {
  // Component state
  const [isRecording, setIsRecording] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
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

    speechService.onFinalResult((text: string) => {
      setPartialTranscript('');
      setError(null);
      onTranscript(text);
    });

    speechService.onError((_errorType: SpeechError, message: string) => {
      setError(message);
      setIsRecording(false);
    });

    // Cleanup on unmount
    return () => {
      speechService.cleanup();
    };
  }, [onTranscript]);

  /**
   * Handles record button click
   */
  const handleRecord = () => {
    if (!speechServiceRef.current || disabled) return;

    if (isRecording) {
      // Stop recording
      speechServiceRef.current.stop();
      setIsRecording(false);
    } else {
      // Start recording
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
        console.error('[VoiceButton] Failed to start recording:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to start recording. Please try again.');
        }
      }
    }
  };

  /**
   * Render microphone icon
   */
  const renderMicIcon = () => (
    <svg
      width="16"
      height="16"
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
    <div style={{ position: 'relative' }}>
      <button
        className={`flint-btn ${isRecording ? 'recording' : 'ghost'}`}
        onClick={handleRecord}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        title={isRecording ? 'Stop recording' : 'Voice input'}
      >
        {renderMicIcon()}
      </button>

      {/* Partial transcript tooltip */}
      {partialTranscript && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: '0',
            marginBottom: '8px',
            padding: '8px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-muted)',
            maxWidth: '300px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
          role="status"
          aria-live="polite"
        >
          {partialTranscript}
        </div>
      )}

      {/* Error tooltip */}
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: '0',
            marginBottom: '8px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--fs-sm)',
            color: '#ef4444',
            maxWidth: '300px',
            whiteSpace: 'normal',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
