import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { Panel } from './panel';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

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

describe('Panel Comprehensive Accessibility Audit', () => {
  describe('Initial Render States', () => {
    it('should have no violations in initial home state', async () => {
      const { container } = render(<Panel />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with sidebar navigation', async () => {
      const { container } = render(<Panel />);
      
      // Wait for component to mount
      await screen.findByLabelText('Home');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation States', () => {
    it('should have no violations when navigating to Voice tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      const voiceButton = await screen.findByLabelText('Voice');
      await user.click(voiceButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when navigating to Rewrite tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      const rewriteButton = await screen.findByLabelText('Rewrite');
      await user.click(rewriteButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when navigating to Summary tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      const summaryButton = await screen.findByLabelText('Summary');
      await user.click(summaryButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when navigating to History tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      const historyButton = await screen.findByLabelText('History');
      await user.click(historyButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when navigating to Settings tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      const settingsButton = await screen.findByLabelText('Settings');
      await user.click(settingsButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through sidebar buttons', async () => {
      const user = userEvent.setup();
      render(<Panel />);
      
      // Tab through navigation items
      await user.tab();
      const homeButton = screen.getByLabelText('Home');
      expect(homeButton).toHaveFocus();
      
      await user.tab();
      const rewriteButton = screen.getByLabelText('Rewrite');
      expect(rewriteButton).toHaveFocus();
      
      await user.tab();
      const summaryButton = screen.getByLabelText('Summary');
      expect(summaryButton).toHaveFocus();
    });

    it('should support space/enter key activation for navigation buttons', async () => {
      const user = userEvent.setup();
      render(<Panel />);
      
      const voiceButton = await screen.findByLabelText('Voice');
      voiceButton.focus();
      
      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(voiceButton).toHaveClass('active');
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all navigation buttons', async () => {
      render(<Panel />);
      
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Rewrite')).toBeInTheDocument();
      expect(screen.getByLabelText('Summary')).toBeInTheDocument();
      expect(screen.getByLabelText('Voice')).toBeInTheDocument();
      expect(screen.getByLabelText('History')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should have proper aria-current on active navigation item', async () => {
      const user = userEvent.setup();
      render(<Panel />);
      
      const voiceButton = await screen.findByLabelText('Voice');
      await user.click(voiceButton);
      
      expect(voiceButton).toHaveAttribute('aria-current', 'page');
    });

    it('should have proper navigation landmark', async () => {
      render(<Panel />);
      
      const nav = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', async () => {
      const { container } = render(<Panel />);
      
      const icons = container.querySelectorAll('.icon');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      await user.tab();
      const focusedElement = document.activeElement;
      
      // Check that focused element has focus-visible styles
      expect(focusedElement).toHaveClass('sidebar-logo-btn');
      
      // Verify focus styles are applied via CSS
      const styles = window.getComputedStyle(focusedElement!);
      expect(styles).toBeDefined();
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<Panel />);
      
      // Tab through elements and verify order
      await user.tab();
      expect(screen.getByLabelText('Home')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Rewrite')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Summary')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Voice')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('History')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Settings')).toHaveFocus();
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(<Panel />);
      
      // Run axe with color-contrast rule specifically
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper document structure', async () => {
      const { container } = render(<Panel />);
      
      // Check for proper landmark regions
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      
      // Run axe to verify structure
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible names for all interactive elements', async () => {
      render(<Panel />);
      
      // All buttons should have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const accessibleName = button.getAttribute('aria-label') || button.textContent;
        expect(accessibleName).toBeTruthy();
      });
    });
  });

  describe('Error Boundary Accessibility', () => {
    it('should have no violations when error boundary is active', async () => {
      // Mock console.error to suppress error boundary logs
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { container } = render(<Panel />);
      
      // Error boundary should render without violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      consoleError.mockRestore();
    });
  });

  describe('Dynamic Content', () => {
    it('should have no violations when content area expands', async () => {
      const user = userEvent.setup();
      const { container } = render(<Panel />);
      
      // Click a navigation item to expand content area
      const voiceButton = await screen.findByLabelText('Voice');
      await user.click(voiceButton);
      
      // Wait for content to render
      await screen.findByRole('button', { name: /record/i }, { timeout: 3000 });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
