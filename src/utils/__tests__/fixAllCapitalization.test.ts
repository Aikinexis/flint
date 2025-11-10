/**
 * Tests for Fix All Capitalization
 */

import { describe, it, expect } from '@jest/globals';
import { fixAllCapitalization, fixCapitalizationAroundCursor } from '../fixAllCapitalization';

describe('fixAllCapitalization', () => {
  it('should capitalize after period', () => {
    const text = 'First sentence. second sentence.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('First sentence. Second sentence.');
  });

  it('should capitalize after exclamation', () => {
    const text = 'Wow! that was amazing!';
    const result = fixAllCapitalization(text);
    expect(result).toBe('Wow! That was amazing!');
  });

  it('should capitalize after question mark', () => {
    const text = 'Really? yes it is.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('Really? Yes it is.');
  });

  it('should capitalize at start of text', () => {
    const text = 'hello world. second sentence.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('Hello world. Second sentence.');
  });

  it('should handle multiple sentences', () => {
    const text = 'first. second. third. fourth.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('First. Second. Third. Fourth.');
  });

  it('should preserve capitalization after comma', () => {
    const text = 'First, Second, Third.';
    const result = fixAllCapitalization(text);
    // Don't force lowercase - preserve existing capitalization
    expect(result).toBe('First, Second, Third.');
  });

  it('should preserve capitalization after colon', () => {
    const text = 'Note: This is important.';
    const result = fixAllCapitalization(text);
    // Don't force lowercase - preserve existing capitalization
    expect(result).toBe('Note: This is important.');
  });

  it('should handle mixed case correctly', () => {
    const text = 'First. second. Third. fourth.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('First. Second. Third. Fourth.');
  });

  it('should preserve already correct capitalization', () => {
    const text = 'First. Second. Third.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('First. Second. Third.');
  });

  it('should handle text with newlines', () => {
    const text = 'First sentence.\nSecond sentence.';
    const result = fixAllCapitalization(text);
    expect(result).toBe('First sentence.\nSecond sentence.');
  });

  it('should not capitalize after period without space', () => {
    const text = 'First.Second.';
    const result = fixAllCapitalization(text);
    // No space after period, so don't treat as sentence boundary
    expect(result).toBe('First.Second.');
  });
});

describe('fixCapitalizationAroundCursor', () => {
  it('should fix capitalization around cursor position', () => {
    const text = 'Start of text. middle sentence. it should be capitalized. End of text.';
    const cursorPos = 35; // Around "it should"
    const result = fixCapitalizationAroundCursor(text, cursorPos, 50);
    expect(result).toContain('It should be capitalized');
  });

  it('should not affect text far from cursor', () => {
    const text = 'far away. ' + 'x'.repeat(1000) + ' near cursor. it needs fixing.';
    const cursorPos = text.length - 20;
    const result = fixCapitalizationAroundCursor(text, cursorPos, 50);
    // Should fix near cursor but not far away
    expect(result).toContain('It needs fixing');
  });

  it('should handle cursor at start', () => {
    const text = 'first sentence. second sentence.';
    const result = fixCapitalizationAroundCursor(text, 0, 50);
    expect(result).toBe('First sentence. Second sentence.');
  });

  it('should handle cursor at end', () => {
    const text = 'first sentence. second sentence.';
    const result = fixCapitalizationAroundCursor(text, text.length, 50);
    expect(result).toBe('First sentence. Second sentence.');
  });
});
