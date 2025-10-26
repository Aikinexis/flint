/**
 * Comprehensive accessibility audit for SummaryPanel component
 * Tests various states including error, processing, and result display
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import jestAxe from 'jest-axe';
import { SummaryPanel } from './SummaryPanel';

const { axe, toHaveNoViolations } = jestAxe;

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('SummaryPanel Comprehensive Accessibility Audit', () => {
  beforeEach(() => {
    // Mock chrome API
    global.chrome = {
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(undefined),
        },
      },
      runtime: {
        sendMessage: () => Promise.resolve({}),
      },
    } as any;
  });

  describe('Initial Render States', () => {
    it('should have no violations in empty state', async () => {
      const { container } = render(<SummaryPanel />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with initial text', async () => {
      const { container } = render(
        <SummaryPanel initialText="Sample text to summarize for accessibility testing" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with pinned notes', async () => {
      const pinnedNotes = [
        {
          id: '1',
          title: 'Important Note',
          content: 'This is important context',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          title: 'Another Note',
          content: 'More context here',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const { container } = render(<SummaryPanel pinnedNotes={pinnedNotes} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after mode selection', async () => {
      const user = userEvent.setup();
      const { container } = render(<SummaryPanel />);

      // Click paragraph mode button
      const paragraphButton = screen.getByRole('radio', { name: /paragraph/i });
      await user.click(paragraphButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations after reading level change', async () => {
      const user = userEvent.setup();
      const { container } = render(<SummaryPanel />);

      // Change reading level
      const select = screen.getByLabelText(/reading level/i);
      await user.selectOptions(select, 'college');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with text input', async () => {
      const user = userEvent.setup();
      const { container } = render(<SummaryPanel />);

      // Type in textarea
      const textarea = screen.getByPlaceholderText(/paste or type text/i);
      await user.type(textarea, 'This is test text for summarization');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(<SummaryPanel initialText="Test text" />);

      // Tab through elements
      await user.tab(); // textarea
      expect(screen.getByPlaceholderText(/paste or type text/i)).toHaveFocus();

      await user.tab(); // bullets button
      expect(screen.getByRole('radio', { name: /bullets/i })).toHaveFocus();

      await user.tab(); // paragraph button
      expect(screen.getByRole('radio', { name: /paragraph/i })).toHaveFocus();

      await user.tab(); // outline button
      expect(screen.getByRole('radio', { name: /outline/i })).toHaveFocus();

      await user.tab(); // reading level select
      expect(screen.getByLabelText(/reading level/i)).toHaveFocus();

      await user.tab(); // summarize button
      expect(screen.getByRole('button', { name: /summarize/i })).toHaveFocus();

      await user.tab(); // clear button
      expect(screen.getByRole('button', { name: /clear/i })).toHaveFocus();
    });

    it('should support space/enter key activation for buttons', async () => {
      const user = userEvent.setup();
      const onComplete = () => {};
      render(<SummaryPanel onSummaryComplete={onComplete} />);

      // Focus clear button and activate with space
      const clearButton = screen.getByRole('button', { name: /clear/i });
      clearButton.focus();
      await user.keyboard(' ');

      // Should not throw error
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(<SummaryPanel />);

      // Check textarea has aria-label
      expect(screen.getByLabelText(/text to summarize/i)).toBeInTheDocument();

      // Check mode buttons have proper roles and labels
      expect(screen.getByRole('radiogroup', { name: /summary format/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /bullets format/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /paragraph format/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /outline format/i })).toBeInTheDocument();

      // Check reading level select has label
      expect(screen.getByLabelText(/reading level/i)).toBeInTheDocument();

      // Check buttons have aria-labels
      expect(screen.getByRole('button', { name: /summarize text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('should have proper aria-checked on selected mode', () => {
      render(<SummaryPanel />);

      const bulletsButton = screen.getByRole('radio', { name: /bullets format/i });
      expect(bulletsButton).toHaveAttribute('aria-checked', 'true');

      const paragraphButton = screen.getByRole('radio', { name: /paragraph format/i });
      expect(paragraphButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<SummaryPanel />);

      // Tab to first button
      await user.tab();
      await user.tab();

      const bulletsButton = screen.getByRole('radio', { name: /bullets format/i });
      expect(bulletsButton).toHaveFocus();

      // Check that focus-visible styles would apply (tested via CSS)
      expect(bulletsButton).toHaveClass('flint-btn');
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<SummaryPanel />);

      const elements = [
        screen.getByPlaceholderText(/paste or type text/i),
        screen.getByRole('radio', { name: /bullets format/i }),
        screen.getByRole('radio', { name: /paragraph format/i }),
        screen.getByRole('radio', { name: /outline format/i }),
        screen.getByLabelText(/reading level/i),
        screen.getByRole('button', { name: /summarize text/i }),
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
      const { container } = render(<SummaryPanel />);

      // axe will check color contrast automatically
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
          title: 'Note',
          content: 'Content',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      render(<SummaryPanel pinnedNotes={pinnedNotes} />);

      // Check for live region on pinned notes indicator
      const indicator = screen.getByText(/1 pinned note will be included/i);
      expect(indicator.closest('[role="status"]')).toBeInTheDocument();
      expect(indicator.closest('[aria-live="polite"]')).toBeInTheDocument();
    });
  });
});
