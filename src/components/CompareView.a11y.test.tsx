/**
 * CompareView Comprehensive Accessibility Audit
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import jestAxe from 'jest-axe';
import { CompareView } from './CompareView';

const { axe, toHaveNoViolations } = jestAxe;

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('CompareView Comprehensive Accessibility Audit', () => {
  const mockOnAccept = () => {};
  const mockOnReject = () => {};
  const originalText = 'This is the original text that needs to be rewritten.';
  const rewrittenText = 'This is the rewritten text with improved clarity.';

  describe('Initial Render States', () => {
    it('should have no violations in default state', async () => {
      const { container } = render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with long text', async () => {
      const longText = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const { container } = render(
        <CompareView
          originalText={longText}
          rewrittenText={longText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with empty text', async () => {
      const { container } = render(
        <CompareView
          originalText=""
          rewrittenText=""
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after clicking copy button', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: () => Promise.resolve(),
        },
        writable: true,
        configurable: true,
      });

      const { container } = render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy rewritten text/i });
      await user.click(copyButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in copy success state', async () => {
      const user = userEvent.setup();
      
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: () => Promise.resolve(),
        },
        writable: true,
        configurable: true,
      });

      const { container } = render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy rewritten text/i });
      await user.click(copyButton);

      // Wait for success state
      await screen.findByRole('button', { name: /copied to clipboard/i });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      // Tab through all buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /accept rewritten text/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /copy rewritten text/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /reject rewritten text/i })).toHaveFocus();
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      // Check buttons have accessible names
      expect(screen.getByRole('button', { name: /accept rewritten text and replace original/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy rewritten text to clipboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject rewritten text and return to rewrite panel/i })).toBeInTheDocument();

      // Check regions have accessible names
      expect(screen.getByRole('region', { name: /original text/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /rewritten text/i })).toBeInTheDocument();
    });

    it('should update aria-label when copy button state changes', async () => {
      const user = userEvent.setup();
      
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: () => Promise.resolve(),
        },
        writable: true,
        configurable: true,
      });

      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy rewritten text to clipboard/i });
      await user.click(copyButton);

      // Check updated aria-label
      expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept rewritten text/i });
      acceptButton.focus();

      // Check that button is focusable
      expect(acceptButton).toHaveFocus();
      expect(acceptButton).toHaveClass('flint-btn');
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      // Verify tab order: Accept -> Copy -> Reject
      await user.tab();
      const acceptButton = screen.getByRole('button', { name: /accept rewritten text/i });
      expect(acceptButton).toHaveFocus();

      await user.tab();
      const copyButton = screen.getByRole('button', { name: /copy rewritten text/i });
      expect(copyButton).toHaveFocus();

      await user.tab();
      const rejectButton = screen.getByRole('button', { name: /reject rewritten text/i });
      expect(rejectButton).toHaveFocus();
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      // axe will check color contrast automatically
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic heading for title', () => {
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const heading = screen.getByRole('heading', { name: /compare versions/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('should use proper button elements', () => {
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper region landmarks', () => {
      render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const regions = screen.getAllByRole('region');
      expect(regions).toHaveLength(2);
      expect(regions[0]).toHaveAttribute('aria-label', 'Original text');
      expect(regions[1]).toHaveAttribute('aria-label', 'Rewritten text');
    });

    it('should hide decorative SVG icons from screen readers', () => {
      const { container } = render(
        <CompareView
          originalText={originalText}
          rewrittenText={rewrittenText}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const svgs = container.querySelectorAll('svg');
      svgs.forEach(svg => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
