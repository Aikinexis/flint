/**
 * Tests for Semantic Engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LocalEmbedder,
  cosineSimilarity,
  jaccardSimilarity,
  SemanticMemoryManager,
  createSemanticFilter,
} from '../semanticEngine';

describe('LocalEmbedder', () => {
  let embedder: LocalEmbedder;

  beforeEach(() => {
    embedder = new LocalEmbedder();
  });

  it('should train on a corpus of documents', () => {
    const documents = [
      'The quick brown fox jumps over the lazy dog',
      'A fast brown fox leaps over a sleepy dog',
      'Machine learning is a subset of artificial intelligence',
    ];

    embedder.train(documents);
    expect(embedder.getVocabularySize()).toBeGreaterThan(0);
  });

  it('should generate embeddings for text', () => {
    const documents = ['hello world', 'goodbye world', 'hello universe'];
    embedder.train(documents);

    const embedding = embedder.embed('hello world');
    expect(embedding).toBeInstanceOf(Array);
    expect(embedding.length).toBe(embedder.getVocabularySize());
  });

  it('should generate normalized embeddings', () => {
    const documents = ['test document one', 'test document two'];
    embedder.train(documents);

    const embedding = embedder.embed('test document');
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5); // Should be unit vector
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.0, 5);
  });

  it('should return high similarity for similar vectors', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1.1, 2.1, 2.9];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeGreaterThan(0.9);
  });

  it('should throw error for vectors of different lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

describe('jaccardSimilarity', () => {
  it('should return 1 for identical texts', () => {
    const text = 'the quick brown fox';
    expect(jaccardSimilarity(text, text)).toBe(1.0);
  });

  it('should return 0 for completely different texts', () => {
    const text1 = 'apple banana cherry';
    const text2 = 'dog elephant frog';
    expect(jaccardSimilarity(text1, text2)).toBe(0.0);
  });

  it('should return partial similarity for overlapping texts', () => {
    const text1 = 'the quick brown fox';
    const text2 = 'the lazy brown dog';
    const similarity = jaccardSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should be case-insensitive', () => {
    const text1 = 'Hello World';
    const text2 = 'hello world';
    expect(jaccardSimilarity(text1, text2)).toBe(1.0);
  });
});

describe('SemanticMemoryManager', () => {
  let manager: SemanticMemoryManager;

  beforeEach(() => {
    manager = new SemanticMemoryManager();
  });

  it('should add memories', () => {
    manager.addMemory('1', 'Machine learning is fascinating');
    manager.addMemory('2', 'Artificial intelligence is the future');

    expect(manager.getAllMemories()).toHaveLength(2);
  });

  it('should remove memories', () => {
    manager.addMemory('1', 'Test memory');
    expect(manager.removeMemory('1')).toBe(true);
    expect(manager.getAllMemories()).toHaveLength(0);
  });

  it('should search for semantically similar memories', () => {
    // Add memories
    manager.addMemory('1', 'Machine learning algorithms are powerful');
    manager.addMemory('2', 'Deep learning is a subset of machine learning');
    manager.addMemory('3', 'The weather is nice today');
    manager.addMemory('4', 'I love pizza and pasta');

    // Train the embedder
    manager.train();

    // Search for AI-related content
    const results = manager.search('artificial intelligence and neural networks', {
      topK: 2,
      minSemanticScore: 0.0,
    });

    expect(results).toHaveLength(2);
    // Should return ML-related memories, not weather or food
    expect(results[0]!.id).toMatch(/^[12]$/);
    expect(results[1]!.id).toMatch(/^[12]$/);
  });

  it('should filter duplicates with Jaccard filter', () => {
    manager.addMemory('1', 'The quick brown fox jumps over the lazy dog');
    manager.addMemory('2', 'The quick brown fox jumps over the lazy dog'); // Exact duplicate
    manager.addMemory('3', 'A completely different sentence about cats');

    manager.train();

    const results = manager.search('The quick brown fox', {
      topK: 10,
      enableJaccardFilter: true,
      maxJaccardScore: 0.8, // Filter out near-duplicates
    });

    // Should filter out one of the duplicates
    expect(results.length).toBeLessThan(3);
  });

  it('should find similar memories', () => {
    manager.addMemory('1', 'Machine learning is amazing');
    manager.addMemory('2', 'Deep learning is powerful');
    manager.addMemory('3', 'I like ice cream');

    manager.train();

    const similar = manager.findSimilar('1', { topK: 2, minSemanticScore: 0.0 });

    // Should find memory 2 as most similar (both about ML/DL)
    expect(similar[0]!.id).toBe('2');
  });

  it('should export and import memories', () => {
    manager.addMemory('1', 'Test memory one');
    manager.addMemory('2', 'Test memory two');

    const exported = manager.export();
    expect(exported).toHaveLength(2);

    const newManager = new SemanticMemoryManager();
    newManager.import(exported);

    expect(newManager.getAllMemories()).toHaveLength(2);
  });

  it('should provide statistics', () => {
    manager.addMemory('1', 'Test memory');
    manager.train();

    const stats = manager.getStats();
    expect(stats.totalMemories).toBe(1);
    expect(stats.vocabularySize).toBeGreaterThan(0);
  });
});

describe('createSemanticFilter', () => {
  it('should filter and rank documents by relevance', () => {
    const documents = [
      { id: '1', text: 'Machine learning algorithms for data analysis' },
      { id: '2', text: 'Deep neural networks and artificial intelligence' },
      { id: '3', text: 'Cooking recipes for Italian pasta' },
      { id: '4', text: 'Weather forecast for tomorrow' },
    ];

    const results = createSemanticFilter(documents, 'AI and machine learning research', {
      topK: 2,
      minSemanticScore: 0.0,
    });

    expect(results).toHaveLength(2);
    // Should return AI/ML related documents
    expect(results[0]!.id).toMatch(/^[12]$/);
    expect(results[1]!.id).toMatch(/^[12]$/);
  });

  it('should include metadata in results', () => {
    const documents = [
      { id: '1', text: 'Test document', metadata: { source: 'test', priority: 1 } },
    ];

    const results = createSemanticFilter(documents, 'test', { topK: 1 });

    expect(results[0]!.metadata).toEqual({ source: 'test', priority: 1 });
  });

  it('should apply Jaccard filtering', () => {
    const documents = [
      { id: '1', text: 'The quick brown fox jumps over the lazy dog' },
      { id: '2', text: 'The quick brown fox jumps over the lazy dog' }, // Duplicate
      { id: '3', text: 'A different sentence entirely' },
    ];

    const results = createSemanticFilter(documents, 'quick brown fox', {
      topK: 10,
      enableJaccardFilter: true,
      maxJaccardScore: 0.8,
    });

    // Should filter out duplicate
    expect(results.length).toBeLessThan(3);
  });
});
