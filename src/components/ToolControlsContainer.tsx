import { useState, useRef, useEffect } from 'react';
import type { PinnedNote, PromptHistoryItem, GenerateSettings } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';

/**
 * Tool type for the active tool
 */
export type ToolType = 'generate' | 'rewrite' | 'summarize';

/**
 * Summary mode options
 */
type SummaryMode = 'bullets' | 'paragraph' | 'brief';

/**
 * Reading level options
 */
type ReadingLevel = 'simple' | 'moderate' | 'detailed' | 'complex';

/**
 * ToolControlsContainer component props
 */
export interface ToolControlsProps {
  /**
   * Active tool that determines which controls to display
   */
  activeTool: ToolType;

  /**
   * Pinned notes to pass to tool controls
   */
  pinnedNotes?: PinnedNote[];

  /**
   * Current editor content (for operations)
   */
  content: string;

  /**
   * Current selection range in editor
   */
  selection?: { start: number; end: number };

  /**
   * Reference to UnifiedEditor for showing indicators and getting captured selection
   */
  editorRef?: React.RefObject<{ 
    showCursorIndicator: () => void; 
    hideCursorIndicator: () => void; 
    showSelectionOverlay: () => void;
    hideSelectionOverlay: () => void;
    updateCapturedSelection: (start: number, end: number) => void;
    getCapturedSelection: () => { start: number; end: number };
    getTextarea: () => HTMLTextAreaElement | null;
    insertAtCursor: (text: string, selectAfterInsert?: boolean, replaceSelection?: boolean) => void;
  }>;

  /**
   * Callback when an operation starts
   */
  onOperationStart?: (operationType?: 'generate' | 'rewrite' | 'summarize') => void;

  /**
   * Callback when an operation completes successfully
   */
  onOperationComplete?: (result: string, operationType: ToolType) => void;

  /**
   * Callback when an operation fails
   */
  onOperationError?: (error: string) => void;
}

/**
 * ToolControlsContainer component
 * Displays tool-specific controls below the unified editor based on the active tool
 * Conditionally renders Generate, Rewrite, or Summarize controls
 */
export function ToolControlsContainer({
  activeTool,
  pinnedNotes = [],
  content,
  selection: _selection,
  editorRef,
  onOperationStart,
  onOperationComplete,
  onOperationError,
}: ToolControlsProps) {
  // Generate controls state
  const [prompt, setPrompt] = useState('');
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('short');
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
  const [isGenerateRecording, setIsGenerateRecording] = useState(false);

  // Rewrite controls state
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('Simplify');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isRewriteRecording, setIsRewriteRecording] = useState(false);

  // Summarize controls state
  const [mode, setMode] = useState<SummaryMode>('bullets');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('moderate');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('short');

  // Common state
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const customPromptInputRef = useRef<HTMLInputElement>(null);
  const lengthDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFocusedElementRef = useRef<'editor' | 'prompt' | null>(null);

  // Rewrite presets
  const presets = [
    'Simplify',
    'Clarify',
    'Concise',
    'Expand',
    'Friendly',
    'Formal',
    'Poetic',
    'Persuasive',
  ];

  // Load prompt history and settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const history = await StorageService.getPromptHistory(4);
        setPromptHistory(history);
        
        const settings = await StorageService.getGenerateSettings();
        setGenerateSettings(settings);
      } catch (error) {
        console.error('[ToolControlsContainer] Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Track which element has focus (editor or prompt) for voice transcription
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const textarea = editorRef?.current?.getTextarea();
      if (e.target === textarea) {
        lastFocusedElementRef.current = 'editor';
      } else if (e.target === promptInputRef.current || e.target === customPromptInputRef.current) {
        lastFocusedElementRef.current = 'prompt';
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [editorRef]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lengthDropdownRef.current && !lengthDropdownRef.current.contains(event.target as Node)) {
        setShowLengthDropdown(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setShowPresetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Gets the label for the current length selection
   */
  const getLengthLabel = (length: 'short' | 'medium' | 'long'): string => {
    switch (length) {
      case 'short': return 'Short';
      case 'medium': return 'Med';
      case 'long': return 'Long';
    }
  };

  /**
   * Handles stop button click - cancels ongoing AI operation
   */
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    onOperationError?.('Operation cancelled by user');
  };

  /**
   * Handles generate operation
   */
  const handleGenerate = async () => {
    // Use default prompt if empty
    const effectivePrompt = prompt.trim() || 'Continue writing and extend this content naturally';

    // Validate captured selection exists (for cursor position)
    const capturedSelection = editorRef?.current?.getCapturedSelection();
    if (!capturedSelection) {
      console.warn('[ToolControls] No captured selection, will default to end of content');
    } else if (capturedSelection.start < 0 || capturedSelection.start > content.length) {
      console.warn('[ToolControls] Invalid cursor position, will default to end of content');
    }

    // Show cursor indicator BEFORE starting operation
    console.log('[ToolControls] Showing cursor indicator, editorRef:', editorRef?.current);
    editorRef?.current?.showCursorIndicator();

    setIsProcessing(true);
    onOperationStart?.('generate');

    try {
      const settings = generateSettings || {
        shortLength: 100,
        mediumLength: 300,
        contextAwarenessEnabled: true,
      };

      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      let lengthHint: number | undefined;
      if (selectedLength === 'short') lengthHint = settings.shortLength;
      else if (selectedLength === 'medium') lengthHint = settings.mediumLength;

      // Get surrounding context based on cursor position
      // Format: text before cursor, then newline, then text after cursor
      let surroundingContext: string | undefined;
      if (capturedSelection && settings.contextAwarenessEnabled && content.trim()) {
        const cursorPos = capturedSelection.start;
        const contextLength = 1000; // Characters to include before/after cursor
        
        // Get text before and after cursor
        const textBefore = content.substring(Math.max(0, cursorPos - contextLength), cursorPos);
        const textAfter = content.substring(cursorPos, Math.min(content.length, cursorPos + contextLength));
        
        // Format as: before\nafter (AI service will split on last newline)
        if (textBefore.trim() || textAfter.trim()) {
          surroundingContext = `${textBefore}\n${textAfter}`;
          console.log('[ToolControls] Passing context to AI:', {
            cursorPos,
            beforeLength: textBefore.length,
            afterLength: textAfter.length,
            contextPreview: surroundingContext.substring(0, 100) + '...'
          });
        }
      }

      const result = await AIService.generate(effectivePrompt, {
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
        length: selectedLength,
        lengthHint,
        context: surroundingContext,
      });

      // Only save to history if user provided a custom prompt
      if (prompt.trim()) {
        await StorageService.savePromptToHistory(prompt);
      }
      
      setPrompt('');
      onOperationComplete?.(result, 'generate');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
      // Hide cursor indicator after operation
      editorRef?.current?.hideCursorIndicator();
    }
  };

  /**
   * Handles rewrite operation
   */
  const handleRewrite = async () => {
    console.log('[ToolControls] 🔵 REWRITE BUTTON CLICKED');
    console.log('[ToolControls] customPrompt:', customPrompt);
    console.log('[ToolControls] editorRef:', editorRef);
    console.log('[ToolControls] editorRef.current:', editorRef?.current);

    // CRITICAL: Get captured selection from editor ref (not from prop which is cleared)
    const capturedSelection = editorRef?.current?.getCapturedSelection();
    console.log('[ToolControls] 🔵 CAPTURED SELECTION FROM REF:', capturedSelection);

    // Validate captured selection exists
    if (!capturedSelection) {
      onOperationError?.('Please select text or position your cursor first');
      return;
    }

    // Validate selection range is within bounds
    if (capturedSelection.start < 0 || capturedSelection.end > content.length || capturedSelection.start > capturedSelection.end) {
      onOperationError?.('Selection is no longer valid. Please select text again.');
      return;
    }

    // Get selected text using captured selection
    const textToRewrite = capturedSelection.start !== capturedSelection.end
      ? content.substring(capturedSelection.start, capturedSelection.end)
      : content;

    console.log('[ToolControls] Text to rewrite:', textToRewrite.substring(0, 50) + '...');

    if (!textToRewrite.trim()) {
      onOperationError?.('Please type or paste text in the editor first');
      return;
    }

    console.log('[ToolControls] customPrompt value:', customPrompt, 'length:', customPrompt.length);
    
    // Use "Simplify" as default if prompt is empty
    const effectivePrompt = customPrompt.trim() || 'Simplify';

    setIsProcessing(true);
    onOperationStart?.('rewrite');

    try {
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      // Enhance "Simplify" preset to also make text shorter
      const enhancedPrompt = effectivePrompt === 'Simplify' 
        ? 'Simplify and make it shorter'
        : effectivePrompt;
      
      console.log('[ToolControls] Calling AIService.rewrite...');
      const result = await AIService.rewrite(textToRewrite, {
        customPrompt: enhancedPrompt,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      console.log('[ToolControls] Rewrite complete, result length:', result.length);
      onOperationComplete?.(result, 'rewrite');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rewrite failed';
      console.error('[ToolControls] Rewrite error:', error);
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles summarize operation
   */
  const handleSummarize = async () => {
    // CRITICAL: Get captured selection from editor ref (not from prop which is cleared)
    const capturedSelection = editorRef?.current?.getCapturedSelection();
    console.log('[ToolControls] Summarize - captured selection from ref:', capturedSelection);

    // Validate captured selection exists
    if (!capturedSelection) {
      onOperationError?.('Please select text or position your cursor first');
      return;
    }

    // Validate selection range is within bounds
    if (capturedSelection.start < 0 || capturedSelection.end > content.length || capturedSelection.start > capturedSelection.end) {
      onOperationError?.('Selection is no longer valid. Please select text again.');
      return;
    }

    // Get selected text using captured selection
    const textToSummarize = capturedSelection.start !== capturedSelection.end
      ? content.substring(capturedSelection.start, capturedSelection.end)
      : content;

    if (!textToSummarize.trim()) {
      onOperationError?.('Please select or enter text to summarize');
      return;
    }

    setIsProcessing(true);
    onOperationStart?.('summarize');

    try {
      const pinnedNotesContent = pinnedNotes.map(note => `${note.title}: ${note.content}`);
      
      const result = await AIService.summarize(textToSummarize, {
        mode,
        readingLevel,
        length: summaryLength,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Format markdown bullets to actual bullet points
      // Handle both * and - markdown bullets, with or without space
      let formattedResult = result
        .replace(/^\*\s+/gm, '• ')  // * with space
        .replace(/^\* /gm, '• ')     // * with single space
        .replace(/^-\s+/gm, '• ')    // - with space
        .replace(/^- /gm, '• ');     // - with single space

      onOperationComplete?.(formattedResult, 'summarize');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summarize failed';
      onOperationError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles voice recording toggle
   * Transcribes into editor if it has focus, otherwise into prompt box
   */
  const handleVoiceToggle = (tool: 'generate' | 'rewrite') => {
    const isRecording = tool === 'generate' ? isGenerateRecording : isRewriteRecording;
    const setIsRecording = tool === 'generate' ? setIsGenerateRecording : setIsRewriteRecording;

    if (isRecording) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        onOperationError?.('Speech recognition is not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true; // Keep listening longer
      recognition.maxAlternatives = 1;

      // Track accumulated transcript
      let accumulatedTranscript = '';
      let lastResultTime = Date.now();

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        // Collect all final results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            
            // Detect pause (if more than 1 second since last result, add comma)
            const now = Date.now();
            const timeSinceLast = now - lastResultTime;
            
            if (accumulatedTranscript && timeSinceLast > 1000 && !accumulatedTranscript.endsWith(',') && !accumulatedTranscript.endsWith('.')) {
              accumulatedTranscript += ',';
            }
            
            accumulatedTranscript += (accumulatedTranscript ? ' ' : '') + transcript;
            lastResultTime = now;
            finalTranscript = accumulatedTranscript;
          }
        }

        if (finalTranscript) {
          // Check current focus dynamically (allows switching during recording)
          const shouldInsertInEditor = lastFocusedElementRef.current === 'editor';
          
          // Smart formatting helper
          const formatTranscript = (text: string, existingContent: string, cursorPos: number): string => {
            let formatted = text.trim();
            
            if (!formatted) return '';
            
            // Ensure sentence ends with period if it doesn't have punctuation
            if (!/[.!?,;:]$/.test(formatted)) {
              formatted += '.';
            }
            
            // Capitalize first letter
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            
            // Capitalize after sentence endings within the text
            formatted = formatted.replace(/([.!?]\s+)([a-z])/g, (_match, punct, letter) => {
              return punct + letter.toUpperCase();
            });
            
            // Check if we need leading space
            const charBeforeCursor = existingContent.charAt(cursorPos - 1);
            const needsLeadingSpace = charBeforeCursor && charBeforeCursor !== ' ' && charBeforeCursor !== '\n';
            
            // Check if we need trailing space
            const charAfterCursor = existingContent.charAt(cursorPos);
            const needsTrailingSpace = charAfterCursor && charAfterCursor !== ' ' && charAfterCursor !== '\n';
            
            return (needsLeadingSpace ? ' ' : '') + formatted + (needsTrailingSpace ? ' ' : '');
          };

          if (shouldInsertInEditor && editorRef?.current) {
            // Get selection to check if we should replace or insert
            const textarea = editorRef.current.getTextarea();
            const capturedSelection = editorRef.current.getCapturedSelection();
            
            if (textarea && capturedSelection) {
              // Check if there's a selection to replace
              const hasSelection = capturedSelection.start !== capturedSelection.end;
              
              if (hasSelection) {
                // Replace selection - just capitalize, no extra formatting
                let formattedText = finalTranscript.trim();
                if (formattedText.length > 0) {
                  formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
                }
                editorRef.current.insertAtCursor(formattedText, true, true); // selectAfterInsert = true, replaceSelection = true
              } else {
                // Insert at cursor with smart formatting
                const cursorPos = textarea.selectionStart;
                const formattedText = formatTranscript(finalTranscript, content, cursorPos);
                editorRef.current.insertAtCursor(formattedText, true, false); // selectAfterInsert = true
              }
              accumulatedTranscript = '';
            }
          } else {
            // Insert into prompt box (simpler formatting)
            let formattedText = finalTranscript.trim();
            
            // Capitalize first letter
            if (formattedText.length > 0) {
              formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
            }
            
            // Check if there's selected text in the prompt input
            const promptInput = tool === 'generate' ? promptInputRef.current : customPromptInputRef.current;
            
            if (promptInput && promptInput.selectionStart !== promptInput.selectionEnd) {
              // Replace selected text in prompt box
              const start = promptInput.selectionStart || 0;
              const end = promptInput.selectionEnd || 0;
              const currentValue = tool === 'generate' ? prompt : customPrompt;
              const newValue = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
              
              if (tool === 'generate') {
                setPrompt(newValue);
              } else {
                setCustomPrompt(newValue);
              }
              
              // Set cursor after inserted text
              setTimeout(() => {
                if (promptInput) {
                  promptInput.setSelectionRange(start + formattedText.length, start + formattedText.length);
                }
              }, 0);
            } else {
              // Append to prompt box
              if (tool === 'generate') {
                setPrompt(prev => {
                  const needsSpace = prev.length > 0 && !prev.endsWith(' ');
                  return prev + (needsSpace ? ' ' : '') + formattedText;
                });
              } else {
                setCustomPrompt(prev => {
                  const needsSpace = prev.length > 0 && !prev.endsWith(' ');
                  return prev + (needsSpace ? ' ' : '') + formattedText;
                });
              }
            }
            
            // Reset accumulated transcript after insertion
            accumulatedTranscript = '';
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[ToolControlsContainer] Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          onOperationError?.('Speech recognition error. Please try again.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      // Auto-stop after 30 seconds (increased from default ~5 seconds)
      const autoStopTimeout = setTimeout(() => {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
        }
      }, 30000);

      recognition.onstop = () => {
        clearTimeout(autoStopTimeout);
      };

      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('[ToolControlsContainer] Failed to start recording:', err);
        onOperationError?.('Failed to start recording. Please try again.');
      }

      speechRecognitionRef.current = recognition;
    }
  };

  return (
    <div
      style={{
        marginTop: '16px',
        flexShrink: 0,
      }}
    >
      {/* Generate Controls */}
      {activeTool === 'generate' && (
        <div style={{ position: 'relative' }}>
          {/* History button */}
          <button
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            disabled={isProcessing || promptHistory.length === 0}
            aria-label="Prompt history"
            title="Prompt history"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text)',
              zIndex: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>

          {/* History dropdown */}
          {showHistoryDropdown && promptHistory.length > 0 && (
            <div
              ref={historyDropdownRef}
              style={{
                position: 'absolute',
                left: '0',
                right: '0',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {promptHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPrompt(item.text);
                    setShowHistoryDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-muted)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-sm)',
                  }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          )}

          {/* Length dropdown */}
          {showLengthDropdown && (
            <div
              ref={lengthDropdownRef}
              style={{
                position: 'absolute',
                left: '0',
                right: '0',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
              }}
            >
              {(['short', 'medium', 'long'] as const).map((length) => (
                <button
                  key={length}
                  onClick={() => {
                    setSelectedLength(length);
                    setShowLengthDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: selectedLength === length ? 'var(--surface-2)' : 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                </button>
              ))}
            </div>
          )}

          <input
            ref={promptInputRef}
            type="text"
            className="flint-input"
            placeholder="Start writing..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            disabled={isProcessing}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 140px 0 52px',
            }}
          />

          {/* Inline buttons */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              className="flint-btn ghost"
              onClick={() => setShowLengthDropdown(!showLengthDropdown)}
              disabled={isProcessing}
              aria-label={`Length: ${selectedLength}`}
              aria-expanded={showLengthDropdown}
              aria-haspopup="true"
              title={`Length: ${selectedLength}`}
              style={{
                width: 'auto',
                minWidth: '50px',
                height: '36px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                boxShadow: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {getLengthLabel(selectedLength)}
            </button>

            <button
              className={`flint-btn ${isGenerateRecording ? 'recording' : 'ghost'}`}
              onClick={() => handleVoiceToggle('generate')}
              disabled={isProcessing}
              aria-label={isGenerateRecording ? 'Stop recording' : 'Start voice input'}
              title={isGenerateRecording ? 'Stop recording' : 'Voice input'}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isGenerateRecording ? undefined : 'none',
                boxShadow: isGenerateRecording ? undefined : 'none',
                background: isGenerateRecording ? undefined : 'transparent',
              }}
            >
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
            </button>

            <button
              className="flint-btn primary"
              onClick={isProcessing ? handleStop : handleGenerate}
              aria-label={isProcessing ? 'Stop' : 'Generate'}
              aria-busy={isProcessing}
              title={isProcessing ? 'Stop generation' : 'Generate'}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isProcessing ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 56 56"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Rewrite Controls */}
      {activeTool === 'rewrite' && (
        <div style={{ position: 'relative' }}>
          {/* Preset dropdown button */}
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            disabled={isProcessing}
            aria-label="Select preset"
            aria-expanded={showPresetMenu}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: showPresetMenu ? 'var(--surface-2)' : 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.15s ease',
              zIndex: 2,
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
              style={{
                transform: showPresetMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Preset menu */}
          {showPresetMenu && (
            <div
              ref={presetMenuRef}
              style={{
                position: 'absolute',
                left: '8px',
                bottom: '100%',
                marginBottom: '4px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                minWidth: '160px',
              }}
            >
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomPrompt(preset);
                    setShowPresetMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: selectedPreset === preset ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          <input
            ref={customPromptInputRef}
            type="text"
            className="flint-input"
            placeholder="Choose a preset or describe how to rewrite..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleRewrite();
              }
            }}
            disabled={isProcessing}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 100px 0 48px',
            }}
          />

          {/* Inline buttons */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              className={`flint-btn ${isRewriteRecording ? 'recording' : 'ghost'}`}
              onClick={() => handleVoiceToggle('rewrite')}
              disabled={isProcessing}
              aria-label={isRewriteRecording ? 'Stop recording' : 'Start voice input'}
              title={isRewriteRecording ? 'Stop recording' : 'Voice input'}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isRewriteRecording ? undefined : 'none',
                boxShadow: isRewriteRecording ? undefined : 'none',
                background: isRewriteRecording ? undefined : 'transparent',
              }}
            >
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
            </button>

            <button
              className="flint-btn primary"
              onMouseDown={(e) => {
                e.preventDefault();
                if (isProcessing) {
                  handleStop();
                } else {
                  handleRewrite();
                }
              }}
              aria-label={isProcessing ? 'Stop' : 'Rewrite'}
              aria-busy={isProcessing}
              title={isProcessing ? 'Stop rewriting' : 'Rewrite'}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isProcessing ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
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
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Summarize Controls */}
      {activeTool === 'summarize' && (
        <div>
          {/* Mode selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Summary format
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['bullets', 'paragraph', 'brief'] as const).map((modeOption) => (
                <button
                  key={modeOption}
                  className={`flint-btn ${mode === modeOption ? 'primary' : 'ghost'}`}
                  onClick={() => setMode(modeOption)}
                  disabled={isProcessing}
                  style={{ flex: 1 }}
                >
                  {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reading level and length controls */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
            {/* Reading level dropdown */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Reading level
              </label>
              <select
                className="flint-input"
                value={readingLevel}
                onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
                disabled={isProcessing}
                style={{ width: '100%', height: '48px', padding: '12px 16px' }}
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="detailed">Detailed</option>
                <option value="complex">Complex</option>
              </select>
            </div>

            {/* Length dropdown */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Length
              </label>
              <select
                className="flint-input"
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value as 'short' | 'medium' | 'long')}
                disabled={isProcessing}
                style={{ width: '100%', height: '48px', padding: '12px 16px' }}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          {/* Summarize button */}
          <button
            className="flint-btn primary"
            onMouseDown={(e) => {
              e.preventDefault();
              if (isProcessing) {
                handleStop();
              } else {
                handleSummarize();
              }
            }}
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            aria-label={isProcessing ? 'Stop' : 'Summarize'}
          >
            {isProcessing ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                <span>Stop</span>
              </>
            ) : (
              'Summarize'
            )}
          </button>
        </div>
      )}

      {/* Pinned notes indicator */}
      {pinnedNotes.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-muted)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 17V3" />
            <path d="m6 11 6 6 6-6" />
            <path d="M19 21H5" />
          </svg>
          {pinnedNotes.length} pinned {pinnedNotes.length === 1 ? 'note' : 'notes'} will be included
        </div>
      )}
    </div>
  );
}
