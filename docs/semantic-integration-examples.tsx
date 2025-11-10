/**
 * Semantic Filtering Integration Examples
 * Practical examples showing how to integrate semantic awareness into Flint components
 */

import React, { useState } from 'react';
import { useSemanticFiltering } from '../hooks/useSemanticFiltering';
import { AIServiceWithSemantics } from '../services/aiWithSemantics';

/**
 * Example 1: Generate Panel with Semantic Note Filtering
 * Automatically filters pinned notes to show only relevant ones
 */
export function GeneratePanelWithSemantics() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [stats, setStats] = useState<{ filtered: number; total: number } | null>(null);

  const { filterPinnedNotes, isInitialized } = useSemanticFiltering(true);

  // Example pinned notes
  const pinnedNotes = [
    'Write in a professional tone for business audiences',
    'Use simple language suitable for beginners',
    'Include code examples when explaining technical concepts',
    'Keep paragraphs short and scannable for web reading',
  ];

  const handleGenerate = async () => {
    if (!prompt) return;

    try {
      // Filter notes by relevance to the prompt
      const filteredNotes = await filterPinnedNotes(pinnedNotes, prompt, 2);

      console.log('Filtered notes:', filteredNotes);
      setStats({
        filtered: filteredNotes.length,
        total: pinnedNotes.length,
      });

      // Generate with only relevant notes
      const text = await AIServiceWithSemantics.generate(prompt, {
        pinnedNotes: filteredNotes.map((n) => n.text),
        enableSemanticFiltering: false, // Already filtered
      });

      setResult(text);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div className="generate-panel">
      <h2>Generate with Semantic Filtering</h2>

      {!isInitialized && <div className="loading">Initializing semantic engine...</div>}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What would you like to generate?"
        rows={3}
      />

      <button onClick={handleGenerate} disabled={!isInitialized || !prompt}>
        Generate
      </button>

      {stats && (
        <div className="stats">
          Using {stats.filtered} of {stats.total} pinned notes (filtered by relevance)
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Result:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: History Panel with Semantic Search
 * Filters history items by semantic relevance to search query
 */
export function HistoryPanelWithSemantics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<
    Array<{ id: string; text: string; score: number }>
  >([]);

  const { filterItems, isInitialized } = useSemanticFiltering(true);

  // Example history items
  const historyItems = [
    { id: '1', text: 'Machine learning algorithms for data analysis' },
    { id: '2', text: 'Recipe for chocolate chip cookies' },
    { id: '3', text: 'Deep learning neural network architectures' },
    { id: '4', text: 'Travel guide to Paris, France' },
    { id: '5', text: 'Natural language processing techniques' },
  ];

  const handleSearch = async () => {
    if (!searchQuery) {
      setFilteredHistory([]);
      return;
    }

    try {
      const filtered = await filterItems(historyItems, searchQuery, {
        topK: 5,
        minScore: 0.1,
      });

      setFilteredHistory(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="history-panel">
      <h2>History with Semantic Search</h2>

      <div className="search-box">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by meaning, not just keywords..."
          disabled={!isInitialized}
        />
        <button onClick={handleSearch} disabled={!isInitialized || !searchQuery}>
          Search
        </button>
      </div>

      {!isInitialized && <div className="loading">Initializing semantic search...</div>}

      <div className="results">
        {filteredHistory.length > 0 ? (
          <ul>
            {filteredHistory.map((item) => (
              <li key={item.id}>
                <div className="text">{item.text}</div>
                <div className="score">Relevance: {(item.score * 100).toFixed(0)}%</div>
              </li>
            ))}
          </ul>
        ) : searchQuery ? (
          <div className="no-results">No relevant results found</div>
        ) : (
          <div className="all-items">
            <ul>
              {historyItems.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: Smart Context Assembly for Generate
 * Uses semantic filtering to build optimal context from document and notes
 */
export function SmartGeneratePanel() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [metadata, setMetadata] = useState<{
    totalNotes: number;
    filteredNotes: number;
    contextChars: number;
  } | null>(null);

  // Simulated document and cursor position
  const fullDocument = `
    Introduction to Machine Learning
    
    Machine learning is a subset of artificial intelligence that enables systems to learn
    and improve from experience without being explicitly programmed. It focuses on the
    development of computer programs that can access data and use it to learn for themselves.
    
    Types of Machine Learning
    
    There are three main types of machine learning: supervised learning, unsupervised learning,
    and reinforcement learning. Each type has its own use cases and applications.
    
    Applications
    
    Machine learning is used in various fields including healthcare, finance, marketing,
    and autonomous vehicles. It powers recommendation systems, fraud detection, and more.
  `;

  const cursorPos = 500; // Middle of document

  const pinnedNotes = [
    'Write for technical audiences with ML background',
    'Use simple language for beginners',
    'Include practical examples',
    'Focus on business applications',
  ];

  const handleGenerate = async () => {
    if (!prompt) return;

    try {
      const { text, metadata: meta } = await AIServiceWithSemantics.generateWithContext(
        prompt,
        fullDocument,
        cursorPos,
        {
          pinnedNotes,
          enableSemanticFiltering: true,
          semanticFilterTopK: 2,
        }
      );

      setResult(text);
      setMetadata(meta);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div className="smart-generate-panel">
      <h2>Smart Generate with Context</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What would you like to add to the document?"
        rows={3}
      />

      <button onClick={handleGenerate} disabled={!prompt}>
        Generate
      </button>

      {metadata && (
        <div className="metadata">
          <div>Context: {metadata.contextChars} characters</div>
          <div>
            Notes: {metadata.filteredNotes} of {metadata.totalNotes} (filtered by relevance)
          </div>
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Generated Text:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Deduplication in History
 * Automatically filters out duplicate or near-duplicate history items
 */
export function DeduplicatedHistoryPanel() {
  const [showDuplicates, setShowDuplicates] = useState(false);
  const { filterItems, isInitialized } = useSemanticFiltering(true);

  // Example history with duplicates
  const historyWithDuplicates = [
    { id: '1', text: 'Machine learning is a powerful technology' },
    { id: '2', text: 'Machine learning is very powerful technology' }, // Near-duplicate
    { id: '3', text: 'Deep learning uses neural networks' },
    { id: '4', text: 'Deep learning utilizes neural networks' }, // Near-duplicate
    { id: '5', text: 'The weather is nice today' },
  ];

  const [deduplicated, setDeduplicated] = React.useState<
    Array<{ id: string; text: string; score: number }>
  >([]);

  React.useEffect(() => {
    if (!isInitialized) return;

    const deduplicate = async () => {
      // Use a generic query to get all items, but filter duplicates
      const filtered = await filterItems(historyWithDuplicates, 'all content', {
        topK: 10,
        minScore: 0.0,
        maxJaccardScore: 0.7, // Aggressive deduplication
      });

      setDeduplicated(filtered);
    };

    deduplicate();
  }, [isInitialized, filterItems]);

  return (
    <div className="deduplicated-history">
      <h2>History with Deduplication</h2>

      <label>
        <input
          type="checkbox"
          checked={showDuplicates}
          onChange={(e) => setShowDuplicates(e.target.checked)}
        />
        Show duplicates
      </label>

      {!isInitialized && <div className="loading">Initializing...</div>}

      <div className="comparison">
        {showDuplicates && (
          <div className="with-duplicates">
            <h3>Original ({historyWithDuplicates.length} items)</h3>
            <ul>
              {historyWithDuplicates.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="deduplicated">
          <h3>Deduplicated ({deduplicated.length} items)</h3>
          <ul>
            {deduplicated.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Learning from User Content
 * Remembers user's writing style and preferences
 */
export function LearningPanel() {
  const [content, setContent] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const { rememberContent, searchMemory, isInitialized } = useSemanticFiltering(true);

  const handleSave = async () => {
    if (!content) return;

    try {
      await rememberContent(content, {
        source: 'user-writing',
        type: 'example',
      });

      setSavedCount((c) => c + 1);
      setContent('');
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleSearch = async () => {
    const results = await searchMemory('writing style examples', 5);
    console.log('Found similar content:', results);
  };

  return (
    <div className="learning-panel">
      <h2>Learn from Your Writing</h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something, and Flint will remember your style..."
        rows={5}
        disabled={!isInitialized}
      />

      <button onClick={handleSave} disabled={!isInitialized || !content}>
        Save to Memory
      </button>

      <button onClick={handleSearch} disabled={!isInitialized}>
        Find Similar Content
      </button>

      {savedCount > 0 && <div className="status">Saved {savedCount} examples to memory</div>}
    </div>
  );
}
