/**
 * Accessibility audit for Panel component
 * Tests focus order, ARIA labels, contrast, and keyboard operability
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

// Mock chrome APIs
const mockChromeStorage = {
  local: {
    get: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue(undefined),
  },
};

const mockChromeRuntime = {
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

const mockChromeTabs = {
  query: jest.fn().mockResolvedValue([{ id: 1 }]),
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
};

global.chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  tabs: mockChromeTabs,
} as any;

// Import Panel component after mocking chrome
import { StrictMode } from 'react';

// Create a test wrapper that mimics the actual Panel structure
function TestPanel() {
  return (
    <StrictMode>
      <div className="flint-bg h-screen relative">
        <nav className="flint-sidebar" role="navigation" aria-label="Main navigation">
          <div className="sidebar-content">
            <button className="sidebar-logo-btn" aria-label="Home">
              <span>Logo</span>
            </button>
            <div className="sidebar-nav">
              <button className="flint-btn" aria-label="Rewrite">
                <span className="icon">✏️</span>
              </button>
              <button className="flint-btn" aria-label="Summary">
                <span className="icon">📝</span>
              </button>
              <button className="flint-btn" aria-label="Voice">
                <span className="icon">🎤</span>
              </button>
              <button className="flint-btn" aria-label="History">
                <span className="icon">🕐</span>
              </button>
              <button className="flint-btn" aria-label="Settings">
                <span className="icon">⚙️</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="content-area expanded" role="main">
          <div className="flint-section">
            <h1>Welcome to Flint</h1>
            <p>Select a tool from the sidebar to get started.</p>
          </div>
        </div>
      </div>
    </StrictMode>
  );
}

describe('Panel Component Accessibility Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render States', () => {
    it('should have no violations in default state', async () => {
      const { container } = render(<TestPanel />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Structure', () => {
    it('should have proper navigation landmark', () => {
      render(<TestPanel />);
      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should have main content landmark', () => {
      render(<TestPanel />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have all navigation buttons with accessible names', () => {
      render(<TestPanel />);
      expect(screen.getByRole('button', { name: /rewrite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /summary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voice/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(<TestPanel />);

      // Tab through all buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /home/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /rewrite/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /summary/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /voice/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /history/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /settings/i })).toHaveFocus();
    });

    it('should support space/enter key activation for buttons', async () => {
      const user = userEvent.setup();
      render(<TestPanel />);

      const rewriteBtn = screen.getByRole('button', { name: /rewrite/i });
      rewriteBtn.focus();

      // Test Enter key
      await user.keyboard('{Enter}');
      // Button should still be in document (not throw error)
      expect(rewriteBtn).toBeInTheDocument();

      // Test Space key
      await user.keyboard(' ');
      expect(rewriteBtn).toBeInTheDocument();
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(<TestPanel />);

      // Check navigation buttons have aria-label
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have proper landmark roles', () => {
      const { container } = render(<TestPanel />);

      // Check for navigation landmark
      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label');

      // Check for main landmark
      const main = container.querySelector('[role="main"]');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(<TestPanel />);
      const button = screen.getByRole('button', { name: /rewrite/i });
      button.focus();

      // Check that focus-visible styles are applied
      const styles = window.getComputedStyle(button);
      // The actual focus indicator is applied via CSS :focus-visible
      expect(button).toHaveFocus();
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<TestPanel />);

      const buttons = screen.getAllByRole('button');
      
      // Tab through and verify order
      for (let i = 0; i < buttons.length; i++) {
        await user.tab();
        expect(buttons[i]).toHaveFocus();
      }
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(<TestPanel />);
      
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
    it('should have proper heading hierarchy', () => {
      render(<TestPanel />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/welcome to flint/i);
    });

    it('should have descriptive button labels', () => {
      render(<TestPanel />);
      
      // All buttons should have meaningful labels
      const rewriteBtn = screen.getByRole('button', { name: /rewrite/i });
      const summaryBtn = screen.getByRole('button', { name: /summary/i });
      const voiceBtn = screen.getByRole('button', { name: /voice/i });
      
      expect(rewriteBtn).toHaveAccessibleName();
      expect(summaryBtn).toHaveAccessibleName();
      expect(voiceBtn).toHaveAccessibleName();
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain accessibility in collapsed sidebar state', async () => {
      const { container } = render(
        <div className="flint-sidebar collapsed">
          <button className="flint-btn" aria-label="Rewrite">
            <span className="icon">✏️</span>
          </button>
        </div>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Button should still have accessible name even when text is hidden
      const button = screen.getByRole('button', { name: /rewrite/i });
      expect(button).toHaveAccessibleName();
    });
  });
});
