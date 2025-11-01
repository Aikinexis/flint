import { useState, useRef, useEffect } from 'react';
import type { PinnedNote, PromptHistoryItem, GenerateSettings } from '../services/storage';
import { StorageService } from '../services/storage';
import { AIService } from '../services/ai';
import {
  detectDocumentType,
  analyzeCursorContext,
  buildContextInstructions,
} from '../utils/documentAnalysis';

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
   * Current project title (for context)
   */
  projectTitle?: string;

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
   * Persistent prompt values (controlled from parent)
   */
  generatePrompt?: string;
  rewritePrompt?: string;
  summarizePrompt?: string;

  /**
   * Callbacks for prompt changes
   */
  onGeneratePromptChange?: (prompt: string) => void;
  onRewritePromptChange?: (prompt: string) => void;
  onSummarizePromptChange?: (prompt: string) => void;

  /**
   * Callback when an operation starts
   */
  onOperationStart?: (operationType?: 'generate' | 'rewrite' | 'summarize') => void;

  /**
   * Callback when an operation completes successfully
   */
  onOperationComplete?: (result: string, operationType: ToolType, userPrompt?: string) => void;

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
  projectTitle,
  selection: _selection,
  editorRef,
  generatePrompt: generatePromptProp = '',
  rewritePrompt: rewritePromptProp = '',
  summarizePrompt: summarizePromptProp = '',
  onGeneratePromptChange,
  onRewritePromptChange,
  onSummarizePromptChange,
  onOperationStart,
  onOperationComplete,
  onOperationError,
}: ToolControlsProps) {
  // Use controlled prompts from parent, with local state as fallback
  const [prompt, setPromptInternal] = useState(generatePromptProp);
  const [customPrompt, setCustomPromptInternal] = useState(rewritePromptProp);
  const [summaryPrompt, setSummaryPromptInternal] = useState(summarizePromptProp);

  // Sync with parent props when they change
  useEffect(() => {
    setPromptInternal(generatePromptProp);
  }, [generatePromptProp]);

  useEffect(() => {
    setCustomPromptInternal(rewritePromptProp);
  }, [rewritePromptProp]);

  useEffect(() => {
    setSummaryPromptInternal(summarizePromptProp);
  }, [summarizePromptProp]);

  // Wrapper functions to update both local and parent state
  const setPrompt = (value: string) => {
    setPromptInternal(value);
    onGeneratePromptChange?.(value);
  };

  const setCustomPrompt = (value: string) => {
    setCustomPromptInternal(value);
    onRewritePromptChange?.(value);
  };

  const setSummaryPrompt = (value: string) => {
    setSummaryPromptInternal(value);
    onSummarizePromptChange?.(value);
  };

  // Generate controls state
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('short');
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
  const [isGenerateRecording, setIsGenerateRecording] = useState(false);
  const [isPromptFromHistory, setIsPromptFromHistory] = useState(false);

  // Rewrite controls state
  const [selectedPreset, setSelectedPreset] = useState<string>('Simplify');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isRewriteRecording, setIsRewriteRecording] = useState(false);

  // Summarize controls state
  const [mode, setMode] = useState<SummaryMode>('bullets');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('moderate');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('short');
  const [showReadingLevelDropdown, setShowReadingLevelDropdown] = useState(false);
  const [showSummaryLengthDropdown, setShowSummaryLengthDropdown] = useState(false);
  const [showSummaryModeDropdown, setShowSummaryModeDropdown] = useState(false);
  const [isSummarizeRecording, setIsSummarizeRecording] = useState(false);

  // Common state
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const customPromptInputRef = useRef<HTMLInputElement>(null);
  const summaryPromptInputRef = useRef<HTMLInputElement>(null);
  const lengthDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const readingLevelDropdownRef = useRef<HTMLDivElement>(null);
  const summaryLengthDropdownRef = useRef<HTMLDivElement>(null);
  const summaryModeDropdownRef = useRef<HTMLDivElement>(null);
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
      } else if (
        e.target === promptInputRef.current ||
        e.target === customPromptInputRef.current ||
        e.target === summaryPromptInputRef.current
      ) {
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
      if (
        historyDropdownRef.current &&
        !historyDropdownRef.current.contains(event.target as Node)
      ) {
        setShowHistoryDropdown(false);
      }
      if (presetMenuRef.current && !presetMenuRef.current.contains(event.target as Node)) {
        setShowPresetMenu(false);
      }
      if (
        readingLevelDropdownRef.current &&
        !readingLevelDropdownRef.current.contains(event.target as Node)
      ) {
        setShowReadingLevelDropdown(false);
      }
      if (
        summaryLengthDropdownRef.current &&
        !summaryLengthDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSummaryLengthDropdown(false);
      }
      if (
        summaryModeDropdownRef.current &&
        !summaryModeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSummaryModeDropdown(false);
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
      case 'short':
        return 'Short';
      case 'medium':
        return 'Med';
      case 'long':
        return 'Long';
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
    // Get captured selection for cursor position
    const capturedSelection = editorRef?.current?.getCapturedSelection();

    // Analyze document type and cursor context for smart generation
    const docType = detectDocumentType(content);
    const cursorContext = capturedSelection
      ? analyzeCursorContext(content, capturedSelection.start)
      : {
          isInSubjectLine: false,
          isInHeading: false,
          isInList: false,
          isInCodeBlock: false,
          isAfterSalutation: false,
          isBeforeSignature: false,
          indentLevel: 0,
        };

    console.log('[Generate] Document type:', docType);
    console.log('[Generate] Cursor context:', cursorContext);

    // Build smart context instructions
    const smartInstructions = buildContextInstructions(docType, cursorContext);

    // Use default intro prompt ONLY if both prompt and editor are empty
    let effectivePrompt = prompt.trim();
    if (!effectivePrompt) {
      if (content.trim()) {
        effectivePrompt = 'Continue writing and extend this content naturally';
      } else {
        effectivePrompt =
          "Introduce Flint, a Chrome extension for AI-powered writing. Explain how it can help users generate, rewrite, and summarize text using Chrome's built-in AI. Keep it friendly and concise.";
      }
    }

    // Show cursor indicator BEFORE starting operation
    editorRef?.current?.showCursorIndicator();

    setIsProcessing(true);
    onOperationStart?.('generate');

    try {
      const settings = generateSettings || {
        shortLength: 100,
        mediumLength: 300,
        contextAwarenessEnabled: true,
      };

      const pinnedNotesContent = pinnedNotes.map((note) => `${note.title}: ${note.content}`);

      let lengthHint: number | undefined;
      if (selectedLength === 'short') lengthHint = settings.shortLength;
      else if (selectedLength === 'medium') lengthHint = settings.mediumLength;

      // Use enhanced context-aware generation if enabled
      let result: string;
      if (capturedSelection && settings.contextAwarenessEnabled && content.trim()) {
        const cursorPos = capturedSelection.start;

        console.log('[Generate] Using enhanced context engine');
        result = await AIService.generateWithEnhancedContext(
          effectivePrompt,
          content,
          cursorPos,
          {
            pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
            length: selectedLength,
            lengthHint,
            projectTitle:
              projectTitle &&
              projectTitle !== 'Untitled' &&
              projectTitle !== 'My first project' &&
              projectTitle !== 'My project'
                ? projectTitle
                : undefined,
            smartInstructions: smartInstructions || undefined,
            documentType: docType.type,
          },
          {
            localWindow: 1500, // 1500 chars around cursor
            maxRelatedSections: 3, // Include 3 most relevant sections
            enableRelevanceScoring: true,
            enableDeduplication: true,
          }
        );
      } else {
        // Fallback to basic generation without enhanced context
        console.log('[Generate] Using basic generation (context disabled or empty document)');

        // Get basic surrounding context for backward compatibility
        let surroundingContext: string | undefined;
        if (capturedSelection && content.trim()) {
          const cursorPos = capturedSelection.start;
          const contextLength = 1500;

          const textBefore = content.substring(Math.max(0, cursorPos - contextLength), cursorPos);
          const textAfter = content.substring(
            cursorPos,
            Math.min(content.length, cursorPos + contextLength)
          );

          if (textBefore.trim() || textAfter.trim()) {
            surroundingContext = `${textBefore}\n${textAfter}`;
          }
        }

        result = await AIService.generate(effectivePrompt, {
          pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
          length: selectedLength,
          lengthHint,
          context: surroundingContext,
          projectTitle:
            projectTitle &&
            projectTitle !== 'Untitled' &&
            projectTitle !== 'My first project' &&
            projectTitle !== 'My project'
              ? projectTitle
              : undefined,
          smartInstructions: smartInstructions || undefined,
          documentType: docType.type,
        });
      }

      // Only save to history if user provided a custom prompt (not from history)
      if (prompt.trim() && !isPromptFromHistory) {
        await StorageService.savePromptToHistory(prompt);
        // Reload history to show the new prompt
        const updatedHistory = await StorageService.getPromptHistory(4);
        setPromptHistory(updatedHistory);
      }

      const userPrompt = prompt; // Save prompt before clearing
      setPrompt('');
      setIsPromptFromHistory(false); // Reset flag
      onOperationComplete?.(result, 'generate', userPrompt);
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
   * Handles rewrite operation - rewrites selected text with AI
   */
  const handleRewrite = async () => {
    // Get captured selection from editor ref (not from prop which is cleared)
    const capturedSelection = editorRef?.current?.getCapturedSelection();

    // Validate captured selection exists
    if (!capturedSelection) {
      onOperationError?.('Please select text or position your cursor first');
      return;
    }

    // Validate selection range is within bounds
    if (
      capturedSelection.start < 0 ||
      capturedSelection.end > content.length ||
      capturedSelection.start > capturedSelection.end
    ) {
      onOperationError?.('Selection is no longer valid. Please select text again.');
      return;
    }

    // If nothing is selected, select all text on first press
    if (capturedSelection.start === capturedSelection.end) {
      const textarea = editorRef?.current?.getTextarea();
      if (textarea && content.trim()) {
        // Select all text
        textarea.focus();
        textarea.setSelectionRange(0, content.length);

        // Update captured selection in editor ref
        if (editorRef?.current) {
          editorRef.current.updateCapturedSelection(0, content.length);
        }

        console.log('[ToolControls] No selection - selected all text. Press again to rewrite.');
        return;
      } else {
        onOperationError?.('Please type or paste text in the editor first');
        return;
      }
    }

    // Get selected text using captured selection
    const textToRewrite = content.substring(capturedSelection.start, capturedSelection.end);

    console.log('[ToolControls] Text to rewrite:', textToRewrite.substring(0, 50) + '...');

    if (!textToRewrite.trim()) {
      onOperationError?.('Please select text to rewrite');
      return;
    }

    console.log('[ToolControls] customPrompt value:', customPrompt, 'length:', customPrompt.length);

    // Use "Simplify" as default if prompt is empty
    const effectivePrompt = customPrompt.trim() || 'Simplify';

    setIsProcessing(true);
    onOperationStart?.('rewrite');

    try {
      const pinnedNotesContent = pinnedNotes.map((note) => `${note.title}: ${note.content}`);

      // Enhance "Simplify" preset to also make text shorter
      const enhancedPrompt =
        effectivePrompt === 'Simplify' ? 'Simplify and make it shorter' : effectivePrompt;

      console.log('[ToolControls] Calling AIService.rewriteWithContext...');

      // Use context-aware rewriting if context awareness is enabled
      const settings = generateSettings || {
        shortLength: 100,
        mediumLength: 300,
        contextAwarenessEnabled: true,
      };

      let result: string;
      if (settings.contextAwarenessEnabled && content.trim().length > textToRewrite.length) {
        // Use enhanced context-aware rewriting
        console.log('[ToolControls] Using context-aware rewriting');
        result = await AIService.rewriteWithContext(
          textToRewrite,
          content,
          capturedSelection.start,
          {
            customPrompt: enhancedPrompt,
            pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
          }
        );
      } else {
        // Fallback to basic rewriting
        console.log('[ToolControls] Using basic rewriting (context disabled or selection is entire document)');
        result = await AIService.rewrite(textToRewrite, {
          customPrompt: enhancedPrompt,
          pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
        });
      }

      console.log('[ToolControls] Rewrite complete, result length:', result.length);
      onOperationComplete?.(result, 'rewrite', enhancedPrompt);
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
    // Reduced logging
    // console.log('[ToolControls] Summarize - captured selection from ref:', capturedSelection);

    // Validate captured selection exists
    if (!capturedSelection) {
      onOperationError?.('Please select text or position your cursor first');
      return;
    }

    // Validate selection range is within bounds
    if (
      capturedSelection.start < 0 ||
      capturedSelection.end > content.length ||
      capturedSelection.start > capturedSelection.end
    ) {
      onOperationError?.('Selection is no longer valid. Please select text again.');
      return;
    }

    // If nothing is selected, select all text on first press
    if (capturedSelection.start === capturedSelection.end) {
      const textarea = editorRef?.current?.getTextarea();
      if (textarea && content.trim()) {
        // Select all text
        textarea.focus();
        textarea.setSelectionRange(0, content.length);

        // Update captured selection in editor ref
        if (editorRef?.current) {
          editorRef.current.updateCapturedSelection(0, content.length);
        }

        console.log('[ToolControls] No selection - selected all text. Press again to summarize.');
        return;
      } else {
        onOperationError?.('Please type or paste text in the editor first');
        return;
      }
    }

    // Get selected text using captured selection
    const textToSummarize = content.substring(capturedSelection.start, capturedSelection.end);

    if (!textToSummarize.trim()) {
      onOperationError?.('Please select text to summarize');
      return;
    }

    setIsProcessing(true);
    onOperationStart?.('summarize');

    try {
      const pinnedNotesContent = pinnedNotes.map((note) => `${note.title}: ${note.content}`);

      const result = await AIService.summarize(textToSummarize, {
        mode,
        readingLevel,
        length: summaryLength,
        pinnedNotes: pinnedNotesContent.length > 0 ? pinnedNotesContent : undefined,
      });

      // Format markdown bullets to actual bullet points
      // Handle both * and - markdown bullets, with or without space
      const formattedResult = result
        .replace(/^\*\s*/gm, '• ') // * with any amount of space (including none)
        .replace(/^-\s*/gm, '• ') // - with any amount of space (including none)
        .replace(/^•\s*\*/gm, '• '); // Remove * after bullet point

      // For summarize, the "prompt" is the mode description
      const summaryPrompt = `Summarize in ${mode} mode (${readingLevel} reading level)`;
      onOperationComplete?.(formattedResult, 'summarize', summaryPrompt);
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
  const handleVoiceToggle = (tool: 'generate' | 'rewrite' | 'summarize') => {
    const isRecording =
      tool === 'generate'
        ? isGenerateRecording
        : tool === 'rewrite'
          ? isRewriteRecording
          : isSummarizeRecording;
    const setIsRecording =
      tool === 'generate'
        ? setIsGenerateRecording
        : tool === 'rewrite'
          ? setIsRewriteRecording
          : setIsSummarizeRecording;

    if (isRecording) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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

            if (
              accumulatedTranscript &&
              timeSinceLast > 1000 &&
              !accumulatedTranscript.endsWith(',') &&
              !accumulatedTranscript.endsWith('.')
            ) {
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
          const formatTranscript = (
            text: string,
            existingContent: string,
            cursorPos: number
          ): string => {
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
            const needsLeadingSpace =
              charBeforeCursor && charBeforeCursor !== ' ' && charBeforeCursor !== '\n';

            // Check if we need trailing space
            const charAfterCursor = existingContent.charAt(cursorPos);
            const needsTrailingSpace =
              charAfterCursor && charAfterCursor !== ' ' && charAfterCursor !== '\n';

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
                editorRef.current.insertAtCursor(formattedText, false, true); // selectAfterInsert = false (cursor to end), replaceSelection = true
              } else {
                // Insert at cursor with smart formatting
                const cursorPos = textarea.selectionStart;
                const formattedText = formatTranscript(finalTranscript, content, cursorPos);
                editorRef.current.insertAtCursor(formattedText, false, false); // selectAfterInsert = false (cursor to end)
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
            const promptInput =
              tool === 'generate'
                ? promptInputRef.current
                : tool === 'rewrite'
                  ? customPromptInputRef.current
                  : summaryPromptInputRef.current;

            if (promptInput && promptInput.selectionStart !== promptInput.selectionEnd) {
              // Replace selected text in prompt box
              const start = promptInput.selectionStart || 0;
              const end = promptInput.selectionEnd || 0;
              const currentValue =
                tool === 'generate' ? prompt : tool === 'rewrite' ? customPrompt : summaryPrompt;
              const newValue =
                currentValue.substring(0, start) + formattedText + currentValue.substring(end);

              if (tool === 'generate') {
                setPrompt(newValue);
              } else if (tool === 'rewrite') {
                setCustomPrompt(newValue);
              } else {
                setSummaryPrompt(newValue);
              }

              // Set cursor after inserted text
              setTimeout(() => {
                if (promptInput) {
                  promptInput.setSelectionRange(
                    start + formattedText.length,
                    start + formattedText.length
                  );
                }
              }, 0);
            } else {
              // Append to prompt box
              if (tool === 'generate') {
                const needsSpace = prompt.length > 0 && !prompt.endsWith(' ');
                setPrompt(prompt + (needsSpace ? ' ' : '') + formattedText);
              } else if (tool === 'rewrite') {
                const needsSpace = customPrompt.length > 0 && !customPrompt.endsWith(' ');
                setCustomPrompt(customPrompt + (needsSpace ? ' ' : '') + formattedText);
              } else {
                const needsSpace = summaryPrompt.length > 0 && !summaryPrompt.endsWith(' ');
                setSummaryPrompt(summaryPrompt + (needsSpace ? ' ' : '') + formattedText);
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-muted)',
                  }}
                >
                  {/* Pin button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await StorageService.togglePromptPin(item.id);
                      const updatedHistory = await StorageService.getPromptHistory(4);
                      setPromptHistory(updatedHistory);
                    }}
                    aria-label={item.pinned ? 'Unpin prompt' : 'Pin prompt'}
                    title={item.pinned ? 'Unpin' : 'Pin'}
                    style={{
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: item.pinned ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={item.pinned ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </button>

                  {/* Prompt text */}
                  <button
                    onClick={() => {
                      setPrompt(item.text);
                      setIsPromptFromHistory(true);
                      setShowHistoryDropdown(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 'var(--fs-sm)',
                    }}
                  >
                    {item.text}
                  </button>

                  {/* Delete button (only show if not pinned) */}
                  {!item.pinned && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await StorageService.deletePromptFromHistory(item.id);
                        const updatedHistory = await StorageService.getPromptHistory(4);
                        setPromptHistory(updatedHistory);
                      }}
                      aria-label="Delete prompt"
                      title="Delete"
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
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
              {(['short', 'medium', 'long'] as const).map((length, index, arr) => (
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
                    borderRadius:
                      index === 0
                        ? 'var(--radius-md) var(--radius-md) 0 0'
                        : index === arr.length - 1
                          ? '0 0 var(--radius-md) var(--radius-md)'
                          : '0',
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
            onChange={(e) => {
              setPrompt(e.target.value);
              setIsPromptFromHistory(false); // Reset flag when user types
            }}
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
                  <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z" />
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
              {presets.map((preset, index) => (
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
                    borderRadius:
                      index === 0
                        ? 'var(--radius-md) var(--radius-md) 0 0'
                        : index === presets.length - 1
                          ? '0 0 var(--radius-md) var(--radius-md)'
                          : '0',
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
            placeholder="Rewrite"
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
          {/* Top row: Summary Type and Reading Level dropdowns */}
          <div
            style={{
              marginBottom: '12px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-start',
            }}
          >
            {/* Summary Type dropdown */}
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                className="flint-btn ghost"
                onClick={() =>
                  !isProcessing && setShowSummaryModeDropdown(!showSummaryModeDropdown)
                }
                disabled={isProcessing}
                aria-label={`Summary type: ${mode}`}
                aria-expanded={showSummaryModeDropdown}
                aria-haspopup="true"
                title="Summary type"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                <span>{mode}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showSummaryModeDropdown && (
                <div
                  ref={summaryModeDropdownRef}
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
                  {(['bullets', 'paragraph', 'brief'] as const).map((modeOption, index, arr) => (
                    <button
                      key={modeOption}
                      onClick={() => {
                        setMode(modeOption);
                        setShowSummaryModeDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: mode === modeOption ? 'var(--surface-2)' : 'transparent',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-sm)',
                        textTransform: 'capitalize',
                        borderRadius:
                          index === 0
                            ? 'var(--radius-md) var(--radius-md) 0 0'
                            : index === arr.length - 1
                              ? '0 0 var(--radius-md) var(--radius-md)'
                              : '0',
                      }}
                    >
                      {modeOption}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reading Level dropdown */}
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                className="flint-btn ghost"
                onClick={() =>
                  !isProcessing && setShowReadingLevelDropdown(!showReadingLevelDropdown)
                }
                disabled={isProcessing}
                aria-label={`Reading level: ${readingLevel}`}
                aria-expanded={showReadingLevelDropdown}
                aria-haspopup="true"
                title="Reading level"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                <span>{readingLevel}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showReadingLevelDropdown && (
                <div
                  ref={readingLevelDropdownRef}
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
                  {(['simple', 'moderate', 'detailed', 'complex'] as ReadingLevel[]).map(
                    (level, index, arr) => (
                      <button
                        key={level}
                        onClick={() => {
                          setReadingLevel(level);
                          setShowReadingLevelDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: readingLevel === level ? 'var(--surface-2)' : 'transparent',
                          color: 'var(--text)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 'var(--fs-sm)',
                          textTransform: 'capitalize',
                          borderRadius:
                            index === 0
                              ? 'var(--radius-md) var(--radius-md) 0 0'
                              : index === arr.length - 1
                                ? '0 0 var(--radius-md) var(--radius-md)'
                                : '0',
                        }}
                      >
                        {level}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Prompt input with inline controls */}
          <div style={{ position: 'relative' }}>
            <input
              ref={summaryPromptInputRef}
              type="text"
              className="flint-input"
              placeholder="Summarise"
              value={summaryPrompt}
              onChange={(e) => setSummaryPrompt(e.target.value)}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSummarize();
                }
              }}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 180px 0 12px',
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
              {/* Length dropdown */}
              <button
                className="flint-btn ghost"
                onClick={() =>
                  !isProcessing && setShowSummaryLengthDropdown(!showSummaryLengthDropdown)
                }
                disabled={isProcessing}
                aria-label={`Length: ${summaryLength}`}
                aria-expanded={showSummaryLengthDropdown}
                aria-haspopup="true"
                title={`Length: ${summaryLength}`}
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
                  textTransform: 'capitalize',
                }}
              >
                {summaryLength}
              </button>

              {showSummaryLengthDropdown && (
                <div
                  ref={summaryLengthDropdownRef}
                  style={{
                    position: 'absolute',
                    right: '90px',
                    bottom: '100%',
                    marginBottom: '4px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    zIndex: 10000,
                    minWidth: '100px',
                  }}
                >
                  {(['short', 'medium', 'long'] as const).map((length, index, arr) => (
                    <button
                      key={length}
                      onClick={() => {
                        setSummaryLength(length);
                        setShowSummaryLengthDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: summaryLength === length ? 'var(--surface-2)' : 'transparent',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-sm)',
                        textTransform: 'capitalize',
                        borderRadius:
                          index === 0
                            ? 'var(--radius-md) var(--radius-md) 0 0'
                            : index === arr.length - 1
                              ? '0 0 var(--radius-md) var(--radius-md)'
                              : '0',
                      }}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice recording button */}
              <button
                className={`flint-btn ${isSummarizeRecording ? 'recording' : 'ghost'}`}
                onClick={() => handleVoiceToggle('summarize')}
                disabled={isProcessing}
                aria-label={isSummarizeRecording ? 'Stop recording' : 'Start voice input'}
                title={isSummarizeRecording ? 'Stop recording' : 'Voice input'}
                style={{
                  width: '36px',
                  height: '36px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isSummarizeRecording ? undefined : 'none',
                  boxShadow: isSummarizeRecording ? undefined : 'none',
                  background: isSummarizeRecording ? undefined : 'transparent',
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

              {/* Summarize button */}
              <button
                className="flint-btn primary"
                onClick={isProcessing ? handleStop : handleSummarize}
                aria-label={isProcessing ? 'Stop' : 'Summarize'}
                aria-busy={isProcessing}
                title={isProcessing ? 'Stop summarizing' : 'Summarize'}
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
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned notes indicator removed - now shown in collapsible PinnedNotesPanel */}
    </div>
  );
}
