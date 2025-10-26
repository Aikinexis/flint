/**
 * Speech recognition service for voice-to-text capture
 * Wraps Web Speech API with event-driven interface
 */

/**
 * Speech error types
 */
export type SpeechError = 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'unknown';

/**
 * Speech recognition options
 */
export interface SpeechOptions {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
}

/**
 * Speech result with confidence score
 */
export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Speech recognition service class
 */
export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isRecording = false;
  private noSpeechTimeout: number | null = null;
  private readonly NO_SPEECH_TIMEOUT_MS = 10000; // 10 seconds

  // Event callbacks
  private onPartialResultCallback: ((text: string) => void) | null = null;
  private onFinalResultCallback: ((text: string, confidence: number) => void) | null = null;
  private onErrorCallback: ((error: SpeechError, message: string) => void) | null = null;

  /**
   * Checks if speech recognition is supported in the browser
   * @returns True if SpeechRecognition API is available
   */
  static isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * Starts speech recognition
   * @param options - Speech recognition options
   * @throws Error if speech recognition is not supported
   */
  start(options: SpeechOptions): void {
    if (!SpeechService.isSupported()) {
      this.handleError('unknown', 'Speech recognition is not supported in this browser');
      return;
    }

    if (this.isRecording) {
      console.warn('[Speech] Recognition already active');
      return;
    }

    try {
      // Create recognition instance
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      this.recognition = recognition;

      // Configure recognition
      recognition.lang = options.language || 'en-US';
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.maxAlternatives = 1;

      // Set up event handlers
      this.setupEventHandlers();

      // Start recognition
      recognition.start();
      this.isRecording = true;

      // Set up no-speech timeout
      this.startNoSpeechTimeout();

      console.log('[Speech] Recognition started with language:', options.language);
    } catch (error) {
      console.error('[Speech] Failed to start recognition:', error);
      this.handleError('unknown', 'Failed to start speech recognition');
    }
  }

  /**
   * Stops speech recognition
   */
  stop(): void {
    if (!this.recognition || !this.isRecording) {
      return;
    }

    try {
      this.recognition.stop();
      this.isRecording = false;
      this.clearNoSpeechTimeout();
      console.log('[Speech] Recognition stopped');
    } catch (error) {
      console.error('[Speech] Failed to stop recognition:', error);
    }
  }

  /**
   * Checks if recognition is currently active
   * @returns True if recording is in progress
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Sets callback for partial results
   * @param callback - Function to call with partial transcript
   */
  onPartialResult(callback: (text: string) => void): void {
    this.onPartialResultCallback = callback;
  }

  /**
   * Sets callback for final results
   * @param callback - Function to call with final transcript and confidence
   */
  onFinalResult(callback: (text: string, confidence: number) => void): void {
    this.onFinalResultCallback = callback;
  }

  /**
   * Sets callback for errors
   * @param callback - Function to call with error type and message
   */
  onError(callback: (error: SpeechError, message: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Sets up event handlers for speech recognition
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return;

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.clearNoSpeechTimeout();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;

        const alternative = result[0];
        if (!alternative) continue;

        const transcript = alternative.transcript;
        const confidence = alternative.confidence;

        if (result.isFinal) {
          // Final result
          if (this.onFinalResultCallback) {
            this.onFinalResultCallback(transcript, confidence);
          }
          console.log('[Speech] Final result:', transcript, 'Confidence:', confidence);
        } else {
          // Partial result
          if (this.onPartialResultCallback) {
            this.onPartialResultCallback(transcript);
          }
          console.log('[Speech] Partial result:', transcript);
        }
      }

      // Restart no-speech timeout if still recording
      if (this.isRecording) {
        this.startNoSpeechTimeout();
      }
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Speech] Recognition error:', event.error);
      this.clearNoSpeechTimeout();

      const errorType = this.mapErrorType(event.error);
      const errorMessage = this.getErrorMessage(errorType);
      this.handleError(errorType, errorMessage);
    };

    // Handle end
    this.recognition.onend = () => {
      this.isRecording = false;
      this.clearNoSpeechTimeout();
      console.log('[Speech] Recognition ended');
    };

    // Handle start
    this.recognition.onstart = () => {
      console.log('[Speech] Recognition started successfully');
    };
  }

  /**
   * Maps Web Speech API error codes to our error types
   * @param error - Web Speech API error code
   * @returns Mapped error type
   */
  private mapErrorType(error: string): SpeechError {
    switch (error) {
      case 'no-speech':
        return 'no-speech';
      case 'audio-capture':
      case 'aborted':
        return 'audio-capture';
      case 'not-allowed':
      case 'service-not-allowed':
        return 'not-allowed';
      case 'network':
        return 'network';
      default:
        return 'unknown';
    }
  }

  /**
   * Gets user-friendly error message for error type
   * @param errorType - Speech error type
   * @returns User-friendly error message
   */
  private getErrorMessage(errorType: SpeechError): string {
    switch (errorType) {
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'audio-capture':
        return 'Unable to capture audio. Please check your microphone.';
      case 'not-allowed':
        return 'Microphone permission denied. Please allow access in browser settings.';
      case 'network':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'An error occurred during speech recognition. Please try again.';
    }
  }

  /**
   * Handles errors by calling error callback
   * @param errorType - Speech error type
   * @param message - Error message
   */
  private handleError(errorType: SpeechError, message: string): void {
    this.isRecording = false;
    this.clearNoSpeechTimeout();

    if (this.onErrorCallback) {
      this.onErrorCallback(errorType, message);
    }
  }

  /**
   * Starts the no-speech timeout
   */
  private startNoSpeechTimeout(): void {
    this.clearNoSpeechTimeout();
    this.noSpeechTimeout = window.setTimeout(() => {
      if (this.isRecording) {
        console.warn('[Speech] No speech detected within timeout period');
        this.stop();
        this.handleError('no-speech', 'No speech detected. Please try again.');
      }
    }, this.NO_SPEECH_TIMEOUT_MS);
  }

  /**
   * Clears the no-speech timeout
   */
  private clearNoSpeechTimeout(): void {
    if (this.noSpeechTimeout !== null) {
      clearTimeout(this.noSpeechTimeout);
      this.noSpeechTimeout = null;
    }
  }

  /**
   * Cleans up resources
   */
  cleanup(): void {
    this.stop();
    this.recognition = null;
    this.onPartialResultCallback = null;
    this.onFinalResultCallback = null;
    this.onErrorCallback = null;
  }
}

/**
 * Mock speech service for testing and offline demo
 */
export class MockSpeechService extends SpeechService {
  private mockTranscript = 'This is a mock transcript for testing purposes.';
  private mockTimeout: number | null = null;

  /**
   * Starts mock speech recognition
   * @param _options - Speech recognition options (unused in mock)
   */
  override start(_options: SpeechOptions): void {
    console.log('[Speech] Using mock speech service');

    // Simulate partial results
    const words = this.mockTranscript.split(' ');
    let currentText = '';

    words.forEach((word, index) => {
      this.mockTimeout = window.setTimeout(
        () => {
          currentText += (index > 0 ? ' ' : '') + word;

          if (index < words.length - 1) {
            // Partial result
            const callback = (this as any).onPartialResultCallback;
            if (callback) {
              callback(currentText);
            }
          } else {
            // Final result
            const callback = (this as any).onFinalResultCallback;
            if (callback) {
              callback(currentText, 0.95);
            }
          }
        },
        (index + 1) * 300
      );
    });
  }

  /**
   * Stops mock speech recognition
   */
  override stop(): void {
    if (this.mockTimeout !== null) {
      clearTimeout(this.mockTimeout);
      this.mockTimeout = null;
    }
    console.log('[Speech] Mock recognition stopped');
  }
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}
