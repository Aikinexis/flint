/**
 * AI service for Chrome built-in AI APIs
 * Provides unified interface with capability detection and fallback handling
 */

/**
 * AI availability status
 */
export type AIAvailabilityStatus = 'available' | 'unavailable' | 'after-download';

/**
 * AI availability for all APIs
 */
export interface AIAvailability {
  promptAPI: AIAvailabilityStatus;
  summarizerAPI: AIAvailabilityStatus;
  rewriterAPI: AIAvailabilityStatus;
}

/**
 * Summary options
 */
export interface SummaryOptions {
  mode: 'bullets' | 'paragraph' | 'outline';
  readingLevel: 'elementary' | 'middle-school' | 'high-school' | 'college';
  pinnedNotes?: string[];
}

/**
 * Rewrite options
 */
export interface RewriteOptions {
  preset?: 'clarify' | 'simplify' | 'concise' | 'expand' | 'friendly' | 'formal' | 'poetic' | 'persuasive';
  customPrompt?: string;
  tone?: 'more-formal' | 'more-casual' | 'as-is';
  pinnedNotes?: string[];
}

/**
 * AI Service class
 */
export class AIService {
  private static availabilityCache: AIAvailability | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 60000; // 1 minute

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
    };

    try {
      // Check Prompt API (LanguageModel)
      if ('ai' in self && 'languageModel' in (self as any).ai) {
        const status = await (self as any).ai.languageModel.capabilities();
        availability.promptAPI = status.available as AIAvailabilityStatus;
      }
    } catch (error) {
      console.warn('[AI] Prompt API check failed:', error);
    }

    try {
      // Check Summarizer API
      if ('ai' in self && 'summarizer' in (self as any).ai) {
        const status = await (self as any).ai.summarizer.capabilities();
        availability.summarizerAPI = status.available as AIAvailabilityStatus;
      }
    } catch (error) {
      console.warn('[AI] Summarizer API check failed:', error);
    }

    try {
      // Check Rewriter API
      if ('ai' in self && 'rewriter' in (self as any).ai) {
        const status = await (self as any).ai.rewriter.capabilities();
        availability.rewriterAPI = status.available as AIAvailabilityStatus;
      }
    } catch (error) {
      console.warn('[AI] Rewriter API check failed:', error);
    }

    // Cache the result
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
      if (error.message.includes('User activation')) {
        return 'Please click the button again to continue.';
      }
      if (error.message.includes('not available')) {
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
   * Generates text using the Prompt API
   * @param prompt - The prompt text
   * @returns Promise resolving to generated text
   * @throws Error if API is unavailable or user activation is missing
   */
  static async prompt(prompt: string): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();
    if (availability.promptAPI === 'unavailable') {
      throw new Error('Prompt API is not available. AI features require Chrome 128+ with Gemini Nano enabled.');
    }

    try {
      const session = await (self as any).ai.languageModel.create();
      const result = await Promise.race([
        session.prompt(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 5000)
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
   * @throws Error if API is unavailable or user activation is missing
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
      const typeMap: Record<string, string> = {
        bullets: 'key-points',
        paragraph: 'tl;dr',
        outline: 'key-points',
      };

      // Map reading level to length
      const lengthMap: Record<string, string> = {
        elementary: 'short',
        'middle-school': 'short',
        'high-school': 'medium',
        college: 'long',
      };

      // Merge pinned notes into context
      const context = options.pinnedNotes?.length
        ? `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`
        : undefined;

      const summarizer = await (self as any).ai.summarizer.create({
        type: typeMap[options.mode] || 'key-points',
        format: 'plain-text',
        length: lengthMap[options.readingLevel] || 'medium',
      });

      const result = await Promise.race([
        summarizer.summarize(text, { context }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 5000)
        ),
      ]);

      return result;
    } catch (error) {
      console.error('[AI] Summarizer API error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Rewrites text using the Rewriter API or Prompt API fallback
   * @param text - The text to rewrite
   * @param options - Rewrite options
   * @returns Promise resolving to rewritten text
   * @throws Error if APIs are unavailable or user activation is missing
   */
  static async rewrite(text: string, options: RewriteOptions): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.rewriterAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.rewrite(text, options);
    }

    // Merge pinned notes into context
    const pinnedContext = options.pinnedNotes?.length
      ? `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}\n\n`
      : '';

    // Handle custom prompt via Prompt API
    if (options.customPrompt) {
      const prompt = `${pinnedContext}${options.customPrompt}\n\nText to rewrite:\n${text}`;
      return this.prompt(prompt);
    }

    // Map presets to tone and prompt
    const presetMap: Record<string, { tone: string; instruction: string }> = {
      clarify: { tone: 'as-is', instruction: 'Make this text clearer and easier to understand' },
      simplify: { tone: 'more-casual', instruction: 'Simplify this text using simpler words' },
      concise: { tone: 'as-is', instruction: 'Make this text more concise without losing meaning' },
      expand: { tone: 'as-is', instruction: 'Expand this text with more detail and explanation' },
      friendly: { tone: 'more-casual', instruction: 'Rewrite this in a friendly, approachable tone' },
      formal: { tone: 'more-formal', instruction: 'Rewrite this in a formal, professional tone' },
      poetic: { tone: 'as-is', instruction: 'Rewrite this with poetic, expressive language' },
      persuasive: { tone: 'as-is', instruction: 'Rewrite this to be more persuasive and compelling' },
    };

    const preset = options.preset ? presetMap[options.preset] : null;
    const tone = options.tone || preset?.tone || 'as-is';

    // Try Rewriter API first
    if (availability.rewriterAPI !== 'unavailable') {
      try {
        const context = pinnedContext + (preset?.instruction || '');
        const rewriter = await (self as any).ai.rewriter.create({
          tone,
          format: 'plain-text',
        });

        const result = await Promise.race([
          rewriter.rewrite(text, { context: context || undefined }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 5000)
          ),
        ]);

        return result;
      } catch (error) {
        console.warn('[AI] Rewriter API failed, falling back to Prompt API:', error);
      }
    }

    // Fallback to Prompt API
    const instruction = preset?.instruction || 'Rewrite this text';
    const prompt = `${pinnedContext}${instruction}:\n\n${text}`;
    return this.prompt(prompt);
  }
}

/**
 * Mock AI provider for fallback when APIs are unavailable
 */
class MockAIProvider {
  /**
   * Mock summarize implementation
   * @param text - Text to summarize
   * @param options - Summary options
   * @returns Mock summary
   */
  static summarize(text: string, options: SummaryOptions): string {
    console.warn('[AI] Using mock provider - AI features require Chrome 128+ with Gemini Nano enabled');

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const maxSentences = options.readingLevel === 'elementary' ? 2 : 3;
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
    console.warn('[AI] Using mock provider - AI features require Chrome 128+ with Gemini Nano enabled');

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
}
