/**
 * Tests for tab switching behavior in panel.tsx
 * Specifically tests cursor position preservation when switching to Generate tab
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Panel } from './panel';

// Mock chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ 'flint.lastTab': 'home' }),
      set: jest.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
} as any;

describe('Panel Tab Switching - Cursor Position Preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Generate tab cursor behavior', () => {
    it('should preserve cursor position when switching to Generate tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab first
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea to be available
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type some content
      await user.type(textarea, 'Hello world');
      
      // Position cursor in the middle (after "Hello ")
      textarea.setSelectionRange(6, 6);
      expect(textarea.selectionStart).toBe(6);
      expect(textarea.selectionEnd).toBe(6);

      // Switch to another tab
      const rewriteButton = await screen.findByLabelText('Rewrite');
      await user.click(rewriteButton);

      // Switch back to Generate tab
      await user.click(generateButton);

      // Wait for focus to be restored
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });

      // Cursor position should be preserved (still at position 6)
      expect(textarea.selectionStart).toBe(6);
      expect(textarea.selectionEnd).toBe(6);
    });

    it('should focus textarea when switching to Generate tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea to be available and focused
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });
    });

    it('should not move cursor to end when switching to Generate tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type content
      await user.type(textarea, 'Test content here');
      
      // Position cursor at the beginning
      textarea.setSelectionRange(0, 0);
      expect(textarea.selectionStart).toBe(0);

      // Switch to Rewrite tab
      const rewriteButton = await screen.findByLabelText('Rewrite');
      await user.click(rewriteButton);

      // Switch back to Generate tab
      await user.click(generateButton);

      // Wait for focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });

      // Cursor should still be at the beginning, NOT at the end
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(0);
      
      // Verify it's not at the end
      const contentLength = textarea.value.length;
      expect(textarea.selectionStart).not.toBe(contentLength);
    });

    it('should preserve text selection when switching to Generate tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type content
      await user.type(textarea, 'Select this text');
      
      // Select "this" (positions 7-11)
      textarea.setSelectionRange(7, 11);
      expect(textarea.selectionStart).toBe(7);
      expect(textarea.selectionEnd).toBe(11);

      // Switch to Summary tab
      const summaryButton = await screen.findByLabelText('Summary');
      await user.click(summaryButton);

      // Switch back to Generate tab
      await user.click(generateButton);

      // Wait for focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });

      // Selection should be preserved
      expect(textarea.selectionStart).toBe(7);
      expect(textarea.selectionEnd).toBe(11);
      expect(textarea.value.substring(7, 11)).toBe('this');
    });
  });

  describe('Other tabs cursor behavior', () => {
    it('should not affect cursor position when switching to Rewrite tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab first
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type and position cursor
      await user.type(textarea, 'Test content');
      textarea.setSelectionRange(5, 5);

      // Switch to Rewrite tab
      const rewriteButton = await screen.findByLabelText('Rewrite');
      await user.click(rewriteButton);

      // Cursor position should remain unchanged in the textarea
      // (even though Rewrite tab is now active)
      expect(textarea.selectionStart).toBe(5);
      expect(textarea.selectionEnd).toBe(5);
    });

    it('should not affect cursor position when switching to Summary tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab first
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type and position cursor
      await user.type(textarea, 'Summary test');
      textarea.setSelectionRange(8, 8);

      // Switch to Summary tab
      const summaryButton = await screen.findByLabelText('Summary');
      await user.click(summaryButton);

      // Cursor position should remain unchanged
      expect(textarea.selectionStart).toBe(8);
      expect(textarea.selectionEnd).toBe(8);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content when switching to Generate tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Ensure content is empty
      expect(textarea.value).toBe('');

      // Switch to another tab and back
      const rewriteButton = await screen.findByLabelText('Rewrite');
      await user.click(rewriteButton);
      await user.click(generateButton);

      // Wait for focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });

      // Cursor should be at position 0 (not moved to end of empty string)
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(0);
    });

    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for textarea
      await waitFor(() => {
        const textarea = container.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      
      // Type content and set cursor position
      await user.type(textarea, 'Rapid switching test');
      textarea.setSelectionRange(6, 6);

      // Rapidly switch between tabs
      const rewriteButton = await screen.findByLabelText('Rewrite');
      const summaryButton = await screen.findByLabelText('Summary');
      
      await user.click(rewriteButton);
      await user.click(summaryButton);
      await user.click(generateButton);

      // Wait for focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });

      // Cursor position should still be preserved
      expect(textarea.selectionStart).toBe(6);
      expect(textarea.selectionEnd).toBe(6);
    });

    it('should handle switching to Generate tab when textarea is not yet mounted', async () => {
      const user = userEvent.setup();
      render(<Panel />);

      // Click Generate button immediately (before textarea might be ready)
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Should not throw error, and textarea should eventually be focused
      await waitFor(() => {
        const textarea = document.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });
    });
  });

  describe('Console logging', () => {
    it('should log cursor position preservation message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const user = userEvent.setup();
      render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait for the log message
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Panel] Switched to Generate - cursor position preserved')
        );
      }, { timeout: 200 });

      consoleSpy.mockRestore();
    });

    it('should not log end position message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const user = userEvent.setup();
      render(<Panel />);

      // Navigate to Generate tab
      const generateButton = await screen.findByLabelText('Generate');
      await user.click(generateButton);

      // Wait a bit for any potential logs
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      }, { timeout: 200 });

      // Should NOT contain the old "cursor at end" message
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      const hasOldMessage = calls.some(call => 
        call.includes('cursor at end')
      );
      expect(hasOldMessage).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
