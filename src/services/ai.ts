/**
 * AI service for Chrome built-in AI APIs
 * Implements Summarizer, Rewriter, and Prompt APIs per May 2025 spec
 * https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c
 */

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
}

/**
 * Summary options
 */
export interface SummaryOptions {
  mode: 'bullets' | 'paragraph' | 'brief';
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

    // Check Prompt API (window.ai.canCreateTextSession)
    try {
      if ('ai' in window && typeof (window as any).ai.canCreateTextSession === 'function') {
        const status = await (window as any).ai.canCreateTextSession();
        // status is "readily", "after-download", or "no"
        availability.promptAPI = status === 'readily' ? 'available' : status === 'after-download' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Prompt API check failed:', error);
    }

    // Check Summarizer API
    try {
      if ('Summarizer' in self) {
        const status = await (self as any).Summarizer.availability();
        // status is "available", "downloadable", or "unavailable"
        availability.summarizerAPI = status === 'available' ? 'available' : status === 'downloadable' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Summarizer API check failed:', error);
    }

    // Check Rewriter API
    try {
      if ('Rewriter' in self) {
        const status = await (self as any).Rewriter.availability();
        // status is "available", "downloadable", or "unavailable"
        availability.rewriterAPI = status === 'available' ? 'available' : status === 'downloadable' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Rewriter API check failed:', error);
    }

    this.availabilityCache = availability;
    this.cacheTimestamp = now;

    console.log('[AI] Availability check:', availability);
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

      // Map reading level to length
      const lengthMap: Record<string, string> = {
        elementary: 'short',
        'middle-school': 'short',
        'high-school': 'medium',
        college: 'long',
      };

      // Merge pinned notes into shared context
      const sharedContext = options.pinnedNotes?.length
        ? `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`
        : '';

      const summarizer = await (self as any).Summarizer.create({
        type: typeMap[options.mode] || 'key-points',
        format: 'plain-text',
        length: lengthMap[options.readingLevel] || 'medium',
        sharedContext,
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
   * Rewrites text using the Rewriter API or Prompt API fallback
   * @param text - The text to rewrite
   * @param options - Rewrite options
   * @returns Promise resolving to rewritten text
   */
  static async rewrite(text: string, options: RewriteOptions): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.rewriterAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.rewrite(text, options);
    }

    // Merge pinned notes into context
    const sharedContext = options.pinnedNotes?.length
      ? `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`
      : '';

    // Handle custom prompt via Prompt API
    if (options.customPrompt) {
      const prompt = sharedContext 
        ? `${sharedContext}\n\n${options.customPrompt}\n\nText to rewrite:\n${text}`
        : `${options.customPrompt}\n\nText to rewrite:\n${text}`;
      return this.prompt(prompt);
    }

    // Map presets to tone
    const presetToneMap: Record<string, string> = {
      clarify: 'as-is',
      simplify: 'more-casual',
      concise: 'as-is',
      expand: 'as-is',
      friendly: 'more-casual',
      formal: 'more-formal',
      poetic: 'as-is',
      persuasive: 'as-is',
    };

    const tone = options.tone || (options.preset ? presetToneMap[options.preset] : 'as-is');

    // Try Rewriter API first
    if (availability.rewriterAPI === 'available') {
      try {
        const rewriter = await (self as any).Rewriter.create({
          tone,
          format: 'plain-text',
          length: 'as-is',
          sharedContext,
        });

        const result = await Promise.race([
          rewriter.rewrite(text),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.warn('[AI] Rewriter API failed, falling back to Prompt API:', error);
      }
    }

    // Fallback to Prompt API with preset instructions
    const presetInstructions: Record<string, string> = {
      clarify: 'Rewrite the following text to make it clearer and easier to understand.',
      simplify: 'Rewrite the following text using simpler words and shorter sentences.',
      concise: 'Rewrite the following text to be more concise without losing meaning.',
      expand: 'Rewrite the following text with more detail and explanation.',
      friendly: 'Rewrite the following text in a friendly, approachable tone.',
      formal: 'Rewrite the following text in a formal, professional tone.',
      poetic: 'Rewrite the following text with poetic, expressive language.',
      persuasive: 'Rewrite the following text to be more persuasive and compelling.',
    };

    const instruction = options.preset ? presetInstructions[options.preset] : 'Rewrite this text:';
    const prompt = sharedContext
      ? `${sharedContext}\n\n${instruction}\n\nText to rewrite:\n${text}`
      : `${instruction}\n\nText to rewrite:\n${text}`;
    
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
    
    if (options.mode === 'brief') {
      // Return just the first sentence for brief mode
      return sentences[0]?.trim() + '.' || text.slice(0, 100) + '...';
    }

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
