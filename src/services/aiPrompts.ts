/**
 * AI Prompt Templates
 * Clean, natural prompts that minimize instruction leakage
 */

/**
 * Builds a clean rewrite prompt for Writer API
 */
export function buildRewritePrompt(text: string, instruction: string): string {
  return `Edit this text: ${instruction}

${text}`;
}

/**
 * Builds a clean rewrite prompt for Prompt API fallback
 */
export function buildRewriteFallbackPrompt(text: string, instruction: string): string {
  return `${instruction}

Text to edit:
"${text}"

Edited version:`;
}

/**
 * Builds a clean generate prompt with context
 */
export function buildGeneratePromptWithContext(
  userPrompt: string,
  beforeContext: string,
  afterContext: string,
  dateTime: string,
  projectTitle?: string,
  pinnedNotes?: string[],
  smartInstructions?: string
): string {
  let prompt = '';

  // Add date/time naturally
  if (dateTime) {
    prompt += `${dateTime}\n\n`;
  }

  // Add project context if available
  if (projectTitle) {
    prompt += `Document: "${projectTitle}"\n\n`;
  }

  // Add pinned notes as natural guidance
  if (pinnedNotes && pinnedNotes.length > 0) {
    prompt += `Writing guidelines:\n${pinnedNotes.map((note) => `- ${note}`).join('\n')}\n\n`;
  }

  // Add document context
  if (beforeContext || afterContext) {
    prompt += `Context:\n`;
    if (beforeContext) {
      prompt += `...${beforeContext}\n`;
    }
    prompt += `[INSERT HERE]\n`;
    if (afterContext) {
      prompt += `${afterContext}...\n`;
    }
    prompt += `\n`;
  }

  // Add smart instructions if provided
  if (smartInstructions) {
    prompt += `Note: ${smartInstructions}\n\n`;
  }

  // Add user's instruction
  prompt += `Task: ${userPrompt}\n\n`;
  prompt += `Write the text to insert:`;

  return prompt;
}

/**
 * Builds a clean standalone generate prompt
 */
export function buildGeneratePromptStandalone(
  userPrompt: string,
  dateTime: string,
  projectTitle?: string,
  pinnedNotes?: string[],
  smartInstructions?: string
): string {
  let prompt = '';

  // Add date/time naturally
  if (dateTime) {
    prompt += `${dateTime}\n\n`;
  }

  // Add project context if available
  if (projectTitle) {
    prompt += `Document: "${projectTitle}"\n\n`;
  }

  // Add pinned notes as natural guidance
  if (pinnedNotes && pinnedNotes.length > 0) {
    prompt += `Writing guidelines:\n${pinnedNotes.map((note) => `- ${note}`).join('\n')}\n\n`;
  }

  // Add smart instructions if provided
  if (smartInstructions) {
    prompt += `Note: ${smartInstructions}\n\n`;
  }

  // Add user's instruction
  prompt += `Task: ${userPrompt}\n\n`;
  prompt += `Write:`;

  return prompt;
}

/**
 * Builds a clean generate prompt for enhanced context
 */
export function buildEnhancedGeneratePrompt(
  userPrompt: string,
  formattedContext: string,
  nearestHeading: string | null,
  dateTime: string,
  projectTitle?: string
): string {
  let prompt = '';

  // Add date/time naturally
  if (dateTime) {
    prompt += `${dateTime}\n\n`;
  }

  // Add project context if available
  if (projectTitle) {
    prompt += `Document: "${projectTitle}"\n\n`;
  }

  // Add section context if available
  if (nearestHeading) {
    prompt += `Current section: ${nearestHeading}\n\n`;
  }

  // Add formatted context
  if (formattedContext) {
    prompt += `${formattedContext}\n\n`;
  }

  // Add user's instruction
  prompt += `Task: ${userPrompt}\n\n`;
  prompt += `Write:`;

  return prompt;
}
