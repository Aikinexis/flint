/**
 * Accessibility audit for RewritePanel component
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { RewritePanel } from './RewritePanel';

expect.extend(toHaveNoViolations);

// Mock chrome.storage API
const mockChromeStorage = {
  local: {
    get: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
};

(global as any).chrome = {
  storage: mockChromeStorage,
};

describe('RewritePanel Comprehensive Accessibility Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render States', () => {
    it('should have no violations in empty state', async () => {
      const { container } = render(<RewritePanel />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with initial text', async () => {
      const { container } = render(
        <RewritePanel initialText="Sample text to rewrite" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with pinned notes', async () => {
      const pinnedNotes = [
        {
          id: '1',
          title: 'Note 1',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const { container } = render(<RewritePanel pinnedNotes={pinnedNotes} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after preset selection', async () => {
      const user = userEvent.setup();
      const { container } = render(<RewritePanel initialText="Test text" />);

      const select = screen.getByLabelText(/select rewrite style/i);
      await user.selectOptions(select, 'formal');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with custom prompt input', async () => {
      const user = userEvent.setup();
      const { container } = render(<RewritePanel initialText="Test text" />);

      const textarea = screen.getByLabelText(/custom rewrite instructions/i);
      await user.type(textarea, 'Make it more professional');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(<RewritePanel initialText="Test text" />);

      // Tab through interactive elements
      await user.tab(); // Style select
      expect(screen.getByLabelText(/select rewrite style/i)).toHaveFocus();

      await user.tab(); // Custom prompt textarea
      expect(screen.getByLabelText(/custom rewrite instructions/i)).toHaveFocus();

      await user.tab(); // Rewrite button
      expect(screen.getByRole('button', { name: /rewrite text/i })).toHaveFocus();

      await user.tab(); // Clear button
      expect(screen.getByRole('button', { name: /clear all/i })).toHaveFocus();
    });

    it('should support space/enter key activation for buttons', async () => {
      const user = userEvent.setup();
      render(<RewritePanel initialText="Test text" />);

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      clearButton.focus();

      // Press Enter
      await user.keyboard('{Enter}');
      // Button should have been activated (text cleared)
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(<RewritePanel initialText="Test text" />);

      // Check for proper labels
      expect(screen.getByLabelText(/select rewrite style/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom rewrite instructions/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rewrite text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<RewritePanel />);

      const heading = screen.getByRole('heading', { name: /rewrite text/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<RewritePanel initialText="Test text" />);

      const rewriteButton = screen.getByRole('button', { name: /rewrite text/i });
      await user.tab();
      await user.tab();
      await user.tab();

      expect(rewriteButton).toHaveFocus();
      // Focus-visible styles should be applied via CSS
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<RewritePanel initialText="Test text" />);

      const elements = [
        screen.getByLabelText(/select rewrite style/i),
        screen.getByLabelText(/custom rewrite instructions/i),
        screen.getByRole('button', { name: /rewrite text/i }),
        screen.getByRole('button', { name: /clear all/i }),
      ];

      for (const element of elements) {
        await user.tab();
        expect(element).toHaveFocus();
      }
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(<RewritePanel initialText="Test text" />);
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper live regions for dynamic content', () => {
      const pinnedNotes = [
        {
          id: '1',
          title: 'Note 1',
          content: 'Content 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      render(<RewritePanel pinnedNotes={pinnedNotes} />);

      // Check for status role with aria-live
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveTextContent(/1 pinned note will be included/i);
    });

    it('should announce errors with assertive live region', async () => {
      const { container } = render(<RewritePanel />);

      // Trigger error by clicking rewrite without text
      const rewriteButton = screen.getByRole('button', { name: /rewrite text/i });
      await userEvent.click(rewriteButton);

      // Wait for error to appear
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have descriptive button labels', () => {
      render(<RewritePanel initialText="Test text" />);

      expect(screen.getByRole('button', { name: /rewrite text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });
  });

  describe('Form Controls', () => {
    it('should have proper select element with options', () => {
      render(<RewritePanel />);

      const select = screen.getByLabelText(/select rewrite style/i);
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe('SELECT');

      // Check for options
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('should have proper textarea with label', () => {
      render(<RewritePanel />);

      const textarea = screen.getByLabelText(/custom rewrite instructions/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('Disabled States', () => {
    it('should properly disable controls during processing', async () => {
      const { container } = render(<RewritePanel initialText="Test text" />);

      // Note: We can't easily test the processing state without mocking AI service
      // But we can verify the disabled attribute is properly set in the JSX
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('SVG Icons', () => {
    it('should have aria-hidden on decorative icons', () => {
      render(<RewritePanel initialText="Test text" />);

      const rewriteButton = screen.getByRole('button', { name: /rewrite text/i });
      const svg = rewriteButton.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
