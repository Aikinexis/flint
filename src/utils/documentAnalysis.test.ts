/**
 * Tests for document analysis utilities
 */

import {
  detectDocumentType,
  analyzeCursorContext,
  generateSmartTitle,
  buildContextInstructions,
  type DocumentType,
  type CursorContext,
} from './documentAnalysis';

describe('detectDocumentType', () => {
  it('should detect email with headers', () => {
    const content = `Subject: Meeting Tomorrow
To: john@example.com
From: jane@example.com

Hi John,

Let's meet tomorrow at 2pm.

Best regards,
Jane`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('email');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.indicators).toContain('email headers');
  });

  it('should detect email with email addresses', () => {
    const content = `Please contact me at john@example.com for more details.`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('email');
    expect(result.indicators).toContain('email addresses');
  });

  it('should detect letter with salutation and closing', () => {
    const content = `Dear Sir,

I am writing to express my interest in the position.

Sincerely,
John Doe`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('letter');
    expect(result.indicators).toContain('salutation');
    expect(result.indicators).toContain('closing');
  });

  it('should detect article with markdown headings', () => {
    const content = `# Introduction

This is the first paragraph.

## Section 1

More content here.

### Subsection

Details.`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('article');
    expect(result.indicators.some((i) => i.includes('markdown headings'))).toBe(true);
  });

  it('should detect article with all-caps headings', () => {
    const content = `INTRODUCTION

This is the first paragraph.

SECTION ONE

More content here.`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('article');
    expect(result.indicators.some((i) => i.includes('all-caps headings'))).toBe(true);
  });

  it('should detect list with bullet points', () => {
    const content = `Shopping list:
• Milk
• Eggs
• Bread
• Butter`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('list');
    expect(result.indicators.some((i) => i.includes('bullet points'))).toBe(true);
  });

  it('should detect list with numbered items', () => {
    const content = `Steps to follow:
1. Open the app
2. Click settings
3. Enable notifications
4. Save changes`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('list');
    expect(result.indicators.some((i) => i.includes('numbered items'))).toBe(true);
  });

  it('should detect code with code blocks', () => {
    const content = `Here is some code:

\`\`\`javascript
function hello() {
  console.log('Hello world');
}
\`\`\``;

    const result = detectDocumentType(content);
    expect(result.type).toBe('code');
    expect(result.indicators).toContain('code blocks');
  });

  it('should detect code with keywords', () => {
    const content = `function calculateTotal(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total;
}`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('code');
    expect(result.indicators).toContain('code keywords');
  });

  it('should return general for plain text', () => {
    const content = `This is just some plain text without any specific patterns.`;

    const result = detectDocumentType(content);
    expect(result.type).toBe('general');
    expect(result.confidence).toBe(1);
    expect(result.indicators).toContain('no specific patterns');
  });

  it('should handle empty content', () => {
    const result = detectDocumentType('');
    expect(result.type).toBe('general');
  });
});

describe('analyzeCursorContext', () => {
  it('should detect cursor in subject line', () => {
    const content = `Subject: Meeting Tomorrow
To: john@example.com`;
    const cursorPos = 10; // Inside "Subject: Meeting"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInSubjectLine).toBe(true);
  });

  it('should detect cursor after subject line', () => {
    const content = `Subject: Meeting Tomorrow
Tomorrow at 2pm`;
    const cursorPos = 30; // On second line

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInSubjectLine).toBe(true);
  });

  it('should detect cursor in markdown heading', () => {
    const content = `# Introduction

Some content here.`;
    const cursorPos = 5; // Inside "# Introduction"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInHeading).toBe(true);
  });

  it('should detect cursor in all-caps heading', () => {
    const content = `INTRODUCTION

Some content here.`;
    const cursorPos = 5; // Inside "INTRODUCTION"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInHeading).toBe(true);
  });

  it('should detect cursor in bullet list', () => {
    const content = `• First item
• Second item
• Third item`;
    const cursorPos = 15; // Inside "• Second item"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInList).toBe(true);
    expect(result.listStyle).toBe('bullet');
  });

  it('should detect cursor in numbered list', () => {
    const content = `1. First item
2. Second item
3. Third item`;
    const cursorPos = 18; // Inside "2. Second item"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInList).toBe(true);
    expect(result.listStyle).toBe('numbered');
  });

  it('should detect cursor in code block', () => {
    const content = `Some text

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More text`;
    const cursorPos = 30; // Inside code block

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInCodeBlock).toBe(true);
  });

  it('should detect cursor outside code block', () => {
    const content = `Some text

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More text`;
    const cursorPos = 5; // Before code block

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isInCodeBlock).toBe(false);
  });

  it('should detect cursor after salutation', () => {
    const content = `Dear John,
I hope this email finds you well.`;
    const cursorPos = 12; // Start of second line

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isAfterSalutation).toBe(true);
  });

  it('should detect cursor before signature', () => {
    const content = `Thank you for your time.
Best regards,
John`;
    const cursorPos = 20; // First line

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.isBeforeSignature).toBe(true);
  });

  it('should find nearest heading', () => {
    const content = `# Introduction

Some content here.

More content.`;
    const cursorPos = 40; // In "More content"

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.nearestHeading).toBe('Introduction');
  });

  it('should calculate indent level', () => {
    const content = `No indent
  Two spaces
    Four spaces`;
    const cursorPos = 25; // On "    Four spaces" line

    const result = analyzeCursorContext(content, cursorPos);
    expect(result.indentLevel).toBe(4); // Four spaces of indentation
  });

  it('should handle cursor at start of document', () => {
    const content = `First line
Second line`;
    const cursorPos = 0;

    const result = analyzeCursorContext(content, cursorPos);
    expect(result).toBeDefined();
    expect(result.isInSubjectLine).toBe(false);
  });

  it('should handle cursor at end of document', () => {
    const content = `First line
Second line`;
    const cursorPos = content.length;

    const result = analyzeCursorContext(content, cursorPos);
    expect(result).toBeDefined();
  });
});

describe('generateSmartTitle', () => {
  it('should return "Untitled" for empty content', () => {
    expect(generateSmartTitle('')).toBe('Untitled');
    expect(generateSmartTitle('   ')).toBe('Untitled');
  });

  it('should extract subject line', () => {
    const content = `Subject: Meeting Tomorrow
To: john@example.com`;

    expect(generateSmartTitle(content)).toBe('Meeting Tomorrow');
  });

  it('should extract markdown heading', () => {
    const content = `# Introduction to AI

This is the first paragraph.`;

    expect(generateSmartTitle(content)).toBe('Introduction to AI');
  });

  it('should extract all-caps heading', () => {
    const content = `INTRODUCTION

This is the first paragraph.`;

    expect(generateSmartTitle(content)).toBe('INTRODUCTION');
  });

  it('should use first meaningful line', () => {
    const content = `This is a document about artificial intelligence and machine learning.`;

    const result = generateSmartTitle(content);
    expect(result).toContain('This is a document about artificial intelligence');
    expect(result.length).toBeLessThanOrEqual(53); // Max 50 chars + "..."
  });

  it('should skip salutations', () => {
    const content = `Dear John,
This is the actual content of the letter.`;

    expect(generateSmartTitle(content)).toBe('This is the actual content of the letter.');
  });

  it('should remove bullet points', () => {
    const content = `• First important point about the topic`;

    expect(generateSmartTitle(content)).toBe('First important point about the topic');
  });

  it('should remove numbered list markers', () => {
    const content = `1. First important point about the topic`;

    expect(generateSmartTitle(content)).toBe('First important point about the topic');
  });

  it('should truncate long titles', () => {
    const content = `This is a very long title that exceeds fifty characters and should be truncated`;

    const result = generateSmartTitle(content);
    expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
    expect(result).toContain('...');
  });

  it('should handle content with only short lines', () => {
    const content = `Hi
Ok
Yes`;

    // Function falls back to first 50 chars when no meaningful line found
    const result = generateSmartTitle(content);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('buildContextInstructions', () => {
  it('should provide subject line instructions', () => {
    const docType: DocumentType = { type: 'email', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: true,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('subject line');
    expect(result).toContain('5-10 words');
    expect(result).toContain('Do NOT write a full email');
  });

  it('should provide heading instructions', () => {
    const docType: DocumentType = { type: 'article', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: true,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('heading or title');
    expect(result).toContain('one line only');
    expect(result).toContain('Do NOT write body text');
  });

  it('should provide bullet list instructions', () => {
    const docType: DocumentType = { type: 'list', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: true,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'bullet',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('bullet point list');
    expect(result).toContain('brief');
  });

  it('should provide numbered list instructions', () => {
    const docType: DocumentType = { type: 'list', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: true,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'numbered',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('numbered list');
    expect(result).toContain('brief');
  });

  it('should provide code block instructions', () => {
    const docType: DocumentType = { type: 'code', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: true,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('code only');
    expect(result).toContain('no explanations');
  });

  it('should provide email body instructions after salutation', () => {
    const docType: DocumentType = { type: 'email', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: true,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('email body');
    expect(result).toContain('2-3 paragraphs');
  });

  it('should provide closing instructions before signature', () => {
    const docType: DocumentType = { type: 'email', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: true,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('closing paragraph');
    expect(result).toContain('brief');
  });

  it('should provide letter-specific instructions', () => {
    const docType: DocumentType = { type: 'letter', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('formal letter');
    expect(result).toContain('tone');
  });

  it('should provide article instructions with nearest heading', () => {
    const docType: DocumentType = { type: 'article', confidence: 0.8, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      nearestHeading: 'Introduction',
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toContain('Introduction');
    expect(result).toContain('article');
  });

  it('should return empty string for general context', () => {
    const docType: DocumentType = { type: 'general', confidence: 1, indicators: [] };
    const cursorContext: CursorContext = {
      isInSubjectLine: false,
      isInHeading: false,
      isInList: false,
      isInCodeBlock: false,
      isAfterSalutation: false,
      isBeforeSignature: false,
      listStyle: 'none',
      indentLevel: 0,
    };

    const result = buildContextInstructions(docType, cursorContext);
    expect(result).toBe('');
  });
});
