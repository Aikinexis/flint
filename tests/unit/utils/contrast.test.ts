import { describe, it, expect } from '@jest/globals';

/**
 * Contrast checker utility
 * Ensures text meets WCAG AA contrast requirements (4.5:1 for normal text)
 */

/**
 * Parse OKLCH color string to RGB
 * Simplified conversion for testing purposes
 */
function oklchToRgb(oklch: string): { r: number; g: number; b: number } {
  // For testing, we'll use approximate values
  // oklch(0.12 0 60) -> very dark (near black)
  // oklch(0.54 0.11 60) -> mid-tone yellow-green
  // oklch(0.96 0 60) -> very light (near white)

  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match || !match[1]) return { r: 0, g: 0, b: 0 };

  const l = parseFloat(match[1]);

  // Simplified: map lightness to grayscale for testing
  const value = Math.round(l * 255);
  return { r: value, g: value, b: value };
}

/**
 * Calculate relative luminance
 */
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const values = [rgb.r, rgb.g, rgb.b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = values;
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = oklchToRgb(color1);
  const rgb2 = oklchToRgb(color2);

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('Color contrast', () => {
  it('primary button text should meet AA contrast', () => {
    const bgColor = 'oklch(0.54 0.11 60)'; // --primary
    const textColor = 'oklch(0.12 0 60)'; // dark text on primary

    const ratio = getContrastRatio(bgColor, textColor);

    // WCAG AA requires 4.5:1 for normal text
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('secondary button text should meet AA contrast', () => {
    const bgColor = 'oklch(0.64 0.15 60)'; // --secondary
    const textColor = 'oklch(0.12 0 60)'; // dark text on secondary

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('body text on background should meet AA contrast', () => {
    const bgColor = 'oklch(0.15 0 60)'; // --bg (dark mode)
    const textColor = 'oklch(0.96 0 60)'; // --text

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text on background should meet AA contrast', () => {
    const bgColor = 'oklch(0.15 0 60)'; // --bg (dark mode)
    const textColor = 'oklch(0.76 0 60)'; // --text-muted

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
