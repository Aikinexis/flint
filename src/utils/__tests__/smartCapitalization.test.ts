/**
 * Tests for Smart Capitalization
 */

import { describe, it, expect } from '@jest/globals';
import {
  applySmartCapitalization,
  getSmartSpacing,
  formatGeneratedText,
  analyzeContext,
  formatMidSentenceText,
  formatSentenceStartText,
  fixAICapitalization,
} from '../smartCapitalization';

describe('applySmartCapitalization', () => {
  it('should capitalize after period', () => {
    const result = applySmartCapitalization('hello world', 'This is a sentence.');
    expect(result).toBe('Hello world');
  });

  it('should capitalize after exclamation mark', () => {
    const result = applySmartCapitalization('wow', 'Amazing!');
    expect(result).toBe('Wow');
  });

  it('should capitalize after question mark', () => {
    const result = applySmartCapitalization('yes', 'Really?');
    expect(result).toBe('Yes');
  });

  it('should lowercase mid-sentence', () => {
    const result = applySmartCapitalization('Hello world', 'This is a');
    expect(result).toBe('hello world');
  });

  it('should lowercase after comma', () => {
    const result = applySmartCapitalization('And more', 'First,');
    expect(result).toBe('and more');
  });

  it('should capitalize at start of document', () => {
    const result = applySmartCapitalization('hello world', '');
    expect(result).toBe('Hello world');
  });

  it('should capitalize after whitespace-only text', () => {
    const result = applySmartCapitalization('hello', '   ');
    expect(result).toBe('Hello');
  });
});

describe('getSmartSpacing', () => {
  it('should add space after word', () => {
    expect(getSmartSpacing('Hello')).toBe(' ');
  });

  it('should not add space at start', () => {
    expect(getSmartSpacing('')).toBe('');
  });

  it('should not add space after existing space', () => {
    expect(getSmartSpacing('Hello ')).toBe('');
  });

  it('should not add space after opening paren', () => {
    expect(getSmartSpacing('Hello (')).toBe('');
  });

  it('should not add space after opening bracket', () => {
    expect(getSmartSpacing('List [')).toBe('');
  });

  it('should not add space after quote', () => {
    expect(getSmartSpacing('He said "')).toBe('');
  });

  it('should add space after period', () => {
    expect(getSmartSpacing('End.')).toBe(' ');
  });
});

describe('formatGeneratedText', () => {
  it('should format text after sentence', () => {
    const result = formatGeneratedText('hello world', 'Previous sentence.');
    expect(result).toBe(' Hello world');
  });

  it('should format text mid-sentence', () => {
    const result = formatGeneratedText('Hello world', 'This is');
    expect(result).toBe(' hello world');
  });

  it('should format text at document start', () => {
    const result = formatGeneratedText('hello world', '');
    expect(result).toBe('Hello world');
  });

  it('should not add double space', () => {
    const result = formatGeneratedText('world', 'Hello ');
    expect(result).toBe('world');
  });

  it('should handle text after comma', () => {
    const result = formatGeneratedText('Second part', 'First,');
    expect(result).toBe(' second part');
  });

  it('should handle text after colon', () => {
    const result = formatGeneratedText('Details here', 'Note:');
    expect(result).toBe(' details here');
  });
});

describe('analyzeContext', () => {
  it('should detect start of document', () => {
    const context = analyzeContext('', 'Some text');
    expect(context.isStartOfDocument).toBe(true);
    expect(context.shouldCapitalize).toBe(true);
  });

  it('should detect end of document', () => {
    const context = analyzeContext('Some text', '');
    expect(context.isEndOfDocument).toBe(true);
  });

  it('should detect start of sentence', () => {
    const context = analyzeContext('Previous sentence.', 'Next text');
    expect(context.isStartOfSentence).toBe(true);
    expect(context.shouldCapitalize).toBe(true);
  });

  it('should detect mid-sentence', () => {
    const context = analyzeContext('This is a', ' continuation');
    expect(context.isMidSentence).toBe(true);
    expect(context.shouldCapitalize).toBe(false);
  });

  it('should detect space needs', () => {
    const context = analyzeContext('Hello', 'world');
    expect(context.needsSpaceBefore).toBe(true);
  });
});

describe('formatMidSentenceText', () => {
  it('should lowercase and add space', () => {
    const result = formatMidSentenceText('Hello World');
    expect(result).toBe(' hello World');
  });

  it('should keep existing space', () => {
    const result = formatMidSentenceText(' hello world');
    expect(result).toBe(' hello world');
  });
});

describe('formatSentenceStartText', () => {
  it('should capitalize and add space', () => {
    const result = formatSentenceStartText('hello world');
    expect(result).toBe(' Hello world');
  });

  it('should keep existing space', () => {
    const result = formatSentenceStartText(' Hello world');
    expect(result).toBe(' Hello world');
  });
});

describe('fixAICapitalization', () => {
  it('should force lowercase after comma (mid-sentence)', () => {
    const text = 'He dug furiously. Second sentence.';
    const result = fixAICapitalization(text, 'He barked happily,');
    expect(result).toBe('he dug furiously. Second sentence.');
  });

  it('should force lowercase after colon (mid-sentence)', () => {
    const text = 'Details here. More info.';
    const result = fixAICapitalization(text, 'Note:');
    expect(result).toBe('details here. More info.');
  });

  it('should capitalize after period (new sentence)', () => {
    const text = 'first sentence. second sentence.';
    const result = fixAICapitalization(text, 'Previous text.');
    expect(result).toBe('First sentence. Second sentence.');
  });

  it('should capitalize after exclamation', () => {
    const text = 'wow! that was amazing!';
    const result = fixAICapitalization(text, 'Previous!');
    expect(result).toBe('Wow! That was amazing!');
  });

  it('should capitalize after question mark', () => {
    const text = 'really? yes it is.';
    const result = fixAICapitalization(text, 'Previous?');
    expect(result).toBe('Really? Yes it is.');
  });

  it('should capitalize at document start', () => {
    const text = 'first. second. third.';
    const result = fixAICapitalization(text, '');
    expect(result).toBe('First. Second. Third.');
  });

  it('should fix AI capitalization errors mid-sentence', () => {
    const text = 'He Dug Furiously. Another Sentence.';
    const result = fixAICapitalization(text, 'He barked,');
    expect(result).toBe('he Dug Furiously. Another Sentence.');
  });

  it('should lowercase single word after comma', () => {
    const text = 'Continuation';
    const result = fixAICapitalization(text, 'Start,');
    expect(result).toBe('continuation');
  });
});

describe('Real-world scenarios', () => {
  it('should handle email continuation', () => {
    const before = 'Dear John,';
    const generated = 'I hope this email finds you well';
    const result = formatGeneratedText(generated, before);
    expect(result).toBe(' i hope this email finds you well');
  });

  it('should handle new paragraph', () => {
    const before = 'First paragraph.';
    const generated = 'second paragraph starts here';
    const result = formatGeneratedText(generated, before);
    expect(result).toBe(' Second paragraph starts here');
  });

  it('should handle list item', () => {
    const before = '1. First item\n2.';
    const generated = 'second item';
    const result = formatGeneratedText(generated, before);
    expect(result).toBe(' second item');
  });

  it('should handle parenthetical insertion', () => {
    const before = 'This is important (';
    const generated = 'very important';
    const result = formatGeneratedText(generated, before);
    expect(result).toBe('very important');
  });

  it('should handle quote insertion', () => {
    const before = 'He said "';
    const generated = 'hello there';
    const result = formatGeneratedText(generated, before);
    expect(result).toBe('hello there');
  });
});
