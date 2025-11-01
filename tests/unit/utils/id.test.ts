/**
 * Tests for ID generation utilities
 */

import { describe, it, expect } from '@jest/globals';
import { generateId, generateShortId, generatePrefixedId } from './id';

describe('id utilities', () => {
  describe('generateId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs with correct length', () => {
      const id = generateId();
      expect(id).toHaveLength(36); // UUID format with hyphens
    });
  });

  describe('generateShortId', () => {
    it('should generate an 8-character ID', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
    });

    it('should generate unique short IDs', () => {
      const id1 = generateShortId();
      const id2 = generateShortId();
      const id3 = generateShortId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate IDs with only hexadecimal characters', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[0-9a-f]{8}$/i);
    });

    it('should be the first segment of a UUID', () => {
      // Mock crypto.randomUUID to return a known value
      const originalRandomUUID = crypto.randomUUID;
      const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
      crypto.randomUUID = () => mockUUID;

      const shortId = generateShortId();
      expect(shortId).toBe('550e8400');

      // Restore original function
      crypto.randomUUID = originalRandomUUID;
    });
  });

  describe('generatePrefixedId', () => {
    it('should generate ID with given prefix', () => {
      const id = generatePrefixedId('note');
      expect(id).toMatch(
        /^note-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique prefixed IDs', () => {
      const id1 = generatePrefixedId('test');
      const id2 = generatePrefixedId('test');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-/);
      expect(id2).toMatch(/^test-/);
    });

    it('should work with different prefixes', () => {
      const noteId = generatePrefixedId('note');
      const historyId = generatePrefixedId('history');
      const settingId = generatePrefixedId('setting');

      expect(noteId).toMatch(/^note-/);
      expect(historyId).toMatch(/^history-/);
      expect(settingId).toMatch(/^setting-/);
    });

    it('should work with empty prefix', () => {
      const id = generatePrefixedId('');
      expect(id).toMatch(/^-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should work with numeric prefix', () => {
      const id = generatePrefixedId('123');
      expect(id).toMatch(/^123-/);
    });

    it('should work with special characters in prefix', () => {
      const id = generatePrefixedId('test_item');
      expect(id).toMatch(/^test_item-/);
    });

    it('should have correct total length', () => {
      const prefix = 'note';
      const id = generatePrefixedId(prefix);
      // prefix + '-' + UUID (36 chars)
      expect(id).toHaveLength(prefix.length + 1 + 36);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive calls', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(generateId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });

    it('should handle rapid successive short ID calls', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(generateShortId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });

    it('should handle rapid successive prefixed ID calls', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(generatePrefixedId('test'));
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });
  });
});
