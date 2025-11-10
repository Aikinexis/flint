# Semantic Awareness Engine

Local semantic filtering for intelligent AI context selection.

## Quick Start

```typescript
import { AIServiceWithSemantics } from '../services/aiWithSemantics';

// Initialize once on app load
await AIServiceWithSemantics.initialize();

// Use in place of AIService
const result = await AIServiceWithSemantics.generate(prompt, {
  pinnedNotes: allNotes,
  enableSemanticFiltering: true // Automatically filters to top 3 relevant notes
});
```

## What It Does

Filters content before AI processing using:
1. **TF-IDF Embeddings** - Semantic vectors
2. **Cosine Similarity** - Relevance scoring (0-1)
3. **Jaccard Filtering** - Duplicate removal

## Files

- `semanticEngine.ts` - Core engine (embeddings, similarity, memory)
- `../services/semanticMemory.ts` - Persistent storage (IndexedDB)
- `contextEngineWithSemantics.ts` - Context assembly with filtering
- `../services/aiWithSemantics.ts` - AI service wrapper
- `../hooks/useSemanticFiltering.ts` - React hooks

## Performance

- **Bundle size**: ~9KB
- **Search time**: <20ms
- **Memory usage**: <5MB
- **Initialization**: ~50ms

## Documentation

- Quick start: `docs/SEMANTIC_QUICKSTART.md`
- Full guide: `docs/semantic-awareness-guide.md`
- Examples: `docs/semantic-integration-examples.tsx`
- Before/after: `docs/BEFORE_AFTER_EXAMPLE.md`

## Example: Filter Pinned Notes

```typescript
import { useSemanticFiltering } from '../hooks/useSemanticFiltering';

function MyComponent() {
  const { filterPinnedNotes } = useSemanticFiltering(true);

  const handleGenerate = async () => {
    // Filter 10 notes → top 3 relevant
    const relevant = await filterPinnedNotes(pinnedNotes, userPrompt, 3);
    
    // Use only relevant notes
    const result = await AIService.generate(userPrompt, {
      pinnedNotes: relevant.map(n => n.text)
    });
  };
}
```

## Example: Semantic Search

```typescript
import { SemanticMemoryService } from '../services/semanticMemory';

// Search by meaning, not keywords
const results = await SemanticMemoryService.search('AI research', {
  topK: 5,
  minSemanticScore: 0.2
});

// Finds: "machine learning", "neural networks", "deep learning"
// Ignores: "pizza recipes", "weather forecast"
```

## Configuration

```typescript
interface SemanticSearchOptions {
  topK?: number;              // Number of results (default: 10)
  minSemanticScore?: number;  // Min relevance (default: 0.0)
  maxJaccardScore?: number;   // Max overlap (default: 0.8)
  enableJaccardFilter?: boolean; // Deduplication (default: true)
}
```

## Recommended Settings

**Pinned Notes**: `{ topK: 3, minSemanticScore: 0.1, maxJaccardScore: 0.9 }`  
**Document Sections**: `{ topK: 5, minSemanticScore: 0.15, maxJaccardScore: 0.85 }`  
**Deduplication**: `{ topK: 100, minSemanticScore: 0.0, maxJaccardScore: 0.7 }`

## Tests

```bash
npm test src/utils/__tests__/semanticEngine.test.ts
```

## License

Same as parent project (MIT)
