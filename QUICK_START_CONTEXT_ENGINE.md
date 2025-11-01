# Quick Start: Context Engine

## What Is It?

A lightweight system that helps Flint's AI understand your entire document, not just the text immediately around your cursor.

## How It Works (Simple Version)

1. **Extracts local context** - 1500 characters around your cursor
2. **Finds related sections** - Scans your document for relevant paragraphs
3. **Sends to AI** - Combines everything into a smart prompt

## What Changed?

### Generate Tool
- **Before**: AI sees ~150 words around cursor
- **After**: AI sees ~330 words including relevant sections from entire document

### Rewrite Tool
- **Before**: AI only sees selected text
- **After**: AI sees selected text + 500 chars before/after for style matching

## Do I Need to Do Anything?

**No!** It works automatically. Context awareness is enabled by default.

## How to Use

### Writing a Long Document

Just write normally. When you click "Generate", the AI will:
- Understand what you've written earlier
- Match your writing style
- Stay consistent with your document's themes

### Rewriting Text

Select text and click "Rewrite". The AI will:
- See what comes before and after
- Match the surrounding style
- Maintain flow with adjacent paragraphs

## Settings

Context awareness is controlled in settings:
- **On** (default): Uses enhanced context engine
- **Off**: Uses basic context (faster, less aware)

## Performance

- **Speed**: < 20ms for most documents
- **Privacy**: 100% local, no data sent anywhere
- **Memory**: Minimal overhead

## Tips for Best Results

1. **Use clear headings** - Helps AI understand document structure
2. **Write in paragraphs** - Separated by blank lines
3. **Use consistent terms** - Helps relevance scoring
4. **Enable context awareness** - It's on by default, keep it on!

## Troubleshooting

### AI doesn't understand my document
- Make sure context awareness is enabled
- Add clear headings to structure your document
- Use consistent terminology throughout

### Generated text doesn't match my style
- Add a pinned note describing your desired tone
- Make sure there's enough surrounding text
- Try selecting more context when rewriting

## Technical Details

For developers and curious users:

- **Algorithm**: Jaccard similarity (keyword overlap)
- **Context window**: 1500 chars local + 750 chars related
- **Processing**: Client-side JavaScript, no ML models
- **Dependencies**: Zero external dependencies

## Learn More

- `CONTEXT_ENGINE_IMPLEMENTATION.md` - Technical details
- `CONTEXT_ENGINE_USAGE_EXAMPLES.md` - Real-world examples
- `CONTEXT_AWARENESS_ANALYSIS.md` - Before/after comparison

## Summary

The context engine makes Flint's AI smarter without making it slower or compromising your privacy. It just works!
