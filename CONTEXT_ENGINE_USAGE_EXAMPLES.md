# Context Engine Usage Examples

## Example 1: Writing a Long Article

### Document Structure
```
# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence...

# Types of Machine Learning

There are three main types: supervised, unsupervised, and reinforcement learning.

## Supervised Learning

Supervised learning uses labeled data to train models...

## Unsupervised Learning

Unsupervised learning finds patterns in unlabeled data...

[CURSOR HERE - User wants to continue writing]

## Reinforcement Learning

Reinforcement learning uses rewards and penalties...

# Applications

Machine learning is used in healthcare, finance, and more...
```

### What the Context Engine Does

1. **Local Context (1500 chars)**
   - Extracts text around cursor
   - Sees "Unsupervised Learning" section and beginning of "Reinforcement Learning"

2. **Related Sections (Top 3)**
   - Finds "Introduction to Machine Learning" (high keyword overlap)
   - Finds "Types of Machine Learning" (mentions all three types)
   - Finds "Applications" (relevant to overall topic)

3. **Nearest Heading**
   - Detects "Unsupervised Learning" as current section

4. **Final Context Sent to AI**
   ```
   [CONTEXT BEFORE CURSOR]
   ...Unsupervised learning finds patterns in unlabeled data...
   
   [CONTEXT AFTER CURSOR]
   ## Reinforcement Learning
   Reinforcement learning uses rewards and penalties...
   
   [RELATED SECTIONS FROM DOCUMENT]
   1. Machine learning is a subset of artificial intelligence...
   2. There are three main types: supervised, unsupervised, and reinforcement...
   3. Machine learning is used in healthcare, finance, and more...
   
   CURRENT SECTION: "Unsupervised Learning"
   ```

### Result
The AI now understands:
- ✅ You're writing about machine learning
- ✅ You're in the "Unsupervised Learning" section
- ✅ The document covers three types of ML
- ✅ The writing style and tone
- ✅ What comes before and after the cursor

## Example 2: Rewriting with Context

### Original Document
```
Dear Team,

I hope this email finds you well. I wanted to reach out regarding the upcoming project deadline.

[SELECTED TEXT: The deadline is next Friday and we need to finish everything.]

Please let me know if you have any questions.

Best regards,
John
```

### What the Context Engine Does

1. **Selected Text**
   - "The deadline is next Friday and we need to finish everything."

2. **Context Before (500 chars)**
   - "Dear Team, I hope this email finds you well. I wanted to reach out regarding the upcoming project deadline."

3. **Context After (500 chars)**
   - "Please let me know if you have any questions. Best regards, John"

4. **Final Context Sent to AI**
   ```
   Surrounding context for style matching:
   Before: "...I wanted to reach out regarding the upcoming project deadline."
   After: "Please let me know if you have any questions..."
   
   Ensure the rewritten text flows naturally with the surrounding context.
   
   Text to rewrite:
   The deadline is next Friday and we need to finish everything.
   ```

### Result
The AI now:
- ✅ Knows this is a professional email
- ✅ Matches the formal tone ("I hope this email finds you well")
- ✅ Maintains consistency with surrounding text
- ✅ Produces: "The project deadline is Friday, and we need to complete all deliverables by then."

## Example 3: Technical Documentation

### Document Structure
```
# API Documentation

## Authentication

All API requests require authentication using Bearer tokens.

## Endpoints

### GET /users

Returns a list of users.

**Parameters:**
- page (optional): Page number
- limit (optional): Items per page

[CURSOR HERE - User wants to add response format]

### POST /users

Creates a new user.

**Request Body:**
```json
{
  "name": "string",
  "email": "string"
}
```
```

### What the Context Engine Does

1. **Local Context**
   - Sees GET /users endpoint with parameters
   - Sees beginning of POST /users endpoint

2. **Related Sections**
   - Finds "Authentication" section (relevant to API usage)
   - Finds POST /users request body format (similar structure)
   - Finds other endpoint documentation (style reference)

3. **Nearest Heading**
   - Detects "GET /users" as current section

4. **AI Understands**
   - ✅ This is API documentation
   - ✅ Format should match POST /users response format
   - ✅ Should include JSON example
   - ✅ Should document response codes

### Generated Output
```
**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  ],
  "page": 1,
  "total": 100
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Server Error
```

## Example 4: Email Continuation

### Document
```
Subject: Q4 Planning Meeting

Hi Sarah,

Thanks for your email about the Q4 planning session. I've reviewed the proposed agenda and have a few thoughts.

First, I think we should allocate more time for the budget discussion. [CURSOR HERE]
```

### What the Context Engine Does

1. **Local Context**
   - Sees email greeting and first paragraph
   - Sees beginning of second paragraph about budget

2. **Related Sections**
   - Finds "Subject: Q4 Planning Meeting" (topic context)
   - Finds "Thanks for your email" (establishes this is a reply)

3. **Document Type Detection**
   - Recognizes this is an email (Subject line present)
   - Adjusts generation style accordingly

4. **AI Generates**
   ```
   Last year's budget review took longer than expected, and we ended up rushing through other important topics. I'd suggest dedicating at least 30 minutes to this discussion.
   
   Second, I noticed the marketing strategy isn't on the agenda. Given our recent campaign results, I think this deserves attention. Could we add a 15-minute slot for this?
   ```

### Why It Works
- ✅ Maintains professional email tone
- ✅ References context (Q4 planning, budget discussion)
- ✅ Continues the numbered list format ("First... Second...")
- ✅ Stays relevant to the topic

## Performance Comparison

### Small Document (500 words)
- **Old System**: 1000 chars context, 0 related sections
- **New System**: 1500 chars context, 0-1 related sections
- **Processing Time**: < 5ms
- **Improvement**: Minimal (document too small for related sections)

### Medium Document (2000 words)
- **Old System**: 1000 chars context, 0 related sections
- **New System**: 1500 chars context, 2-3 related sections
- **Processing Time**: < 10ms
- **Improvement**: Significant (AI sees 2250 chars vs 1000 chars)

### Large Document (10,000 words)
- **Old System**: 1000 chars context, 0 related sections
- **New System**: 1500 chars context, 3 related sections
- **Processing Time**: < 20ms
- **Improvement**: Major (AI understands document structure and key themes)

## Tips for Best Results

### 1. Use Clear Headings
```markdown
# Main Topic
## Subtopic
### Detail
```
The context engine detects these and provides better section awareness.

### 2. Write Consistent Terminology
The keyword overlap scoring works best when you use consistent terms throughout your document.

### 3. Structure Your Document
Break content into clear paragraphs separated by blank lines. This helps the context engine identify semantic sections.

### 4. Enable Context Awareness
Make sure "Context Awareness" is enabled in settings (it's on by default).

### 5. Use Pinned Notes
Add pinned notes for audience and tone guidance. These are included in all AI requests.

## Troubleshooting

### AI Doesn't Seem to Understand Document Context
- Check that context awareness is enabled in settings
- Ensure your document has clear structure (headings, paragraphs)
- Try using more consistent terminology throughout

### Generated Text Doesn't Match Style
- Add a pinned note describing your desired tone
- Ensure there's enough surrounding text for style matching
- Try rewriting with more context selected

### Performance Issues
- Context engine is optimized for documents up to 50,000 words
- For very large documents, consider splitting into multiple files
- Processing time should be < 50ms even for large documents

## Advanced Usage

### Custom Context Window
```typescript
// In your code, adjust context options
const context = assembleContext(fullText, cursorPos, {
  localWindow: 2000,        // Increase for more local context
  maxRelatedSections: 5,    // Include more related sections
  enableRelevanceScoring: true,
  enableDeduplication: true,
});
```

### Disable Related Sections
If you only want local context without document-level awareness:
```typescript
const context = assembleContext(fullText, cursorPos, {
  enableRelevanceScoring: false,  // Disable related sections
});
```

This can be useful for very structured documents where related sections might be confusing.
