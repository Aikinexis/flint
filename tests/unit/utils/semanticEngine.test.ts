/**
 * Tests for Semantic Awareness Engine
 * Covers LocalEmbedder, SemanticMemoryManager, and utility functions
 */

import {
  LocalEmbedder,
  cosineSimilarity,
  jaccardSimilarity,
  SemanticMemoryManager,
  createSemanticFilter,
  type SemanticMemoryItem,
  type ScoredMemoryItem,
} from '../../../src/utils/semanticEngine';

describe('LocalEmbedder', () => {
  let embedder: LocalEmbedder;

  beforeEach(() => {
    embedder = new LocalEmbedder();
  });

  describe('train', () => {
    it('should build vocabulary from documents', () => {
      const docs = ['hello world', 'world peace', 'hello peace'];
      embedder.train(docs);
      expect(embedder.getVocabularySize()).toBeGreaterThan(0);
    });

    it('should handle empty documents', () => {
      embedder.train([]);
      expect(embedder.getVocabularySize()).toBe(0);
    });

    it('should filter out short words', () => {
      const docs = ['a b cd efg hijk'];
      embedder.train(docs);
      // Only 'efg' and 'hijk' should be included (length > 2)
      expect(embedder.getVocabularySize()).toBe(2);
    });

    it('should handle documents with punctuation', () => {
      const docs = ['Hello, world!', 'World: peace.'];
      embedder.train(docs);
      expect(embedder.getVocabularySize()).toBeGreaterThan(0);
    });
  });

  describe('embed', () => {
    beforeEach(() => {
      embedder.train(['hello world', 'world peace', 'hello peace']);
    });

    it('should generate normalized vectors', () => {
      const vector = embedder.embed('hello world');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(embedder.getVocabularySize());

      // Check normalization (magnitude should be ~1)
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('should return zero vector for empty text', () => {
      const vector = embedder.embed('');
      expect(vector.every((v) => v === 0)).toBe(true);
    });

    it('should return zero vector for unknown words', () => {
      const vector = embedder.embed('xyz abc');
      expect(vector.every((v) => v === 0)).toBe(true);
    });

    it('should handle text with only short words', () => {
      const vector = embedder.embed('a b c');
      expect(vector.every((v) => v === 0)).toBe(true);
    });

    it('should generate different vectors for different texts', () => {
      const vector1 = embedder.embed('hello world');
      const vector2 = embedder.embed('world peace');
      expect(vector1).not.toEqual(vector2);
    });
  });

  describe('getVocabularySize', () => {
    it('should return 0 for untrained embedder', () => {
      expect(embedder.getVocabularySize()).toBe(0);
    });

    it('should return correct size after training', () => {
      embedder.train(['hello world', 'world peace']);
      expect(embedder.getVocabularySize()).toBe(3); // hello, world, peace
    });
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
  });

  it('should return value between 0 and 1 for similar vectors', () => {
    const v1 = [1, 2, 3];
    const v2 = [2, 3, 4];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should handle zero vectors', () => {
    const v1 = [0, 0, 0];
    const v2 = [1, 2, 3];
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  it('should throw error for vectors of different lengths', () => {
    const v1 = [1, 2, 3];
    const v2 = [1, 2];
    expect(() => cosineSimilarity(v1, v2)).toThrow('Vectors must have the same length');
  });

  it('should be commutative', () => {
    const v1 = [1, 2, 3];
    const v2 = [4, 5, 6];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(cosineSimilarity(v2, v1), 5);
  });
});

describe('jaccardSimilarity', () => {
  it('should return 1 for identical texts', () => {
    const text = 'hello world peace';
    expect(jaccardSimilarity(text, text)).toBe(1);
  });

  it('should return 0 for completely different texts', () => {
    const text1 = 'hello world';
    const text2 = 'xyz abc';
    expect(jaccardSimilarity(text1, text2)).toBe(0);
  });

  it('should return value between 0 and 1 for partial overlap', () => {
    const text1 = 'hello world peace';
    const text2 = 'hello universe peace';
    const similarity = jaccardSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should be case insensitive', () => {
    const text1 = 'Hello World';
    const text2 = 'hello world';
    expect(jaccardSimilarity(text1, text2)).toBe(1);
  });

  it('should ignore punctuation', () => {
    const text1 = 'Hello, world!';
    const text2 = 'hello world';
    expect(jaccardSimilarity(text1, text2)).toBe(1);
  });

  it('should filter out short words', () => {
    const text1 = 'a b hello world';
    const text2 = 'hello world';
    expect(jaccardSimilarity(text1, text2)).toBe(1);
  });

  it('should handle empty texts', () => {
    expect(jaccardSimilarity('', '')).toBe(0);
    expect(jaccardSimilarity('hello', '')).toBe(0);
    expect(jaccardSimilarity('', 'world')).toBe(0);
  });

  it('should be commutative', () => {
    const text1 = 'hello world peace';
    const text2 = 'world peace love';
    expect(jaccardSimilarity(text1, text2)).toBe(jaccardSimilarity(text2, text1));
  });
});

describe('SemanticMemoryManager', () => {
  let manager: SemanticMemoryManager;

  beforeEach(() => {
    manager = new SemanticMemoryManager();
  });

  describe('addMemory', () => {
    it('should add a memory with embedding', () => {
      const memory = manager.addMemory('1', 'hello world');
      expect(memory.id).toBe('1');
      expect(memory.text).toBe('hello world');
      expect(Array.isArray(memory.embedding)).toBe(true);
    });

    it('should add memory with metadata', () => {
      const metadata = { timestamp: Date.now(), source: 'test' };
      const memory = manager.addMemory('1', 'hello world', metadata);
      expect(memory.metadata).toEqual(metadata);
    });

    it('should overwrite existing memory with same ID', () => {
      manager.addMemory('1', 'hello world');
      const memory = manager.addMemory('1', 'goodbye world');
      expect(memory.text).toBe('goodbye world');
      expect(manager.getAllMemories().length).toBe(1);
    });
  });

  describe('removeMemory', () => {
    it('should remove existing memory', () => {
      manager.addMemory('1', 'hello world');
      expect(manager.removeMemory('1')).toBe(true);
      expect(manager.getMemory('1')).toBeUndefined();
    });

    it('should return false for non-existent memory', () => {
      expect(manager.removeMemory('999')).toBe(false);
    });
  });

  describe('getMemory', () => {
    it('should retrieve existing memory', () => {
      manager.addMemory('1', 'hello world');
      const memory = manager.getMemory('1');
      expect(memory?.text).toBe('hello world');
    });

    it('should return undefined for non-existent memory', () => {
      expect(manager.getMemory('999')).toBeUndefined();
    });
  });

  describe('getAllMemories', () => {
    it('should return empty array for no memories', () => {
      expect(manager.getAllMemories()).toEqual([]);
    });

    it('should return all memories', () => {
      manager.addMemory('1', 'hello world');
      manager.addMemory('2', 'goodbye world');
      expect(manager.getAllMemories().length).toBe(2);
    });
  });

  describe('clearMemories', () => {
    it('should remove all memories', () => {
      manager.addMemory('1', 'hello world');
      manager.addMemory('2', 'goodbye world');
      manager.clearMemories();
      expect(manager.getAllMemories().length).toBe(0);
    });
  });

  describe('train', () => {
    it('should train embedder on existing memories', () => {
      manager.addMemory('1', 'hello world');
      manager.addMemory('2', 'world peace');
      manager.train();
      const stats = manager.getStats();
      expect(stats.vocabularySize).toBeGreaterThan(0);
    });

    it('should handle training with no memories', () => {
      expect(() => manager.train()).not.toThrow();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      manager.addMemory('1', 'artificial intelligence machine learning');
      manager.addMemory('2', 'deep learning neural networks');
      manager.addMemory('3', 'cooking recipes food');
      manager.train();
    });

    it('should find semantically similar memories', () => {
      const results = manager.search('machine learning AI');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe('1'); // Most similar
    });

    it('should respect topK parameter', () => {
      const results = manager.search('learning', { topK: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter by minimum semantic score', () => {
      const results = manager.search('cooking', { minSemanticScore: 0.5 });
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should apply Jaccard filter when enabled', () => {
      // Add a near-duplicate
      manager.addMemory('4', 'artificial intelligence machine learning');
      manager.train();

      const results = manager.search('artificial intelligence machine learning', {
        enableJaccardFilter: true,
        maxJaccardScore: 0.8,
      });

      // Should filter out the near-duplicate
      results.forEach((result) => {
        if (result.jaccardScore !== undefined) {
          expect(result.jaccardScore).toBeLessThanOrEqual(0.8);
        }
      });
    });

    it('should disable Jaccard filter when requested', () => {
      const results = manager.search('learning', { enableJaccardFilter: false });
      results.forEach((result) => {
        expect(result.jaccardScore).toBeUndefined();
      });
    });

    it('should return empty array for no matches', () => {
      const results = manager.search('xyz abc', { minSemanticScore: 0.9 });
      expect(results).toEqual([]);
    });

    it('should sort results by score descending', () => {
      const results = manager.search('learning');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });
  });

  describe('findSimilar', () => {
    beforeEach(() => {
      manager.addMemory('1', 'artificial intelligence machine learning');
      manager.addMemory('2', 'deep learning neural networks');
      manager.addMemory('3', 'machine learning algorithms');
      manager.train();
    });

    it('should find similar memories to a given memory', () => {
      const results = manager.findSimilar('1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.id !== '1')).toBe(true); // Exclude self
    });

    it('should return empty array for non-existent memory', () => {
      const results = manager.findSimilar('999');
      expect(results).toEqual([]);
    });

    it('should respect topK parameter', () => {
      const results = manager.findSimilar('1', { topK: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter by minimum semantic score', () => {
      const results = manager.findSimilar('1', { minSemanticScore: 0.5 });
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should include Jaccard scores', () => {
      const results = manager.findSimilar('1');
      results.forEach((result) => {
        expect(result.jaccardScore).toBeDefined();
      });
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.addMemory('1', 'hello world');
      manager.addMemory('2', 'goodbye world');
      manager.train();

      const stats = manager.getStats();
      expect(stats.totalMemories).toBe(2);
      expect(stats.vocabularySize).toBeGreaterThan(0);
    });

    it('should return zero stats for empty manager', () => {
      const stats = manager.getStats();
      expect(stats.totalMemories).toBe(0);
      expect(stats.vocabularySize).toBe(0);
    });
  });

  describe('export and import', () => {
    it('should export all memories', () => {
      manager.addMemory('1', 'hello world');
      manager.addMemory('2', 'goodbye world');

      const exported = manager.export();
      expect(exported.length).toBe(2);
      expect(exported[0]?.id).toBeDefined();
      expect(exported[0]?.text).toBeDefined();
      expect(exported[0]?.embedding).toBeDefined();
    });

    it('should import memories', () => {
      const memories: SemanticMemoryItem[] = [
        { id: '1', text: 'hello world', embedding: [1, 2, 3] },
        { id: '2', text: 'goodbye world', embedding: [4, 5, 6] },
      ];

      manager.import(memories);
      expect(manager.getAllMemories().length).toBe(2);
      expect(manager.getMemory('1')?.text).toBe('hello world');
    });

    it('should clear existing memories on import', () => {
      manager.addMemory('1', 'hello world');
      manager.import([{ id: '2', text: 'goodbye world', embedding: [1, 2, 3] }]);

      expect(manager.getAllMemories().length).toBe(1);
      expect(manager.getMemory('1')).toBeUndefined();
      expect(manager.getMemory('2')).toBeDefined();
    });

    it('should preserve metadata on export/import', () => {
      const metadata = { timestamp: Date.now(), source: 'test' };
      manager.addMemory('1', 'hello world', metadata);

      const exported = manager.export();
      manager.clearMemories();
      manager.import(exported);

      const memory = manager.getMemory('1');
      expect(memory?.metadata).toEqual(metadata);
    });
  });
});

describe('createSemanticFilter', () => {
  it('should filter and rank documents', () => {
    const documents = [
      { id: '1', text: 'artificial intelligence machine learning' },
      { id: '2', text: 'deep learning neural networks' },
      { id: '3', text: 'cooking recipes food' },
    ];

    const results = createSemanticFilter(documents, 'machine learning AI');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.id).toBe('1'); // Most relevant
  });

  it('should handle empty documents', () => {
    const results = createSemanticFilter([], 'query');
    expect(results).toEqual([]);
  });

  it('should respect search options', () => {
    const documents = [
      { id: '1', text: 'artificial intelligence' },
      { id: '2', text: 'machine learning' },
      { id: '3', text: 'deep learning' },
    ];

    const results = createSemanticFilter(documents, 'AI', { topK: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('should include metadata in results', () => {
    const documents = [
      { id: '1', text: 'hello world', metadata: { source: 'test' } },
    ];

    const results = createSemanticFilter(documents, 'hello');
    expect(results[0]?.metadata?.source).toBe('test');
  });

  it('should apply Jaccard filtering', () => {
    const documents = [
      { id: '1', text: 'artificial intelligence machine learning' },
      { id: '2', text: 'artificial intelligence machine learning' }, // Duplicate
    ];

    const results = createSemanticFilter(
      documents,
      'artificial intelligence machine learning',
      { enableJaccardFilter: true, maxJaccardScore: 0.8 }
    );

    // Should filter out the duplicate
    expect(results.length).toBeLessThan(2);
  });
});
