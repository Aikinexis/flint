/**
 * AI Output Cleaning Utility
 * Removes leaked instructions and meta-commentary from AI responses
 */

/**
 * Patterns that indicate leaked instructions
 */
const INSTRUCTION_PATTERNS = [
  // All-caps instruction headers
  /^(CRITICAL|RULE|INSTRUCTION|NOTE|WARNING|IMPORTANT):.*?\n/gim,

  // Negative instructions
  /^(Do NOT|NEVER|ABSOLUTELY|DON'T).*?\n/gim,

  // Rule lists
  /^RULES:\s*\n(\d+\..*?\n)+/gim,

  // Output directives
  /^Output (ONLY|only).*?\n/gim,

  // Meta-commentary
  /^Here's (the|your|a).*?:\s*\n/gim,
  /^Based on (the|your).*?:\s*\n/gim,
  /^I (will|have|can).*?:\s*\n/gim,

  // Square bracket placeholders (common AI mistake)
  /\[Name\]|\[Date\]|\[Company\]|\[Boss's Name\]|\[Your Name\]/g,

  // Instruction remnants at start
  /^(Task|Instruction|Edit|Rewrite):.*?\n/gim,
];

/**
 * Cleans AI output by removing leaked instructions and meta-commentary
 * @param text - Raw AI output
 * @returns Cleaned text
 */
export function cleanAIOutput(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Apply all cleaning patterns
  for (const pattern of INSTRUCTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // If we removed too much (>50% of original), return original
  // This prevents over-aggressive cleaning
  if (cleaned.length < text.length * 0.5) {
    console.warn('[cleanAIOutput] Cleaning removed >50% of text, returning original');
    return text;
  }

  return cleaned;
}

/**
 * Detects if AI output contains leaked instructions
 * @param text - AI output to check
 * @returns True if leakage detected
 */
export function detectInstructionLeakage(text: string): boolean {
  if (!text) return false;

  // Check for common instruction patterns
  const leakageIndicators = [
    /CRITICAL/i,
    /DO NOT/i,
    /RULES:/i,
    /Output ONLY/i,
    /ABSOLUTELY/i,
    /NEVER USE/i,
    /\[Name\]|\[Date\]|\[Company\]/,
  ];

  return leakageIndicators.some((pattern) => pattern.test(text));
}

/**
 * Cleans AI output with logging for debugging
 * @param text - Raw AI output
 * @param context - Context for logging (e.g., 'generate', 'rewrite')
 * @returns Cleaned text
 */
export function cleanAIOutputWithLogging(text: string, context: string = 'unknown'): string {
  const hasLeakage = detectInstructionLeakage(text);

  if (hasLeakage) {
    console.warn(`[cleanAIOutput] Instruction leakage detected in ${context}:`, text.slice(0, 100));
    const cleaned = cleanAIOutput(text);
    console.log(`[cleanAIOutput] Cleaned output (${context}):`, cleaned.slice(0, 100));
    return cleaned;
  }

  return text;
}

/**
 * Removes common AI meta-commentary phrases
 * @param text - AI output
 * @returns Text without meta-commentary
 */
export function removeMetaCommentary(text: string): string {
  if (!text) return text;

  const metaPatterns = [
    /^Here's.*?:\s*/i,
    /^Here is.*?:\s*/i,
    /^I've.*?:\s*/i,
    /^I have.*?:\s*/i,
    /^Based on.*?:\s*/i,
    /^According to.*?:\s*/i,
    /^As requested.*?:\s*/i,
    /^Sure,?\s*/i,
    /^Certainly,?\s*/i,
    /^Of course,?\s*/i,
  ];

  let cleaned = text;
  for (const pattern of metaPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

/**
 * Comprehensive cleaning: instructions + meta-commentary
 * @param text - Raw AI output
 * @returns Fully cleaned text
 */
export function cleanAIOutputComprehensive(text: string): string {
  let cleaned = text;

  // Step 1: Remove instructions
  cleaned = cleanAIOutput(cleaned);

  // Step 2: Remove meta-commentary
  cleaned = removeMetaCommentary(cleaned);

  return cleaned;
}
