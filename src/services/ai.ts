/**
 * AI service for Chrome built-in AI APIs
 * Implements Summarizer, Rewriter, and Prompt APIs per May 2025 spec
 * https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c
 */

import {
  assembleContext,
  formatContextForPrompt,
  getNearestHeading,
  type ContextEngineOptions,
} from '../utils/contextEngine';
import { StorageService } from './storage';

/**
 * AI availability status
 * Maps Chrome API responses to consistent internal format
 */
export type AIAvailabilityStatus = 'available' | 'unavailable' | 'after-download';

/**
 * AI availability for all APIs
 */
export interface AIAvailability {
  promptAPI: AIAvailabilityStatus;
  summarizerAPI: AIAvailabilityStatus;
  rewriterAPI: AIAvailabilityStatus;
  writerAPI: AIAvailabilityStatus;
}

/**
 * Summary options
 */
export interface SummaryOptions {
  mode: 'bullets' | 'paragraph' | 'brief';
  readingLevel: 'simple' | 'moderate' | 'detailed' | 'complex';
  length?: 'short' | 'medium' | 'long';
  pinnedNotes?: string[];
}

/**
 * Rewrite options
 */
export interface RewriteOptions {
  preset?:
    | 'clarify'
    | 'simplify'
    | 'concise'
    | 'expand'
    | 'friendly'
    | 'formal'
    | 'poetic'
    | 'persuasive';
  customPrompt?: string;
  tone?: 'more-formal' | 'more-casual' | 'as-is';
  pinnedNotes?: string[];
}

/**
 * Generate options
 */
export interface GenerateOptions {
  pinnedNotes?: string[];
  length?: 'short' | 'medium' | 'long';
  lengthHint?: number;
  context?: string;
  projectTitle?: string;
  smartInstructions?: string;
  documentType?: 'email' | 'letter' | 'article' | 'list' | 'code' | 'general';
}

/**
 * Download progress callback type
 */
export type DownloadProgressCallback = (progress: number) => void;

/**
 * AI Service class
 */
export class AIService {
  private static availabilityCache: AIAvailability | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 60000; // 1 minute
  private static downloadProgressCallback: DownloadProgressCallback | null = null;

  /**
   * Checks availability of all AI APIs
   * @returns Promise resolving to availability status for each API
   */
  static async checkAvailability(): Promise<AIAvailability> {
    // Return cached result if still valid
    const now = Date.now();
    if (this.availabilityCache && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.availabilityCache;
    }

    const availability: AIAvailability = {
      promptAPI: 'unavailable',
      summarizerAPI: 'unavailable',
      rewriterAPI: 'unavailable',
      writerAPI: 'unavailable',
    };

    // Check Prompt API (window.ai.canCreateTextSession per May 2025 spec)
    // Note: Prompt API may not be available in extension contexts (side panels, popups)
    // even when enabled in chrome://flags. This is a known limitation.
    try {
      // Try window.ai first (standard location)
      if ('ai' in window && typeof (window as any).ai?.canCreateTextSession === 'function') {
        const status = await (window as any).ai.canCreateTextSession();
        // status is "readily", "after-download", or "no"
        availability.promptAPI =
          status === 'readily'
            ? 'available'
            : status === 'after-download'
              ? 'after-download'
              : 'unavailable';
      }
      // Try self.ai as fallback (may be available in extension context)
      else if ('ai' in self && typeof (self as any).ai?.canCreateTextSession === 'function') {
        const status = await (self as any).ai.canCreateTextSession();
        availability.promptAPI =
          status === 'readily'
            ? 'available'
            : status === 'after-download'
              ? 'after-download'
              : 'unavailable';
      } else {
        // Prompt API is not available in extension contexts, but Summarizer and Rewriter should work
        availability.promptAPI = 'unavailable';
      }
    } catch (error) {
      console.error('[AI] Prompt API check failed:', error);
      availability.promptAPI = 'unavailable';
    }

    // Check Summarizer API
    try {
      if ('Summarizer' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Summarizer.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.summarizerAPI =
          status === 'available'
            ? 'available'
            : status === 'downloadable'
              ? 'after-download'
              : 'unavailable';
      }
    } catch (error) {
      console.error('[AI] Summarizer API check failed:', error);
    }

    // Check Rewriter API
    try {
      if ('Rewriter' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Rewriter.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.rewriterAPI =
          status === 'available'
            ? 'available'
            : status === 'downloadable'
              ? 'after-download'
              : 'unavailable';
      }
    } catch (error) {
      console.error('[AI] Rewriter API check failed:', error);
    }

    // Check Writer API
    try {
      if ('Writer' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Writer.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.writerAPI =
          status === 'available'
            ? 'available'
            : status === 'downloadable'
              ? 'after-download'
              : 'unavailable';
      }
    } catch (error) {
      console.error('[AI] Writer API check failed:', error);
    }

    this.availabilityCache = availability;
    this.cacheTimestamp = now;

    return availability;
  }

  /**
   * Checks if user activation is present (required for AI APIs)
   * @returns True if user activation is active
   */
  static isUserActivationActive(): boolean {
    return navigator.userActivation?.isActive ?? false;
  }

  /**
   * Gets measurement unit context string for AI prompts
   * @returns Context string with measurement unit preference
   */
  static async getMeasurementUnitContext(): Promise<string> {
    try {
      const settings = await StorageService.getSettings();
      const unit = settings.measurementUnit || 'metric';
      
      if (unit === 'imperial') {
        return 'Use imperial units (miles, pounds, Fahrenheit, gallons) for all measurements.';
      } else {
        return 'Use metric units (kilometers, kilograms, Celsius, liters) for all measurements.';
      }
    } catch (error) {
      console.error('[AI] Failed to get measurement unit context:', error);
      return 'Use metric units (kilometers, kilograms, Celsius, liters) for all measurements.';
    }
  }

  /**
   * Ensures user activation is present, throws error if not
   * @throws Error if user activation is not active
   */
  protected static ensureUserActivation(): void {
    if (!this.isUserActivationActive()) {
      throw new Error('User activation required. Please click the button again to continue.');
    }
  }

  /**
   * Gets a user-friendly error message
   * @param error - The error object
   * @returns User-friendly error message
   */
  protected static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('User activation') || error.message.includes('user gesture')) {
        return 'Please click the button again to continue.';
      }
      if (error.message.includes('not available') || error.message.includes('not supported')) {
        return 'AI features require Chrome 128+ with Gemini Nano enabled.';
      }
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Clears the availability cache (useful after settings change)
   */
  static clearCache(): void {
    this.availabilityCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Sets a callback for download progress updates
   * @param callback - Function to call with progress (0-1)
   */
  static setDownloadProgressCallback(callback: DownloadProgressCallback | null): void {
    this.downloadProgressCallback = callback;
  }

  /**
   * Pre-warms AI models by actually creating sessions to load them into memory
   * This eliminates the slow first-use after app restart
   * Call this early (e.g., on app init) to warm up models in the background
   * @returns Promise resolving to availability status
   */
  static async prewarmModels(): Promise<AIAvailability> {
    console.log('[AI] Pre-warming models (loading into memory)...');
    const availability = await this.checkAvailability();

    // Track which models were warmed up
    const warmedModels: string[] = [];
    const failedModels: string[] = [];

    // Create warmup promises for all available models (run in parallel)
    const warmupPromises: Promise<void>[] = [];

    // Warm up Summarizer if available
    if (availability.summarizerAPI === 'available') {
      warmupPromises.push(
        (async () => {
          try {
            console.log('[AI] Warming up Summarizer...');
            await (self as any).Summarizer.create({
              type: 'key-points',
              format: 'plain-text',
              length: 'short',
              outputLanguage: 'en',
            });
            warmedModels.push('Summarizer');
            console.log('[AI] ✓ Summarizer warmed up');
          } catch (error) {
            console.warn('[AI] Failed to warm up Summarizer:', error);
            failedModels.push('Summarizer');
          }
        })()
      );
    }

    // Warm up Rewriter if available
    if (availability.rewriterAPI === 'available') {
      warmupPromises.push(
        (async () => {
          try {
            console.log('[AI] Warming up Rewriter...');
            await (self as any).Rewriter.create({
              tone: 'as-is',
              format: 'plain-text',
              length: 'as-is',
              outputLanguage: 'en',
            });
            warmedModels.push('Rewriter');
            console.log('[AI] ✓ Rewriter warmed up');
          } catch (error) {
            console.warn('[AI] Failed to warm up Rewriter:', error);
            failedModels.push('Rewriter');
          }
        })()
      );
    }

    // Warm up Writer if available
    if (availability.writerAPI === 'available') {
      warmupPromises.push(
        (async () => {
          try {
            console.log('[AI] Warming up Writer...');
            await (self as any).Writer.create({
              tone: 'neutral',
              format: 'plain-text',
              length: 'short',
              outputLanguage: 'en',
            });
            warmedModels.push('Writer');
            console.log('[AI] ✓ Writer warmed up');
          } catch (error) {
            console.warn('[AI] Failed to warm up Writer:', error);
            failedModels.push('Writer');
          }
        })()
      );
    }

    // Wait for all warmup operations to complete in parallel
    await Promise.allSettled(warmupPromises);

    // Log summary
    if (warmedModels.length > 0) {
      console.log(`[AI] ✓ Pre-warming complete! Warmed up: ${warmedModels.join(', ')}`);
    }
    if (failedModels.length > 0) {
      console.log(`[AI] ⚠ Some models failed to warm up: ${failedModels.join(', ')}`);
    }

    // Check for models that need download
    const needsDownload = Object.entries(availability)
      .filter(([_, status]) => status === 'after-download')
      .map(([api]) => api);

    if (needsDownload.length > 0) {
      console.log('[AI] Models need download:', needsDownload.join(', '));
      console.log('[AI] Models will download on first use. This may take 1-2 minutes.');
    }

    return availability;
  }

  /**
   * Generates text using the Prompt API
   * @param prompt - The prompt text
   * @returns Promise resolving to generated text
   * @throws Error if API is unavailable or user activation is missing
   */
  static async prompt(prompt: string): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();
    if (availability.promptAPI === 'unavailable') {
      throw new Error(
        'Prompt API is not available. AI features require Chrome 128+ with Gemini Nano enabled.'
      );
    }

    try {
      // Log the full prompt for debugging
      console.log('[AI] Prompt API - Full prompt being sent:', prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
      
      const session = await (window as any).ai.createTextSession();
      const result = await Promise.race([
        session.prompt(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 30000)
        ),
      ]);
      return result;
    } catch (error) {
      console.error('[AI] Prompt API error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Summarizes text using the Summarizer API
   * @param text - The text to summarize
   * @param options - Summary options
   * @returns Promise resolving to summary text
   */
  static async summarize(text: string, options: SummaryOptions): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if unavailable
    if (availability.summarizerAPI === 'unavailable') {
      return MockAIProvider.summarize(text, options);
    }

    try {
      // Map mode to API type
      // Valid types: 'key-points', 'teaser', 'headline'
      const typeMap: Record<string, string> = {
        bullets: 'key-points',
        paragraph: 'teaser',
        brief: 'headline',
      };

      // Use explicit length if provided, otherwise map from reading level
      const lengthFromReadingLevel: Record<string, string> = {
        simple: 'short',
        moderate: 'medium',
        detailed: 'medium',
        complex: 'long',
      };

      const summaryLength =
        options.length || lengthFromReadingLevel[options.readingLevel] || 'medium';

      // Add word count targets to shared context based on length
      const wordCountGuidance: Record<string, string> = {
        short: 'Keep summary very brief, around 25 words total.',
        medium: 'Provide a moderate summary, around 50 words total.',
        long: 'Provide a detailed summary, around 200 words total.',
      };

      // Add specific guidance for bullet points to keep them brief
      const bulletGuidance =
        options.mode === 'bullets'
          ? 'Each bullet point must be extremely brief - just the key point in 3-5 words maximum, like a headline.'
          : '';

      // Add current date/time context
      const now = new Date();
      const dateTimeContext = `Current date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

      // Get measurement unit context
      const measurementContext = await this.getMeasurementUnitContext();

      // Merge date/time, measurement unit, pinned notes, word count guidance, and bullet guidance into shared context
      let sharedContext = `${dateTimeContext}\n${measurementContext}`;
      if (options.pinnedNotes?.length) {
        sharedContext += `\n\nAudience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`;
      }
      if (wordCountGuidance[summaryLength]) {
        sharedContext += '\n\n' + wordCountGuidance[summaryLength];
      }
      if (bulletGuidance) {
        sharedContext += '\n\n' + bulletGuidance;
      }

      const summarizer = await (self as any).Summarizer.create({
        type: typeMap[options.mode] || 'key-points',
        format: 'plain-text',
        length: summaryLength,
        sharedContext,
        outputLanguage: 'en', // Required for optimal output quality and safety
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            const progress = e.loaded || 0;
            console.log(`[AI] Summarizer download progress: ${Math.round(progress * 100)}%`);
            if (AIService.downloadProgressCallback) {
              AIService.downloadProgressCallback(progress);
            }
          });
        },
      });

      const result = await Promise.race([
        summarizer.summarize(text),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 30000)
        ),
      ]);

      return result;
    } catch (error) {
      console.error('[AI] Summarizer API error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Rewrites text using specialized APIs with proper fallback order
   * Priority: Rewriter API → Writer API → Prompt API
   * @param text - The text to rewrite
   * @param options - Rewrite options
   * @returns Promise resolving to rewritten text
   */
  static async rewrite(text: string, options: RewriteOptions): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (
      availability.rewriterAPI === 'unavailable' &&
      availability.writerAPI === 'unavailable' &&
      availability.promptAPI === 'unavailable'
    ) {
      return MockAIProvider.rewrite(text, options);
    }

    // Add current date/time context
    const now = new Date();
    const dateTimeContext = `Current date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    // Get measurement unit context
    const measurementContext = await this.getMeasurementUnitContext();

    // Merge date/time, measurement unit, and pinned notes into context
    let sharedContext = `${dateTimeContext}\n${measurementContext}`;
    if (options.pinnedNotes?.length) {
      sharedContext += `\n\nAudience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`;
    }

    // PRIORITY 1: Try Rewriter API for preset tones (most specialized)
    if (!options.customPrompt && availability.rewriterAPI === 'available') {
      try {
        console.log('[AI] Rewrite - Using Rewriter API (preset tone)');
        const rewriter = await (self as any).Rewriter.create({
          tone: options.tone || 'as-is',
          format: 'plain-text',
          length: 'as-is',
          sharedContext,
          outputLanguage: 'en',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              const progress = e.loaded || 0;
              console.log(`[AI] Rewriter download progress: ${Math.round(progress * 100)}%`);
              if (AIService.downloadProgressCallback) {
                AIService.downloadProgressCallback(progress);
              }
            });
          },
        });

        const result = await Promise.race([
          rewriter.rewrite(text),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.error('[AI] Rewriter API failed, trying Writer API:', error);
        // Fall through to Writer API
      }
    }

    // PRIORITY 2: Try Writer API for custom prompts (second most specialized)
    if (options.customPrompt && availability.writerAPI === 'available') {
      try {
        console.log('[AI] Rewrite - Using Writer API for custom prompt');

        const writerPrompt = `You are a text editor. Your ONLY job is to make a small edit to existing text.

ORIGINAL TEXT (do NOT change anything except what the instruction asks):
${text}

EDIT INSTRUCTION:
${options.customPrompt}

CRITICAL: Output ONLY the edited version of the ORIGINAL TEXT above. Do NOT write a new email or letter. Do NOT add greetings, signatures, or extra sentences. Just make the requested edit to the original text.`;

        const writer = await (self as any).Writer.create({
          tone: 'neutral',
          format: 'plain-text',
          length: 'medium', // Writer API doesn't support 'as-is'
          sharedContext,
          outputLanguage: 'en',
        });

        const result = await Promise.race([
          writer.write(writerPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        console.log('[AI] Rewrite - Writer API returned:', result);
        return result;
      } catch (error) {
        console.error('[AI] Writer API failed, trying Prompt API:', error);
        // Fall through to Prompt API
      }
    }

    // PRIORITY 3: Final fallback to Prompt API (most generic)
    if (availability.promptAPI === 'available') {
      console.log('[AI] Rewrite - Using Prompt API as fallback');
      const instruction = options.customPrompt || 'Rewrite this text to improve clarity and flow';
      const prompt = `Task: Edit the following text according to the instruction.

Text: "${text}"

Instruction: ${instruction}

Rules:
1. Start with the exact text shown in quotes above
2. Make ONLY the change requested in the instruction
3. Output the result with NO explanations, NO quotes, NO extra text

Output:`;

      console.log('[AI] Rewrite fallback - Original text:', text);
      console.log('[AI] Rewrite fallback - Instruction:', instruction);
      const result = await this.prompt(prompt);
      console.log('[AI] Rewrite fallback - AI returned:', result);
      return result;
    }

    // If we get here, no API is available
    throw new Error('AI features not available. Please enable Chrome AI.');
  }

  /**
   * Generates text using the Writer API or Prompt API fallback
   * Intelligently constructs prompts based on surrounding context to ensure generated text flows naturally
   * Uses lightweight context engine for better document understanding
   * @param prompt - The generation prompt
   * @param options - Generation options including context, length, and pinned notes
   * @returns Promise resolving to generated text
   */
  static async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.writerAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.generate(prompt, options);
    }

    // Build context-aware prompt with smart instructions
    let fullPrompt = '';

    // Add current date/time context
    const now = new Date();
    const dateTimeContext = `CURRENT DATE AND TIME: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}\n`;

    // Get measurement unit context
    const measurementContext = await this.getMeasurementUnitContext();

    // Note: We don't include project title in the prompt because it causes the AI
    // to add unwanted markdown headers like "## My First Project" to the output
    const projectContext = '';

    if (options.context) {
      // Extract text before and after cursor for better context
      const contextLines = options.context.split('\n');
      const beforeContext = contextLines.slice(0, -1).join('\n').slice(-1500); // Increased to 1500 chars
      const afterContext = contextLines.slice(-1).join('\n').slice(0, 1500); // Increased to 1500 chars

      // Build intelligent prompt based on context and document type
      const docTypeDesc =
        options.documentType === 'email'
          ? 'an email'
          : options.documentType === 'letter'
            ? 'a letter'
            : options.documentType === 'article'
              ? 'an article'
              : 'a document';

      // Build context in priority order: date/time → measurement unit → project title → document context → pinned notes → user instruction
      fullPrompt = `CRITICAL RULE: NEVER USE SQUARE BRACKETS [] FOR PLACEHOLDERS. NO [Name], [Date], [Company], [Boss's Name], [Your Name], or ANY [] placeholders. If you don't know a specific name or date, just omit it - do NOT make up fake names.

${dateTimeContext}${measurementContext}
${projectContext}
You are a writing assistant. The user is writing ${docTypeDesc} and needs you to generate text at their cursor position.

CONTEXT BEFORE CURSOR:
${beforeContext || '[Start of document]'}

CONTEXT AFTER CURSOR:
${afterContext || '[End of document]'}
${options.pinnedNotes?.length ? `\nAUDIENCE AND TONE GUIDANCE:\n${options.pinnedNotes.join('\n')}\n` : ''}
USER'S INSTRUCTION: ${prompt}

${options.smartInstructions ? `SPECIFIC INSTRUCTIONS FOR THIS CONTEXT:\n- ${options.smartInstructions}\n\n` : ''}
INSTRUCTIONS:
• Generate new sentences that continue naturally from the context
• Do NOT repeat text from the context above
• Start with fresh content that flows from what came before
• Output ONLY the generated text - no explanations or meta-commentary
3. If the user asks to "talk more about" or "expand on" something, provide NEW details, examples, or perspectives - do NOT restate what's already written
4. Match the writing style, tone, and format of the surrounding text
5. Ensure the generated text flows naturally with what comes before and after
6. Output ONLY the new text itself - no explanations, no meta-commentary
7. Do NOT say things like "Here's the text:" or "Based on the context..."
8. Start directly with the actual content
9. Do NOT add markdown headers (##, ###) unless they already exist in the context
10. Do NOT add a title or heading at the start - just write the body content

ABSOLUTELY NO SQUARE BRACKETS [] - If you don't know a name or date, omit it completely.`;
    } else {
      // No context - standalone generation
      // Build context in priority order: date/time → measurement unit → project title → pinned notes → user instruction
      fullPrompt = `CRITICAL RULE: NEVER USE SQUARE BRACKETS [] FOR PLACEHOLDERS. NO [Name], [Date], [Company], or ANY [] placeholders. If you don't know a specific name or date, just omit it - do NOT make up fake names.

${dateTimeContext}${measurementContext}
${projectContext}${options.pinnedNotes?.length ? `AUDIENCE AND TONE GUIDANCE:\n${options.pinnedNotes.join('\n')}\n\n` : ''}USER'S INSTRUCTION: ${prompt}

${options.smartInstructions ? `SPECIFIC INSTRUCTIONS:\n- ${options.smartInstructions}\n\n` : ''}
INSTRUCTIONS:
- Output ONLY the generated text itself
- Do NOT include any meta-commentary, explanations, or acknowledgments
- Do NOT say things like "Here's the text:" or "I will generate..."
- Start directly with the requested content
- Do NOT add markdown headers (##, ###) or a title at the start
- Just write the body content in plain paragraphs

ABSOLUTELY NO SQUARE BRACKETS [] - If you don't know a name or date, omit it completely.`;
    }

    // Add word count target if specified
    if (options.lengthHint) {
      fullPrompt += `\n- Generate approximately ${options.lengthHint} words`;
    } else if (options.length === 'long') {
      fullPrompt += `\n- Generate a detailed response (around 200 words)`;
    } else if (options.length === 'short') {
      fullPrompt += `\n- Generate a very brief response (around 25 words)`;
    } else {
      fullPrompt += `\n- Generate a moderate response (around 50 words)`;
    }

    // Note: Pinned notes are already included in fullPrompt above in the correct order
    // For Writer API, we pass empty sharedContext since context is already in the prompt
    const sharedContext = '';

    // Try Writer API first
    if (availability.writerAPI === 'available') {
      try {
        const writer = await (self as any).Writer.create({
          tone: 'neutral',
          format: 'plain-text',
          length: options.length || 'medium',
          sharedContext,
          outputLanguage: 'en',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              const progress = e.loaded || 0;
              console.log(`[AI] Writer download progress: ${Math.round(progress * 100)}%`);
              if (AIService.downloadProgressCallback) {
                AIService.downloadProgressCallback(progress);
              }
            });
          },
        });

        const result = await Promise.race([
          writer.write(fullPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.error('[AI] Writer API failed, falling back to Prompt API:', error);
      }
    }

    // Fallback to Prompt API - fullPrompt already contains all context in correct order
    return this.prompt(fullPrompt);
  }

  /**
   * Generates a context summary of output text for use in follow-up requests
   * @param text - The generated output text to summarize
   * @returns Promise resolving to a context summary (last 300 chars for continuation)
   */
  static async generateOutputSummary(text: string): Promise<string> {
    // Use last 300 chars as context for better continuation
    // This gives the AI the ending of the previous output to continue from
    // Note: AI APIs require user activation and cannot be called in background
    if (text.length <= 300) {
      return text;
    }
    return '...' + text.slice(-300).trim();
  }

  /**
   * Generates text with enhanced context awareness using a two-stage process:
   * Stage 1: Generate continuation from left context (Writer API)
   * Stage 2: Rewrite to smooth transitions with both left and right context (Rewriter API)
   * 
   * This approach works around the limitation that generation models can't do true infilling,
   * but rewrite models can use bidirectional context to smooth transitions.
   * 
   * @param prompt - The generation prompt
   * @param fullDocument - Complete document text
   * @param cursorPos - Current cursor position
   * @param options - Generation options
   * @param contextOptions - Context engine options
   * @returns Promise resolving to generated text
   */
  static async generateWithEnhancedContext(
    prompt: string,
    fullDocument: string,
    cursorPos: number,
    options: GenerateOptions = {},
    contextOptions: ContextEngineOptions = {}
  ): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.writerAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.generate(prompt, options);
    }

    // Assemble intelligent context using the context engine
    const assembledContext = assembleContext(fullDocument, cursorPos, {
      localWindow: 1500, // 1500 chars around cursor
      maxRelatedSections: 3, // Include 3 most relevant sections
      enableRelevanceScoring: true,
      enableDeduplication: true,
      ...contextOptions,
    });

    console.log('[AI] Enhanced context assembled:', {
      localChars: assembledContext.localContext.length,
      cursorOffset: assembledContext.cursorOffset,
      textBeforeCursor: assembledContext.localContext.slice(0, assembledContext.cursorOffset).slice(-50),
      textAfterCursor: assembledContext.localContext.slice(assembledContext.cursorOffset).slice(0, 50),
      relatedSections: assembledContext.relatedSections.length,
      totalChars: assembledContext.totalChars,
    });

    // Format context for prompt
    const formattedContext = formatContextForPrompt(assembledContext, true);
    
    console.log('[AI] Formatted context for prompt:');
    console.log(formattedContext.substring(0, 500));

    // Get nearest heading for additional context
    const nearestHeading = getNearestHeading(fullDocument, cursorPos);

    // Build enhanced prompt
    const now = new Date();
    const dateTimeContext = `CURRENT DATE AND TIME: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}\n`;

    // Get measurement unit context
    const measurementContext = await this.getMeasurementUnitContext();

    let projectContext = '';
    if (options.projectTitle) {
      projectContext = `DOCUMENT TITLE: "${options.projectTitle}"\n`;
    }

    if (nearestHeading) {
      projectContext += `CURRENT SECTION: "${nearestHeading}"\n`;
    }

    const docTypeDesc =
      options.documentType === 'email'
        ? 'an email'
        : options.documentType === 'letter'
          ? 'a letter'
          : options.documentType === 'article'
            ? 'an article'
            : 'a document';

    // Build context in priority order: date/time → measurement unit → project title → document context → pinned notes → user instruction
    const fullPrompt = `CRITICAL RULE: NEVER USE SQUARE BRACKETS [] FOR PLACEHOLDERS. NO [Name], [Date], [Company], or ANY [] placeholders. If you don't know a specific name or date, just omit it.

${dateTimeContext}${measurementContext}
${projectContext}
You are a writing assistant. The user is writing ${docTypeDesc} and needs you to generate text at their cursor position.

${formattedContext}
${options.pinnedNotes?.length ? `\nAUDIENCE AND TONE GUIDANCE:\n${options.pinnedNotes.join('\n')}\n` : ''}
USER'S INSTRUCTION: ${prompt}

${options.smartInstructions ? `SPECIFIC INSTRUCTIONS FOR THIS CONTEXT:\n- ${options.smartInstructions}\n\n` : ''}
INSTRUCTIONS:
• Generate new sentences that continue naturally from the context
• Do NOT repeat text from the context above
• Start with fresh content that flows from what came before
• Output ONLY the generated text - no explanations or meta-commentary

ABSOLUTELY NO SQUARE BRACKETS [] - If you don't know a name or date, omit it completely.`;

    // Add word count target
    let finalPrompt = fullPrompt;
    if (options.lengthHint) {
      finalPrompt += `\n- Generate approximately ${options.lengthHint} words`;
    } else if (options.length === 'long') {
      finalPrompt += `\n- Generate a detailed response (around 200 words)`;
    } else if (options.length === 'short') {
      finalPrompt += `\n- Generate a very brief response (around 25 words)`;
    } else {
      finalPrompt += `\n- Generate a moderate response (around 50 words)`;
    }
    
    console.log('[AI] Final prompt being sent (first 1000 chars):');
    console.log(finalPrompt.substring(0, 1000));

    // Merge pinned notes into context
    const sharedContext = options.pinnedNotes?.length
      ? `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`
      : '';

    // Try Writer API first
    if (availability.writerAPI === 'available') {
      try {
        const writer = await (self as any).Writer.create({
          tone: 'neutral',
          format: 'plain-text',
          length: options.length || 'medium',
          sharedContext,
          outputLanguage: 'en',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              const progress = e.loaded || 0;
              console.log(`[AI] Writer download progress: ${Math.round(progress * 100)}%`);
              if (AIService.downloadProgressCallback) {
                AIService.downloadProgressCallback(progress);
              }
            });
          },
        });

        const result = await Promise.race([
          writer.write(finalPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.error('[AI] Writer API failed, falling back to Prompt API:', error);
      }
    }

    // Fallback to Prompt API
    const promptWithContext = sharedContext ? `${sharedContext}\n\n${finalPrompt}` : finalPrompt;
    return this.prompt(promptWithContext);
  }

  /**
   * Rewrites text with enhanced context awareness
   * Includes surrounding document context to maintain consistency
   * @param text - Text to rewrite
   * @param fullDocument - Complete document text
   * @param selectionStart - Start position of selection
   * @param options - Rewrite options
   * @returns Promise resolving to rewritten text
   */
  static async rewriteWithContext(
    text: string,
    fullDocument: string,
    selectionStart: number,
    options: RewriteOptions
  ): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.rewriterAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.rewrite(text, options);
    }

    // Get surrounding context (500 chars before and after)
    const beforeContext = fullDocument.substring(Math.max(0, selectionStart - 500), selectionStart);
    const afterContext = fullDocument.substring(
      selectionStart + text.length,
      Math.min(fullDocument.length, selectionStart + text.length + 500)
    );

    // Add current date/time context
    const now = new Date();
    const dateTimeContext = `Current date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    // Get measurement unit context
    const measurementContext = await this.getMeasurementUnitContext();

    // Build context-aware prompt in priority order: date/time → measurement unit → document context → pinned notes
    let contextPrompt = `${dateTimeContext}\n${measurementContext}`;

    if (beforeContext.trim() || afterContext.trim()) {
      contextPrompt += '\n\nSurrounding context for style matching:';
      if (beforeContext.trim()) {
        contextPrompt += `\nBefore: "${beforeContext.trim().slice(-200)}"`;
      }
      if (afterContext.trim()) {
        contextPrompt += `\nAfter: "${afterContext.trim().slice(0, 200)}"`;
      }
      contextPrompt +=
        '\n\nEnsure the rewritten text flows naturally with the surrounding context.';
    }

    // Add pinned notes for audience and tone guidance
    if (options.pinnedNotes?.length) {
      contextPrompt += `\n\nAudience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`;
    }

    // Debug logging
    console.log('[AI] RewriteWithContext - customPrompt:', options.customPrompt);
    console.log('[AI] RewriteWithContext - rewriterAPI availability:', availability.rewriterAPI);
    console.log('[AI] RewriteWithContext - writerAPI availability:', availability.writerAPI);
    console.log('[AI] RewriteWithContext - promptAPI availability:', availability.promptAPI);

    // PRIORITY 1: Try Rewriter API for preset tones (most specialized)
    if (!options.customPrompt && availability.rewriterAPI === 'available') {
      try {
        console.log('[AI] RewriteWithContext - Using Rewriter API (preset tone)');
        const rewriter = await (self as any).Rewriter.create({
          tone: options.tone || 'as-is',
          format: 'plain-text',
          length: 'as-is',
          sharedContext: contextPrompt,
          outputLanguage: 'en',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              const progress = e.loaded || 0;
              console.log(`[AI] Rewriter download progress: ${Math.round(progress * 100)}%`);
              if (AIService.downloadProgressCallback) {
                AIService.downloadProgressCallback(progress);
              }
            });
          },
        });

        const result = await Promise.race([
          rewriter.rewrite(text),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.error('[AI] Rewriter API failed, trying Writer API:', error);
        // Fall through to Writer API
      }
    }

    // PRIORITY 2: Try Writer API for custom prompts (second most specialized)
    if (options.customPrompt && availability.writerAPI === 'available') {
      try {
        console.log('[AI] RewriteWithContext - Using Writer API for custom prompt');

        const writerPrompt = `Edit this text according to the instruction. Output ONLY the edited text with no explanations.

TEXT TO EDIT:
"${text}"

INSTRUCTION: ${options.customPrompt}

RULES:
- Output ONLY the edited version of the text in quotes above
- Do NOT add extra sentences, greetings, or signatures
- Make ONLY the specific change requested
- Keep everything else exactly the same

Edited text:`;

        const writer = await (self as any).Writer.create({
          tone: 'neutral',
          format: 'plain-text',
          length: 'short', // Use 'short' to discourage adding extra content
          sharedContext: contextPrompt,
          outputLanguage: 'en',
        });

        let result = await Promise.race([
          writer.write(writerPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        // Clean up common AI artifacts
        result = result.trim();
        
        // Remove quotes if AI wrapped the output
        if ((result.startsWith('"') && result.endsWith('"')) || 
            (result.startsWith("'") && result.endsWith("'"))) {
          result = result.slice(1, -1);
        }
        
        // Remove "Edited text:" prefix if present
        result = result.replace(/^Edited text:\s*/i, '');
        
        console.log('[AI] RewriteWithContext - Writer API returned:', result);
        return result;
      } catch (error) {
        console.error('[AI] Writer API failed, trying Prompt API:', error);
        // Fall through to Prompt API
      }
    }

    // PRIORITY 3: Final fallback to Prompt API (most generic)
    if (availability.promptAPI === 'available') {
      console.log('[AI] RewriteWithContext - Using Prompt API as fallback');
      const instruction = options.customPrompt || 'Rewrite this text to improve clarity and flow';
      const prompt = `Task: Edit the following text according to the instruction.

Text: "${text}"

Instruction: ${instruction}

Rules:
1. Start with the exact text shown in quotes above
2. Make ONLY the change requested in the instruction
3. Output the result with NO explanations, NO quotes, NO extra text

Output:`;

      console.log('[AI] RewriteWithContext fallback - Original text:', text);
      console.log('[AI] RewriteWithContext fallback - Instruction:', instruction);
      const result = await this.prompt(prompt);
      console.log('[AI] RewriteWithContext fallback - AI returned:', result);
      return result;
    }

    throw new Error('AI features not available. Please enable Chrome AI.');
  }

  /**
   * Generates a smart title for a document based on user prompt only
   * Called BEFORE content generation to create a contextual title
   * Uses Summarizer API in 'headline' mode for creative, catchy titles
   * @param userPrompt - The original user prompt/instruction
   * @returns Promise resolving to a creative title (max 50 chars)
   * @throws Error if API is unavailable or user activation is missing
   */
  static async generateTitle(userPrompt: string): Promise<string> {
    console.log('[AI] generateTitle called with prompt:', userPrompt);
    
    // Note: We don't check user activation here because this is called
    // during the streaming operation which may take several seconds.
    // User activation was already validated when the generate button was clicked.

    const availability = await this.checkAvailability();
    console.log('[AI] Title generation availability:', availability);

    // Use mock provider if all APIs unavailable
    if (availability.summarizerAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      console.log('[AI] Both APIs unavailable, using mock');
      // Fallback to simple title from prompt
      const words = userPrompt.split(' ').slice(0, 6).join(' ');
      return words.slice(0, 50);
    }

    try {
      // Add current date/time context
      const now = new Date();
      const dateTimeContext = `Current date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

      // Get measurement unit context
      const measurementContext = await this.getMeasurementUnitContext();

      // Try Summarizer API first with 'headline' type for creative titles
      if (availability.summarizerAPI === 'available') {
        console.log('[AI] Using Summarizer API for title generation');
        const summarizer = await (self as any).Summarizer.create({
          type: 'headline', // Ultra-brief, perfect for titles
          format: 'plain-text',
          length: 'short',
          sharedContext: `${dateTimeContext}\n${measurementContext}\n\nCreate a CREATIVE, CATCHY title that grabs attention! Use 2-5 words. Think like a magazine editor or advertising copywriter. Be bold, memorable, and intriguing. Avoid boring phrases like "Guide to" or "Explained". Make it pop!`,
          outputLanguage: 'en',
        });

        console.log('[AI] Summarizer created, calling summarize...');
        const title = await Promise.race([
          summarizer.summarize(userPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Summarizer timed out after 10s')), 10000)
          ),
        ]);
        
        console.log('[AI] Summarizer returned title:', title);

        // Clean up and truncate
        const cleanTitle = title
          .trim()
          .replace(/^(Title:|Document:|Here's the title:)\s*/i, '')
          .replace(/^["']|["']$/g, '')
          .replace(/\.$/, '') // Remove trailing period
          .trim();

        return cleanTitle.slice(0, 50) || 'Untitled';
      }

      // Fallback to Prompt API with creative instructions
      console.log('[AI] Using Prompt API for title generation');
      const prompt = `${dateTimeContext}

You are a bold, creative copywriter who writes viral headlines. Create a punchy, memorable title for:

"${userPrompt}"

Rules:
- Use 2-5 words maximum
- Be clever, witty, or intriguing
- Avoid boring words: "Guide", "Explained", "Introduction", "Overview", "Document"
- Think like a bestselling book title or viral article headline
- Use power words, metaphors, or unexpected angles
- Make people WANT to read it

Examples of good titles:
- "The SEO Playbook"
- "Ranking Secrets"
- "Search Domination"
- "Visibility Unlocked"

Output ONLY the title, nothing else.`;

      const result = await this.prompt(prompt);
      console.log('[AI] Prompt API returned title:', result);

      // Clean up the response
      let title = result
        .trim()
        .replace(/^(Title:|Document:|Here's the title:)\s*/i, '')
        .replace(/^["']|["']$/g, '')
        .replace(/\.$/, '')
        .trim();

      // Truncate if too long
      if (title.length > 50) {
        title = title.slice(0, 47) + '...';
      }

      return title || 'Untitled';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AI] Title generation failed:', errorMsg, error);
      // Re-throw the error so the caller can handle it with generateSmartTitle fallback
      throw error;
    }
  }

  /**
   * Proofreads text using the Prompt API (Proofreader API is not reliable yet)
   * @param text - The text to proofread
   * @returns Promise resolving to corrected text and corrections array
   * @throws Error if API is unavailable or user activation is missing
   */
  static async proofread(text: string): Promise<{ corrected: string; corrections: any[] }> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use Prompt API for spell/grammar checking (Proofreader API is experimental and unreliable)
    if (availability.promptAPI === 'unavailable') {
      throw new Error('Prompt API not available. Please enable Chrome AI features.');
    }

    try {
      const prompt = `You are a spell checker and grammar corrector. Fix all spelling and grammar errors in the following text.

CRITICAL RULES:
- Output ONLY the corrected text
- Do NOT add explanations, comments, or meta-text
- Do NOT say things like "Here's the corrected text:" or "I fixed..."
- Keep the same formatting and structure
- Only fix spelling and grammar errors
- Do NOT change the meaning or rewrite the content

Text to correct:
${text}`;

      const corrected = await this.prompt(prompt);

      // Clean up the response (remove any extra formatting or quotes)
      let cleanedText = corrected.trim();

      // Remove common wrapper phrases if present
      cleanedText = cleanedText
        .replace(
          /^(Here's the corrected text:|Corrected text:|Here is the corrected version:)\s*/i,
          ''
        )
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .trim();

      // Count corrections by comparing differences
      const corrections = cleanedText !== text ? [{ type: 'correction' }] : [];

      return {
        corrected: cleanedText,
        corrections,
      };
    } catch (error) {
      console.error('[AI] Prompt API proofreading failed:', error);
      throw new Error(
        'Proofreading failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
}

/**
 * Mock AI provider for fallback when APIs are unavailable
 */
class MockAIProvider {
  /**
   * Mock summarize implementation - provides fallback when Chrome AI APIs are unavailable
   * @param text - Text to summarize
   * @param options - Summary options
   * @returns Mock summary
   */
  static summarize(text: string, options: SummaryOptions): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (options.mode === 'brief') {
      // Return just the first sentence for brief mode
      return sentences[0]?.trim() + '.' || text.slice(0, 100) + '...';
    }

    const maxSentences = options.readingLevel === 'simple' ? 2 : 3;
    const summary = sentences.slice(0, maxSentences).join('. ') + '.';

    if (options.mode === 'bullets') {
      return sentences
        .slice(0, maxSentences)
        .map((s) => `• ${s.trim()}`)
        .join('\n');
    }

    return summary;
  }

  /**
   * Mock rewrite implementation
   * @param text - Text to rewrite
   * @param options - Rewrite options
   * @returns Mock rewritten text
   */
  static rewrite(text: string, options: RewriteOptions): string {
    console.warn(
      '[AI] Using mock provider - AI features require Chrome 128+ with Gemini Nano enabled'
    );

    // Simple transformations based on preset
    if (options.preset === 'formal') {
      return text.replace(/\b(gonna|wanna|gotta)\b/gi, (match) => {
        const map: Record<string, string> = {
          gonna: 'going to',
          wanna: 'want to',
          gotta: 'have to',
        };
        return map[match.toLowerCase()] || match;
      });
    }

    if (options.preset === 'concise') {
      return text
        .replace(/\b(very|really|quite|rather)\s+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (options.preset === 'friendly') {
      return text + ' 😊';
    }

    return `[Mock rewrite] ${text}`;
  }

  /**
   * Mock generate implementation - provides fallback when Chrome AI APIs are unavailable
   * @param prompt - Generation prompt
   * @param options - Generation options
   * @returns Mock generated text
   */
  static generate(prompt: string, options: GenerateOptions): string {
    // If prompt is the default "continue writing" prompt, return helpful message
    if (
      prompt.toLowerCase().includes('continue writing') ||
      prompt.toLowerCase().includes('extend this content')
    ) {
      return "What should we write about? Try adding a prompt to get started!\n\n(Note: This is a mock response. Enable Chrome's built-in AI for real generation.)";
    }

    // Generate simple, prompt-relevant response
    const promptLower = prompt.toLowerCase();
    let mockText = '';

    // Provide minimal, relevant responses based on prompt keywords
    if (promptLower.includes('song') || promptLower.includes('lyrics')) {
      mockText =
        'Verse 1:\nUnder the stars we dance tonight\nHearts beating in the pale moonlight\n\nChorus:\nThis is our moment, this is our time\nTogether we shine, together we climb';
    } else if (promptLower.includes('story') || promptLower.includes('tale')) {
      mockText =
        'Once upon a time, in a land far away, there lived a curious traveler who sought adventure beyond the horizon. Each day brought new discoveries and unexpected friendships.';
    } else if (promptLower.includes('poem') || promptLower.includes('verse')) {
      mockText =
        "Whispers of wind through autumn trees,\nGolden leaves dance in the breeze,\nNature's beauty, wild and free,\nA moment of peace for you and me.";
    } else if (promptLower.includes('email') || promptLower.includes('letter')) {
      mockText =
        'Dear [Recipient],\n\nI hope this message finds you well. I wanted to reach out regarding our recent conversation and share some thoughts on the next steps.\n\nBest regards';
    } else if (promptLower.includes('list') || promptLower.includes('ideas')) {
      mockText =
        '1. Start with a clear goal\n2. Break it into smaller steps\n3. Set realistic timelines\n4. Track your progress\n5. Celebrate small wins';
    } else {
      // Generic response for other prompts
      mockText = `Here's a response to your request: "${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}"\n\nThis is a simple demonstration. With Chrome's built-in AI enabled, you would receive more detailed and contextually relevant content.`;
    }

    // Adjust length based on options
    if (options.length === 'short' && options.lengthHint) {
      // Truncate to approximate short length
      mockText = mockText.slice(0, Math.min(mockText.length, options.lengthHint));
      if (mockText.length < options.lengthHint) {
        // Pad if needed
        mockText += ' This is a short response tailored to your length preference.';
        mockText = mockText.slice(0, options.lengthHint);
      }
    } else if (options.length === 'long') {
      // Extend for long format
      mockText +=
        '\n\nThis extended section provides additional detail and context. With longer content, you can explore topics more thoroughly and include supporting information that adds depth to the response.';
    }

    return mockText;
  }
}
