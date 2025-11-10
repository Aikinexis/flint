/**
 * Tests for Text After Insertion Fixer
 */

import { describe, it, expect } from '@jest/globals';
import { fixTextAfterInsertion } from '../textAfterInsertion';

describe('fixTextAfterInsertion', () => {
  it('should capitalize after text ending with period', () => {
    const afterText = 'it arrived at the destination.';
    const insertedText = 'The journey was long.';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('It arrived at the destination.');
  });

  it('should capitalize after text ending with exclamation', () => {
    const afterText = 'what a day!';
    const insertedText = 'Amazing!';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('What a day!');
  });

  it('should capitalize after text ending with question mark', () => {
    const afterText = 'yes, it is.';
    const insertedText = 'Really?';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('Yes, it is.');
  });

  it('should lowercase after text ending with comma', () => {
    const afterText = 'It continued on.';
    const insertedText = 'The bird flew,';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('it continued on.');
  });

  it('should lowercase after text with no punctuation', () => {
    const afterText = 'More text here';
    const insertedText = 'Some text';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('more text here');
  });

  it('should handle empty after text', () => {
    const afterText = '';
    const insertedText = 'Some text.';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('');
  });

  it('should handle whitespace-only after text', () => {
    const afterText = '   ';
    const insertedText = 'Some text.';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('   ');
  });

  it('should preserve already correct capitalization', () => {
    const afterText = 'It was correct.';
    const insertedText = 'Previous sentence.';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe('It was correct.');
  });

  it('should handle text starting with whitespace', () => {
    const afterText = ' it arrived.';
    const insertedText = 'The journey ended.';
    const result = fixTextAfterInsertion(afterText, insertedText);
    expect(result).toBe(' It arrived.');
  });
});
