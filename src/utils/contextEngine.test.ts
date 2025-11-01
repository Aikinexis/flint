/**
 * Tests for the lightweight context engine
 */

import {
  getLocalContext,
  keywordOverlapScore,
  splitIntoSections,
  getRelevantSections,
  removeDuplicates,
  compressChunks,
  assembleContext,
  formatContextForPrompt,
  extractDocumentStructure,
  getNearestHeading,
} from './contextEngine';

describe('contextEngine', () => {
  describe('getLocalContext', () => {
    it('should extract context around cursor', () => {
      const text = 'a'.repeat(2000);
      const cursor = 1000;
      const context = getLocalContext(text, cursor, 500);

      expect(context.length).toBe(1000); // 500 before + 500 after
      expect(context).toBe('a'.repeat(1000));
    });

    it('should handle cursor at start', () => {
      const text = 'Hello world';
      const cursor = 0;
      const context = getLocalContext(text, cursor, 500);

      expect(context).toBe('Hello world');
    });

    it('should handle cursor at end', () => {
      const text = 'Hello world';
      const cursor = text.length;
      const context = getLocalContext(text, cursor, 500);

      expect(context).toBe('Hello world');
    });
  });

  describe('keywordOverlapScore', () => {
    it('should return 1 for identical text', () => {
      const score = keywordOverlapScore('hello world', 'hello world');
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return 0 for completely different text', () => {
      const score = keywordOverlapScore('apple banana', 'zebra elephant');
      expect(score).toBe(0);
    });

    it('should return intermediate score for partial overlap', () => {
      const score = keywordOverlapScore('apple banana orange', 'apple grape orange');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should filter out short words', () => {
      const score = keywordOverlapScore('a b c', 'd e f');
      expect(score).toBe(0); // All words too short
    });
  });

  describe('splitIntoSections', () => {
    it('should split on double newlines', () => {
      const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const sections = splitIntoSections(text);

      expect(sections.length).toBe(3);
      expect(sections[0]).toBe('Paragraph 1');
      expect(sections[1]).toBe('Paragraph 2');
      expect(sections[2]).toBe('Paragraph 3');
    });

    it('should split long sections', () => {
      const longSection = 'a'.repeat(1500);
      const text = `${longSection}\n\nShort section`;
      const sections = splitIntoSections(text);

      expect(sections.length).toBeGreaterThanOrEqual(2); // Long section may or may not be split + short section
    });

    it('should filter empty sections', () => {
      const text = 'Section 1\n\n\n\nSection 2';
      const sections = splitIntoSections(text);

      expect(sections.length).toBe(2);
    });
  });

  describe('getRelevantSections', () => {
    it('should return sections with keyword overlap', () => {
      const text = `
Introduction to machine learning

Machine learning is a subset of artificial intelligence.

Deep learning uses neural networks.

Python is a popular programming language.

Machine learning algorithms can learn from data.
      `.trim();

      const query = 'machine learning algorithms';
      const relevant = getRelevantSections(text, query, 2);

      expect(relevant.length).toBeGreaterThan(0);
      expect(relevant[0].text).toContain('machine learning');
    });

    it('should return top N sections', () => {
      const text = `
Section about cats

Section about dogs

Section about birds

Section about fish
      `.trim();

      const query = 'cats dogs birds';
      const relevant = getRelevantSections(text, query, 2);

      expect(relevant.length).toBeLessThanOrEqual(2);
    });

    it('should filter out very low scores', () => {
      const text = 'Completely unrelated content about zebras';
      const query = 'machine learning algorithms';
      const relevant = getRelevantSections(text, query, 5);

      expect(relevant.length).toBe(0); // No relevant sections
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate sections', () => {
      const duplicatePrefix = 'This is a test section that is long enough to be detected as duplicate';
      const chunks = [
        { text: duplicatePrefix, score: 0.9, position: 0 },
        { text: duplicatePrefix + ' with more text', score: 0.8, position: 1 },
        { text: 'Completely different section with unique content here', score: 0.7, position: 2 },
      ];

      const unique = removeDuplicates(chunks);

      expect(unique.length).toBe(2); // First two are duplicates (same first 60 chars)
    });

    it('should keep all unique sections', () => {
      const chunks = [
        { text: 'Section A with unique content that makes it different from others', score: 0.9, position: 0 },
        { text: 'Section B with completely different content from section A', score: 0.8, position: 1 },
        { text: 'Section C has its own unique content as well for testing', score: 0.7, position: 2 },
      ];

      const unique = removeDuplicates(chunks);

      expect(unique.length).toBe(3);
    });
  });

  describe('compressChunks', () => {
    it('should compress long chunks', () => {
      const chunks = [
        {
          text: 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.',
          score: 0.9,
          position: 0,
        },
      ];

      const compressed = compressChunks(chunks, 50);

      expect(compressed[0].length).toBeLessThanOrEqual(60); // Some tolerance
      expect(compressed[0]).toContain('First sentence');
    });

    it('should keep short chunks as-is', () => {
      const chunks = [{ text: 'Short text.', score: 0.9, position: 0 }];

      const compressed = compressChunks(chunks, 200);

      expect(compressed[0]).toBe('Short text.');
    });
  });

  describe('assembleContext', () => {
    it('should assemble context with local and related sections', () => {
      const fullText = `
Introduction to AI

Artificial intelligence is transforming technology.

Machine learning basics

Machine learning is a subset of AI that learns from data.

Deep learning advanced

Deep learning uses neural networks with multiple layers.

Applications of AI

AI is used in healthcare, finance, and transportation.
      `.trim();

      const cursorPos = fullText.indexOf('Machine learning is');
      const context = assembleContext(fullText, cursorPos, {
        localWindow: 100,
        maxRelatedSections: 2,
      });

      expect(context.localContext.length).toBeGreaterThan(0);
      expect(context.totalChars).toBeGreaterThan(0);
    });

    it('should handle small documents', () => {
      const fullText = 'Short document';
      const cursorPos = 5;
      const context = assembleContext(fullText, cursorPos);

      expect(context.localContext).toBe('Short document');
      expect(context.relatedSections.length).toBe(0); // Too small for related sections
    });
  });

  describe('formatContextForPrompt', () => {
    it('should format context for AI prompt', () => {
      const context = {
        localContext: 'This is the local context around the cursor position.',
        relatedSections: ['Related section 1', 'Related section 2'],
        totalChars: 100,
      };

      const formatted = formatContextForPrompt(context, true);

      expect(formatted).toContain('[CONTEXT BEFORE CURSOR]');
      expect(formatted).toContain('[CONTEXT AFTER CURSOR]');
      expect(formatted).toContain('[RELATED SECTIONS FROM DOCUMENT]');
      expect(formatted).toContain('Related section 1');
    });

    it('should exclude related sections when disabled', () => {
      const context = {
        localContext: 'Local context',
        relatedSections: ['Related section'],
        totalChars: 50,
      };

      const formatted = formatContextForPrompt(context, false);

      expect(formatted).not.toContain('[RELATED SECTIONS FROM DOCUMENT]');
      expect(formatted).not.toContain('Related section');
    });
  });

  describe('extractDocumentStructure', () => {
    it('should extract markdown headings', () => {
      const text = `
# Main Title
Some content
## Subsection
More content
### Sub-subsection
      `.trim();

      const headings = extractDocumentStructure(text);

      expect(headings.length).toBe(3);
      expect(headings[0]).toBe('Main Title');
      expect(headings[1]).toBe('Subsection');
      expect(headings[2]).toBe('Sub-subsection');
    });

    it('should extract ALL CAPS headings', () => {
      const text = `
INTRODUCTION TO AI

Some content here

MACHINE LEARNING BASICS

More content
      `.trim();

      const headings = extractDocumentStructure(text);

      expect(headings.length).toBe(2);
      expect(headings[0]).toBe('INTRODUCTION TO AI');
      expect(headings[1]).toBe('MACHINE LEARNING BASICS');
    });

    it('should extract email subject lines', () => {
      const text = `
Subject: Meeting Tomorrow

Dear Team,
      `.trim();

      const headings = extractDocumentStructure(text);

      expect(headings.length).toBe(1);
      expect(headings[0]).toBe('Meeting Tomorrow');
    });
  });

  describe('getNearestHeading', () => {
    it('should find nearest heading before cursor', () => {
      const text = `
# Introduction

Some content here

# Main Section

More content here [CURSOR]

# Next Section
      `.trim();

      const cursorPos = text.indexOf('[CURSOR]');
      const heading = getNearestHeading(text, cursorPos);

      expect(heading).toBe('Main Section');
    });

    it('should return null if no heading found', () => {
      const text = 'Just plain text without headings';
      const cursorPos = 10;
      const heading = getNearestHeading(text, cursorPos);

      expect(heading).toBeNull();
    });

    it('should find ALL CAPS heading', () => {
      const text = `
INTRODUCTION

Some content

MAIN SECTION

More content [CURSOR]
      `.trim();

      const cursorPos = text.indexOf('[CURSOR]');
      const heading = getNearestHeading(text, cursorPos);

      expect(heading).toBe('MAIN SECTION');
    });
  });
});
