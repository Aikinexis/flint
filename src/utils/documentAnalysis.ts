/**
 * Document analysis utilities for smart context detection
 * Analyzes document structure to provide better AI context
 */

/**
 * Document type detection result
 */
export interface DocumentType {
  type: 'email' | 'letter' | 'article' | 'list' | 'code' | 'general';
  confidence: number; // 0-1
  indicators: string[]; // What patterns were detected
}

/**
 * Cursor context analysis
 */
export interface CursorContext {
  isInSubjectLine: boolean;
  isInHeading: boolean;
  isInList: boolean;
  isInCodeBlock: boolean;
  isAfterSalutation: boolean;
  isBeforeSignature: boolean;
  nearestHeading?: string;
  listStyle?: 'bullet' | 'numbered' | 'none';
  indentLevel: number;
}

/**
 * Detects the type of document based on content patterns
 */
export function detectDocumentType(content: string): DocumentType {
  const indicators: string[] = [];
  let emailScore = 0;
  let letterScore = 0;
  let articleScore = 0;
  let listScore = 0;
  let codeScore = 0;

  const lines = content.split('\n');
  const firstLines = lines.slice(0, 10).join('\n').toLowerCase();
  const allContent = content.toLowerCase();

  // Email indicators
  if (/^(subject|to|from|cc|bcc):/im.test(content)) {
    emailScore += 3;
    indicators.push('email headers');
  }
  if (/@[\w.-]+\.\w+/.test(content)) {
    emailScore += 1;
    indicators.push('email addresses');
  }

  // Letter indicators
  if (/^(dear|hi|hello|greetings)/im.test(firstLines)) {
    letterScore += 2;
    indicators.push('salutation');
  }
  if (/(sincerely|regards|best|yours)/im.test(allContent)) {
    letterScore += 1;
    indicators.push('closing');
  }

  // Article indicators
  const headingCount = (content.match(/^#{1,6}\s+.+$/gm) || []).length;
  if (headingCount > 0) {
    articleScore += headingCount;
    indicators.push(`${headingCount} markdown headings`);
  }
  const allCapsLines = lines.filter(
    (line) => line.trim().length > 3 && line.trim() === line.trim().toUpperCase()
  ).length;
  if (allCapsLines > 0) {
    articleScore += allCapsLines * 0.5;
    indicators.push(`${allCapsLines} all-caps headings`);
  }

  // List indicators
  const bulletLines = (content.match(/^[\s]*[•\-*]\s+/gm) || []).length;
  const numberedLines = (content.match(/^[\s]*\d+\.\s+/gm) || []).length;
  if (bulletLines > 2) {
    listScore += bulletLines * 0.5;
    indicators.push(`${bulletLines} bullet points`);
  }
  if (numberedLines > 2) {
    listScore += numberedLines * 0.5;
    indicators.push(`${numberedLines} numbered items`);
  }

  // Code indicators
  if (/```[\s\S]*```/.test(content)) {
    codeScore += 3;
    indicators.push('code blocks');
  }
  if (/^(function|const|let|var|class|import|export)/m.test(content)) {
    codeScore += 2;
    indicators.push('code keywords');
  }

  // Determine type based on scores
  const scores = {
    email: emailScore,
    letter: letterScore,
    article: articleScore,
    list: listScore,
    code: codeScore,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { type: 'general', confidence: 1, indicators: ['no specific patterns'] };
  }

  const type = (Object.keys(scores) as Array<keyof typeof scores>).find(
    (key) => scores[key] === maxScore
  )!;
  const confidence = Math.min(maxScore / 5, 1); // Normalize to 0-1

  return { type: type as DocumentType['type'], confidence, indicators };
}

/**
 * Analyzes the context around the cursor position
 */
export function analyzeCursorContext(content: string, cursorPos: number): CursorContext {
  const lines = content.split('\n');
  let currentPos = 0;
  let currentLine = 0;

  // Find which line the cursor is on
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i]!.length + 1; // +1 for newline
    if (currentPos + lineLength > cursorPos) {
      currentLine = i;
      break;
    }
    currentPos += lineLength;
  }

  const line = lines[currentLine] || '';
  const lineBefore = lines[currentLine - 1] || '';
  const lineAfter = lines[currentLine + 1] || '';

  // Check various contexts
  const isInSubjectLine =
    /^subject:/i.test(line) || (/^subject:/i.test(lineBefore) && line.trim().length < 100);

  const isInHeading =
    /^#{1,6}\s+/.test(line) ||
    (line.trim().length > 0 && line.trim() === line.trim().toUpperCase());

  const isInList = /^[\s]*[•\-*]\s+/.test(line) || /^[\s]*\d+\.\s+/.test(line);

  const isInCodeBlock = (() => {
    const beforeCursor = content.substring(0, cursorPos);
    const codeBlockStarts = (beforeCursor.match(/```/g) || []).length;
    return codeBlockStarts % 2 === 1; // Odd number means we're inside a code block
  })();

  const isAfterSalutation = /^(dear|hi|hello|greetings)/i.test(lineBefore);

  const isBeforeSignature = /(sincerely|regards|best|yours)/i.test(lineAfter);

  // Find nearest heading
  let nearestHeading: string | undefined;
  for (let i = currentLine - 1; i >= 0; i--) {
    const testLine = lines[i]!;
    if (/^#{1,6}\s+/.test(testLine)) {
      nearestHeading = testLine.replace(/^#{1,6}\s+/, '').trim();
      break;
    }
    if (testLine.trim().length > 0 && testLine.trim() === testLine.trim().toUpperCase()) {
      nearestHeading = testLine.trim();
      break;
    }
  }

  // Detect list style
  let listStyle: 'bullet' | 'numbered' | 'none' = 'none';
  if (/^[\s]*[•\-*]\s+/.test(line)) {
    listStyle = 'bullet';
  } else if (/^[\s]*\d+\.\s+/.test(line)) {
    listStyle = 'numbered';
  }

  // Calculate indent level
  const indentLevel = line.match(/^[\s]*/)?.[0].length || 0;

  return {
    isInSubjectLine,
    isInHeading,
    isInList,
    isInCodeBlock,
    isAfterSalutation,
    isBeforeSignature,
    nearestHeading,
    listStyle,
    indentLevel,
  };
}

/**
 * Generates a smart title from a user prompt
 * Extracts the key topic/subject from instructions like "write a document about X"
 */
export function generateTitleFromPrompt(prompt: string): string {
  if (!prompt.trim()) {
    return 'Untitled';
  }

  // Remove common instruction phrases
  let cleaned = prompt
    .toLowerCase()
    .replace(/^(write|create|generate|draft|compose|make)\s+(a|an|the|me|some)?\s*/i, '')
    .replace(/^(document|article|email|letter|post|blog|essay|report|paper)\s+(about|on|explaining|describing|discussing)?\s*/i, '')
    .replace(/^(about|on|explaining|describing|discussing)\s+/i, '')
    .trim();

  // Capitalize first letter of each word
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Limit length
  if (cleaned.length > 50) {
    cleaned = cleaned.slice(0, 47) + '...';
  }

  return cleaned || 'Untitled';
}

/**
 * Generates a smart title from document content
 * Uses first meaningful line or summarizes first paragraph
 */
export function generateSmartTitle(content: string): string {
  if (!content.trim()) {
    return 'Untitled';
  }

  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  // Check for existing subject line
  const subjectLine = lines.find((line) => /^subject:/i.test(line));
  if (subjectLine) {
    return subjectLine.replace(/^subject:\s*/i, '').trim().slice(0, 50);
  }

  // Check for markdown heading
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));
  if (heading) {
    return heading.replace(/^#{1,6}\s+/, '').trim().slice(0, 50);
  }

  // Check for all-caps heading
  const allCapsHeading = lines.find(
    (line) => line.trim().length > 3 && line.trim() === line.trim().toUpperCase()
  );
  if (allCapsHeading) {
    return allCapsHeading.trim().slice(0, 50);
  }

  // Use first meaningful line (skip salutations)
  const firstLine = lines.find(
    (line) => line.trim().length > 10 && !/^(dear|hi|hello|greetings)/i.test(line)
  );
  if (firstLine) {
    const cleaned = firstLine.trim().replace(/[•\-*]\s*/, '').replace(/^\d+\.\s*/, '');
    return cleaned.slice(0, 50) + (cleaned.length > 50 ? '...' : '');
  }

  // Fallback: use first 50 chars
  return content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
}

/**
 * Builds smart context instructions based on document analysis
 */
export function buildContextInstructions(
  docType: DocumentType,
  cursorContext: CursorContext
): string {
  const instructions: string[] = [];

  // Subject line specific
  if (cursorContext.isInSubjectLine) {
    instructions.push('Generate a VERY SHORT subject line (5-10 words maximum)');
    instructions.push('Be concise and specific');
    instructions.push('Do NOT write a full email or paragraph');
    return instructions.join('\n- ');
  }

  // Heading specific
  if (cursorContext.isInHeading) {
    instructions.push('Generate a heading or title (one line only)');
    instructions.push('Be concise and descriptive');
    instructions.push('Do NOT write body text or paragraphs');
    return instructions.join('\n- ');
  }

  // List specific
  if (cursorContext.isInList) {
    if (cursorContext.listStyle === 'bullet') {
      instructions.push('Continue the bullet point list');
      instructions.push('Each item should be brief (one line)');
    } else if (cursorContext.listStyle === 'numbered') {
      instructions.push('Continue the numbered list');
      instructions.push('Each item should be brief (one line)');
    }
    return instructions.join('\n- ');
  }

  // Code block specific
  if (cursorContext.isInCodeBlock) {
    instructions.push('Generate code only (no explanations)');
    instructions.push('Match the coding style and language');
    return instructions.join('\n- ');
  }

  // Email specific
  if (docType.type === 'email') {
    if (cursorContext.isAfterSalutation) {
      instructions.push('Write the email body (2-3 paragraphs)');
    }
    if (cursorContext.isBeforeSignature) {
      instructions.push('Write a closing paragraph');
      instructions.push('Keep it brief and professional');
    }
  }

  // Letter specific
  if (docType.type === 'letter') {
    instructions.push('Match formal letter style');
    instructions.push('Use appropriate tone and structure');
  }

  // Article specific
  if (docType.type === 'article') {
    if (cursorContext.nearestHeading) {
      instructions.push(`Continue writing about: "${cursorContext.nearestHeading}"`);
    }
    instructions.push('Write in article/blog style');
    instructions.push('Use clear paragraphs');
  }

  return instructions.length > 0 ? instructions.join('\n- ') : '';
}
