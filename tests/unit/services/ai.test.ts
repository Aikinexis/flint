/**
 * AI Service Tests - Fallback Scenarios
 * Tests the priority fallback chain for rewrite operations:
 * Rewriter API → Writer API → Prompt API → Mock Provider
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIService } from '../../../src/services/ai';

// Mock global AI APIs
const mockSelf = global.self as any;

describe('AIService - Fallback Scenarios', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock user activation
    Object.defineProperty(navigator, 'userActivation', {
      value: { isActive: true },
      writable: true,
      configurable: true,
    });

    // Clear availability cache
    AIService.clearCache();
  });

  describe('Summarizer API Fallback', () => {
    it('should use mock provider when Summarizer API is unavailable', async () => {
      // Mock Summarizer as unavailable
      mockSelf.Summarizer = undefined;

      const result = await AIService.summarize('Test text to summarize', {
        mode: 'bullets',
        readingLevel: 'moderate',
      });

      // Should return mock summary
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      console.log('[Test] Mock summary returned:', result);
    });

    it('should use Summarizer API when available', async () => {
      // Mock Summarizer as available
      const mockSummarize = jest.fn().mockResolvedValue('Summarized text');
      mockSelf.Summarizer = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockResolvedValue({
          summarize: mockSummarize,
        }),
      };

      const result = await AIService.summarize('Test text to summarize', {
        mode: 'bullets',
        readingLevel: 'moderate',
      });

      expect(mockSelf.Summarizer.create).toHaveBeenCalled();
      expect(mockSummarize).toHaveBeenCalledWith('Test text to summarize');
      expect(result).toBe('Summarized text');
    });
  });

  describe('Rewriter API Priority Fallback Chain', () => {
    it('should use Rewriter API for preset tones (Priority 1)', async () => {
      // Mock Rewriter as available
      const mockRewrite = jest.fn().mockResolvedValue('Rewritten with Rewriter API');
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockResolvedValue({
          rewrite: mockRewrite,
        }),
      };

      // Mock Writer and Prompt as available (should not be used)
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
      };
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
        },
      };

      const result = await AIService.rewrite('Test text', {
        tone: 'more-formal',
      });

      expect(mockSelf.Rewriter.create).toHaveBeenCalled();
      expect(mockRewrite).toHaveBeenCalledWith('Test text');
      expect(result).toBe('Rewritten with Rewriter API');
      console.log('[Test] ✓ Rewriter API used (Priority 1)');
    });

    it('should fall back to Writer API for custom prompts (Priority 2)', async () => {
      // Mock Rewriter as unavailable
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };

      // Mock Writer as available
      const mockWrite = jest.fn().mockResolvedValue('Rewritten with Writer API');
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockResolvedValue({
          write: mockWrite,
        }),
      };

      // Mock Prompt as available (should not be used)
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
        },
      };

      const result = await AIService.rewrite('Test text', {
        customPrompt: 'Make it more concise',
      });

      expect(mockSelf.Writer.create).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      expect(result).toBe('Rewritten with Writer API');
      console.log('[Test] ✓ Writer API used for custom prompt (Priority 2)');
    });

    it('should fall back to Prompt API when Rewriter and Writer unavailable (Priority 3)', async () => {
      // Mock Rewriter as unavailable
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };

      // Mock Writer as unavailable
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };

      // Mock Prompt API as available
      const mockPrompt = jest.fn().mockResolvedValue('Rewritten with Prompt API');
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
          createTextSession: jest.fn().mockResolvedValue({
            prompt: mockPrompt,
          }),
        },
      };

      const result = await AIService.rewrite('Test text', {
        customPrompt: 'Make it more concise',
      });

      expect((global as any).window.ai.createTextSession).toHaveBeenCalled();
      expect(mockPrompt).toHaveBeenCalled();
      expect(result).toBe('Rewritten with Prompt API');
      console.log('[Test] ✓ Prompt API used as fallback (Priority 3)');
    });

    it('should use mock provider when all APIs unavailable', async () => {
      // Mock all APIs as unavailable
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('no'),
        },
      };

      const result = await AIService.rewrite('Test text to rewrite', {
        customPrompt: 'Make it more concise',
      });

      // Should return mock result
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      console.log('[Test] ✓ Mock provider used when all APIs unavailable');
    });

    it('should handle Rewriter API failure and fall back to Writer API', async () => {
      // Mock Rewriter as available but failing
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockRejectedValue(new Error('Rewriter API failed')),
      };

      // Mock Writer as available
      const mockWrite = jest.fn().mockResolvedValue('Rewritten with Writer API after Rewriter failure');
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockResolvedValue({
          write: mockWrite,
        }),
      };

      const result = await AIService.rewrite('Test text', {
        customPrompt: 'Make it better',
      });

      expect(mockSelf.Rewriter.create).toHaveBeenCalled();
      expect(mockSelf.Writer.create).toHaveBeenCalled();
      expect(result).toBe('Rewritten with Writer API after Rewriter failure');
      console.log('[Test] ✓ Graceful fallback from Rewriter to Writer on error');
    });

    it('should handle Writer API failure and fall back to Prompt API', async () => {
      // Mock Rewriter as unavailable
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('unavailable'),
      };

      // Mock Writer as available but failing
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockRejectedValue(new Error('Writer API failed')),
      };

      // Mock Prompt API as available
      const mockPrompt = jest.fn().mockResolvedValue('Rewritten with Prompt API after Writer failure');
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
          createTextSession: jest.fn().mockResolvedValue({
            prompt: mockPrompt,
          }),
        },
      };

      const result = await AIService.rewrite('Test text', {
        customPrompt: 'Make it better',
      });

      expect(mockSelf.Writer.create).toHaveBeenCalled();
      expect((global as any).window.ai.createTextSession).toHaveBeenCalled();
      expect(result).toBe('Rewritten with Prompt API after Writer failure');
      console.log('[Test] ✓ Graceful fallback from Writer to Prompt on error');
    });
  });

  describe('Error Handling', () => {
    it('should not crash when user activation is missing', async () => {
      // Mock user activation as inactive
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true,
      });

      await expect(
        AIService.rewrite('Test text', { customPrompt: 'Make it better' })
      ).rejects.toThrow('User activation required');
    });

    it('should provide clear error message when all APIs fail', async () => {
      // Mock all APIs as available but failing
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockRejectedValue(new Error('Rewriter failed')),
      };
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
        create: jest.fn().mockRejectedValue(new Error('Writer failed')),
      };
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
          createTextSession: jest.fn().mockRejectedValue(new Error('Prompt API failed')),
        },
      };

      await expect(
        AIService.rewrite('Test text', { customPrompt: 'Make it better' })
      ).rejects.toThrow();
    });
  });

  describe('Availability Caching', () => {
    it('should cache availability results', async () => {
      mockSelf.Summarizer = {
        availability: jest.fn().mockResolvedValue('available'),
      };
      mockSelf.Rewriter = {
        availability: jest.fn().mockResolvedValue('available'),
      };
      mockSelf.Writer = {
        availability: jest.fn().mockResolvedValue('available'),
      };
      (global as any).window = {
        ai: {
          canCreateTextSession: jest.fn().mockResolvedValue('readily'),
        },
      };

      // First call
      await AIService.checkAvailability();
      
      // Second call should use cache
      await AIService.checkAvailability();

      // Availability should only be checked once (cached)
      expect(mockSelf.Summarizer.availability).toHaveBeenCalledTimes(1);
      expect(mockSelf.Rewriter.availability).toHaveBeenCalledTimes(1);
      expect(mockSelf.Writer.availability).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockSelf.Summarizer = {
        availability: jest.fn().mockResolvedValue('available'),
      };

      await AIService.checkAvailability();
      AIService.clearCache();
      await AIService.checkAvailability();

      // Should be called twice (cache cleared)
      expect(mockSelf.Summarizer.availability).toHaveBeenCalledTimes(2);
    });
  });
});
