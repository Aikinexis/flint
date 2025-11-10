import { test, expect } from '@playwright/test';

/**
 * E2E tests for core Flint workflows
 * Tests voice-to-draft, summarize, and rewrite flows with mocked AI
 */

test.describe('Core Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Load the extension panel
    await page.goto('http://localhost:5173/src/panel/index.html');
    
    // Mock AI APIs to avoid requiring actual Chrome AI
    await page.addInitScript(() => {
      // Mock Summarizer API
      (window as any).Summarizer = {
        availability: async () => 'available',
        create: async () => ({
          summarize: async (text: string) => {
            return `• Key point from: ${text.substring(0, 30)}...\n• Summary point two\n• Summary point three`;
          }
        })
      };
      
      // Mock Rewriter API
      (window as any).Rewriter = {
        availability: async () => 'available',
        create: async () => ({
          rewrite: async (text: string) => {
            return `Rewritten: ${text.replace(/\s+/g, ' ').trim()}`;
          }
        })
      };
      
      // Mock Writer API for generate
      (window as any).Writer = {
        availability: async () => 'available',
        create: async () => ({
          write: async (prompt: string) => {
            return `Generated text based on: ${prompt.substring(0, 50)}...`;
          }
        })
      };
      
      // Mock SpeechRecognition for voice
      const MockSpeechRecognition = class {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        onresult: any = null;
        onend: any = null;
        onerror: any = null;
        
        start() {
          // Simulate speech recognition with a delay
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [[{ transcript: 'Hello world from voice', confidence: 0.95, isFinal: true }]],
                resultIndex: 0
              });
            }
            if (this.onend) {
              this.onend();
            }
          }, 100);
        }
        
        stop() {
          if (this.onend) {
            this.onend();
          }
        }
      };
      
      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });
  });

  test('Flow 1: Voice to draft with mocked speech', async ({ page }) => {
    // Navigate to Generate tab (voice is now part of generate)
    await page.getByRole('button', { name: 'Generate' }).click();
    
    // Wait for tab to be active
    await page.waitForTimeout(200);
    
    // Find and click the voice/record button
    const voiceButton = page.getByRole('button', { name: /voice|record|microphone/i }).first();
    await expect(voiceButton).toBeVisible();
    await voiceButton.click();
    
    // Wait for speech recognition to complete (mocked)
    await page.waitForTimeout(300);
    
    // Check that transcript appears in the editor
    const editor = page.locator('textarea').first();
    const editorContent = await editor.inputValue();
    
    // Verify the mocked transcript was inserted
    expect(editorContent).toContain('Hello world from voice');
  });

  test('Flow 2: Summarize selection and accept', async ({ page }) => {
    // Navigate to Summarize tab
    await page.getByRole('button', { name: 'Summary' }).click();
    
    // Wait for tab to be active
    await page.waitForTimeout(200);
    
    // Find the editor textarea
    const editor = page.locator('textarea').first();
    await expect(editor).toBeVisible();
    
    // Type some text to summarize
    const testText = 'This is a long paragraph that needs to be summarized. It contains multiple sentences with various information. The goal is to extract the key points from this text.';
    await editor.fill(testText);
    
    // Select all the text
    await editor.focus();
    await page.keyboard.press('Control+A');
    
    // Wait a moment for selection to register
    await page.waitForTimeout(100);
    
    // Find and click the Summarize button
    const summarizeButton = page.getByRole('button', { name: /summarize/i }).first();
    await expect(summarizeButton).toBeVisible();
    await summarizeButton.click();
    
    // Wait for AI operation to complete
    await page.waitForTimeout(500);
    
    // Check that summary appears in the editor (replaces original text)
    const newContent = await editor.inputValue();
    expect(newContent).toContain('Key point from');
    expect(newContent).toContain('Summary point');
  });

  test('Flow 3: Rewrite selection and replace in place', async ({ page }) => {
    // Navigate to Rewrite tab
    await page.getByRole('button', { name: 'Rewrite' }).click();
    
    // Wait for tab to be active
    await page.waitForTimeout(200);
    
    // Find the editor textarea
    const editor = page.locator('textarea').first();
    await expect(editor).toBeVisible();
    
    // Type some text to rewrite
    const testText = 'This text needs to be rewritten in a different style.';
    await editor.fill(testText);
    
    // Select all the text
    await editor.focus();
    await page.keyboard.press('Control+A');
    
    // Wait a moment for selection to register
    await page.waitForTimeout(100);
    
    // Find and click the Rewrite button
    const rewriteButton = page.getByRole('button', { name: /rewrite/i }).first();
    await expect(rewriteButton).toBeVisible();
    await rewriteButton.click();
    
    // Wait for AI operation to complete
    await page.waitForTimeout(500);
    
    // Check that rewritten text appears in the editor (replaces original)
    const newContent = await editor.inputValue();
    expect(newContent).toContain('Rewritten:');
    expect(newContent).toContain('different style');
  });
});
