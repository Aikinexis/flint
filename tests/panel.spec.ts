import { test, expect } from '@playwright/test';

/**
 * E2E tests for panel navigation and keyboard accessibility
 */
test.describe('Panel UI', () => {
  test.beforeEach(async ({ page }) => {
    // Load the extension panel
    await page.goto('http://localhost:5173/src/panel/index.html');
  });

  test('should open panel and display tabs', async ({ page }) => {
    // Check that all tabs are visible
    await expect(page.getByRole('button', { name: 'Voice' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rewrite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });

  test('should navigate tabs by keyboard', async ({ page }) => {
    // Focus first tab
    await page.keyboard.press('Tab');

    // Check Voice tab is focused
    const voiceTab = page.getByRole('button', { name: 'Voice' });
    await expect(voiceTab).toBeFocused();

    // Navigate to next tab
    await page.keyboard.press('Tab');
    const rewriteTab = page.getByRole('button', { name: 'Rewrite' });
    await expect(rewriteTab).toBeFocused();

    // Activate tab with Enter
    await page.keyboard.press('Enter');
    await expect(rewriteTab).toHaveClass(/secondary/);
  });

  test('should show visible focus on buttons', async ({ page }) => {
    // Click Voice tab to ensure it's active
    await page.getByRole('button', { name: 'Voice' }).click();

    // Tab to Record button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const recordButton = page.getByRole('button', { name: /Record/i });

    // Check that focus is visible (shadow-focus should be applied)
    const boxShadow = await recordButton.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });

    expect(boxShadow).not.toBe('none');
  });

  test('should show visible focus on inputs', async ({ page }) => {
    // Navigate to Voice tab
    await page.getByRole('button', { name: 'Voice' }).click();

    // Find and focus textarea
    const textarea = page.locator('textarea').first();
    await textarea.focus();

    // Check focus shadow is applied
    const boxShadow = await textarea.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });

    expect(boxShadow).not.toBe('none');
  });

  test('should switch between tabs', async ({ page }) => {
    // Click Rewrite tab
    await page.getByRole('button', { name: 'Rewrite' }).click();

    // Check Rewrite content is visible
    await expect(page.getByText('Rewrite text')).toBeVisible();

    // Click Summary tab
    await page.getByRole('button', { name: 'Summary' }).click();

    // Check Summary content is visible
    await expect(page.getByText('Summarize text')).toBeVisible();
  });

  test('should toggle theme in settings', async ({ page }) => {
    // Navigate to Settings
    await page.getByRole('button', { name: 'Settings' }).click();

    // Find theme toggle button
    const themeButton = page.getByRole('button', { name: /Light|Dark/i });
    await expect(themeButton).toBeVisible();

    // Click to toggle theme
    await themeButton.click();

    // Check that root element class changed
    const hasLightClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('light');
    });

    expect(hasLightClass).toBe(true);
  });
});

test.describe('MiniBar', () => {
  test('should have correct focus order', async ({ page }) => {
    // Create a test page with minibar
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="/src/styles/index.css">
        </head>
        <body>
          <div class="flint-minibar">
            <button class="flint-icon-btn primary" aria-label="Record voice"></button>
            <button class="flint-icon-btn primary" aria-label="Summarize selection"></button>
            <button class="flint-icon-btn primary" aria-label="Rewrite selection"></button>
          </div>
        </body>
      </html>
    `);

    // Tab through buttons
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Record voice' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Summarize selection' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Rewrite selection' })).toBeFocused();
  });
});
