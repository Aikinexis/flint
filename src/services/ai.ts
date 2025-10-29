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
  writerAPI: AIAvailabilityStatus;
}

/**
 * Summary options
 */
export interface SummaryOptions {
  mode: 'bullets' | 'paragraph' | 'brief';
  readingLevel: 'simple' | 'moderate' | 'detailed' | 'complex';
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
 * Generate options
 */
export interface GenerateOptions {
  pinnedNotes?: string[];
  length?: 'short' | 'medium' | 'long';
  lengthHint?: number;
  context?: string;
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
      writerAPI: 'unavailable',
    };

    // Check Prompt API (window.ai.canCreateTextSession per May 2025 spec)
    // Note: Prompt API may not be available in extension contexts (side panels, popups)
    // even when enabled in chrome://flags. This is a known limitation.
    try {
      // Try window.ai first (standard location)
      if ('ai' in window && typeof (window as any).ai?.canCreateTextSession === 'function') {
        const status = await (window as any).ai.canCreateTextSession();
        console.log('[AI] Prompt API (window.ai) status:', status);
        // status is "readily", "after-download", or "no"
        availability.promptAPI = status === 'readily' ? 'available' : status === 'after-download' ? 'after-download' : 'unavailable';
      }
      // Try self.ai as fallback (may be available in extension context)
      else if ('ai' in self && typeof (self as any).ai?.canCreateTextSession === 'function') {
        const status = await (self as any).ai.canCreateTextSession();
        console.log('[AI] Prompt API (self.ai) status:', status);
        availability.promptAPI = status === 'readily' ? 'available' : status === 'after-download' ? 'after-download' : 'unavailable';
      }
      else {
        console.log('[AI] Prompt API not available in extension context (this is expected)');
        // Prompt API is not available in extension contexts, but Summarizer and Rewriter should work
        availability.promptAPI = 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Prompt API check failed:', error);
      availability.promptAPI = 'unavailable';
    }

    // Check Summarizer API
    try {
      if ('Summarizer' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Summarizer.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.summarizerAPI = status === 'available' ? 'available' : status === 'downloadable' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Summarizer API check failed:', error);
    }

    // Check Rewriter API
    try {
      if ('Rewriter' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Rewriter.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.rewriterAPI = status === 'available' ? 'available' : status === 'downloadable' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Rewriter API check failed:', error);
    }

    // Check Writer API
    try {
      if ('Writer' in self) {
        // Specify outputLanguage in availability check to avoid warnings
        const status = await (self as any).Writer.availability({ outputLanguage: 'en' });
        // status is "available", "downloadable", or "unavailable"
        availability.writerAPI = status === 'available' ? 'available' : status === 'downloadable' ? 'after-download' : 'unavailable';
      }
    } catch (error) {
      console.warn('[AI] Writer API check failed:', error);
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

      // Map reading level to length with word count guidance
      const lengthMap: Record<string, string> = {
        elementary: 'short',
        'middle-school': 'short',
        'high-school': 'medium',
        college: 'long',
      };

      // Add word count targets to shared context based on reading level
      const wordCountGuidance: Record<string, string> = {
        elementary: 'Keep summary very brief, around 50-75 words.',
        'middle-school': 'Keep summary concise, around 75-100 words.',
        'high-school': 'Provide a moderate summary, around 100-150 words.',
        college: 'Provide a detailed summary, around 150-250 words.',
      };

      // Merge pinned notes and word count guidance into shared context
      let sharedContext = '';
      if (options.pinnedNotes?.length) {
        sharedContext = `Audience and tone guidance:\n${options.pinnedNotes.join('\n\n')}`;
      }
      if (wordCountGuidance[options.readingLevel]) {
        sharedContext += (sharedContext ? '\n\n' : '') + wordCountGuidance[options.readingLevel];
      }

      const summarizer = await (self as any).Summarizer.create({
        type: typeMap[options.mode] || 'key-points',
        format: 'plain-text',
        length: lengthMap[options.readingLevel] || 'medium',
        sharedContext,
        outputLanguage: 'en', // Required for optimal output quality and safety
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

    // Try Rewriter API first (preferred for extension contexts)
    if (availability.rewriterAPI === 'available') {
      try {
        // For custom prompts, use sharedContext to pass the instructions
        const context = options.customPrompt
          ? (sharedContext ? `${sharedContext}\n\n${options.customPrompt}` : options.customPrompt)
          : sharedContext;

        const rewriter = await (self as any).Rewriter.create({
          tone: options.tone || 'as-is',
          format: 'plain-text',
          length: 'as-is',
          sharedContext: context,
          outputLanguage: 'en',
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
        // Fall through to Prompt API fallback
      }
    }

    // Fallback to Prompt API if Rewriter unavailable or failed
    if (availability.promptAPI === 'available' && options.customPrompt) {
      const prompt = sharedContext 
        ? `${sharedContext}\n\n${options.customPrompt}\n\nText to rewrite:\n${text}`
        : `${options.customPrompt}\n\nText to rewrite:\n${text}`;
      return this.prompt(prompt);
    }

    // If we get here, no API is available
    throw new Error('Please provide rewrite instructions');
  }

  /**
   * Generates text using the Writer API or Prompt API fallback
   * @param prompt - The generation prompt
   * @param options - Generation options
   * @returns Promise resolving to generated text
   */
  static async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    this.ensureUserActivation();

    const availability = await this.checkAvailability();

    // Use mock provider if all APIs unavailable
    if (availability.writerAPI === 'unavailable' && availability.promptAPI === 'unavailable') {
      return MockAIProvider.generate(prompt, options);
    }

    // Build prompt with context if provided
    let fullPrompt = prompt;
    if (options.context) {
      // Format context to help AI understand surrounding text
      fullPrompt = `Surrounding text context:\n${options.context}\n\nUser request: ${prompt}\n\nGenerate text that fits naturally with the surrounding context.`;
    }

    // Add critical instructions
    fullPrompt += `\n\nCRITICAL INSTRUCTIONS:
- Output ONLY the generated text itself
- Do NOT include any meta-commentary, explanations, or acknowledgments
- Do NOT say things like "Here's the text:" or "I will generate..."
- Start directly with the requested content`;

    // Add word count target if specified
    if (options.lengthHint) {
      fullPrompt += `\n- Generate approximately ${options.lengthHint} words`;
    } else if (options.length === 'long') {
      fullPrompt += `\n- Generate a comprehensive, detailed response`;
    }

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
        });

        const result = await Promise.race([
          writer.write(fullPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
          ),
        ]);

        return result;
      } catch (error) {
        console.warn('[AI] Writer API failed, falling back to Prompt API:', error);
      }
    }

    // Fallback to Prompt API
    const promptWithContext = sharedContext
      ? `${sharedContext}\n\n${fullPrompt}`
      : fullPrompt;
    
    return this.prompt(promptWithContext);
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

  /**
   * Mock generate implementation
   * @param prompt - Generation prompt
   * @param options - Generation options
   * @returns Mock generated text
   */
  static generate(prompt: string, options: GenerateOptions): string {
    console.warn('[AI] Using mock provider - AI features require Chrome 128+ with Gemini Nano enabled');

    // Generate simple, prompt-relevant response
    const promptLower = prompt.toLowerCase();
    let mockText = '';

    // Provide minimal, relevant responses based on prompt keywords
    if (promptLower.includes('song') || promptLower.includes('lyrics')) {
      mockText = 'Verse 1:\nUnder the stars we dance tonight\nHearts beating in the pale moonlight\n\nChorus:\nThis is our moment, this is our time\nTogether we shine, together we climb';
    } else if (promptLower.includes('story') || promptLower.includes('tale')) {
      mockText = 'Once upon a time, in a land far away, there lived a curious traveler who sought adventure beyond the horizon. Each day brought new discoveries and unexpected friendships.';
    } else if (promptLower.includes('poem') || promptLower.includes('verse')) {
      mockText = 'Whispers of wind through autumn trees,\nGolden leaves dance in the breeze,\nNature\'s beauty, wild and free,\nA moment of peace for you and me.';
    } else if (promptLower.includes('email') || promptLower.includes('letter')) {
      mockText = 'Dear [Recipient],\n\nI hope this message finds you well. I wanted to reach out regarding our recent conversation and share some thoughts on the next steps.\n\nBest regards';
    } else if (promptLower.includes('list') || promptLower.includes('ideas')) {
      mockText = '1. Start with a clear goal\n2. Break it into smaller steps\n3. Set realistic timelines\n4. Track your progress\n5. Celebrate small wins';
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
      mockText += '\n\nThis extended section provides additional detail and context. With longer content, you can explore topics more thoroughly and include supporting information that adds depth to the response.';
    }

    return mockText;
  }
}
