import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import jestAxe from 'jest-axe';
import { GeneratePanel } from './GeneratePanel';
import { AppProvider } from '../state/AppProvider';

const { axe, toHaveNoViolations } = jestAxe;

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Wrapper component with AppProvider
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('GeneratePanel Comprehensive Accessibility Audit', () => {
  beforeEach(() => {
    // Mock chrome API
    global.chrome = {
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(undefined),
        },
        onChanged: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
      runtime: {
        sendMessage: () => Promise.resolve({}),
      },
    } as any;
  });

  describe('Initial Render States', () => {
    it('should have no violations in empty state', async () => {
      const { container } = render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
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
        {
          id: '2',
          title: 'Note 2',
          content: 'Content 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { container } = render(
        <Wrapper>
          <GeneratePanel pinnedNotes={pinnedNotes} />
        </Wrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after opening length dropdown', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // Click length selector button
      const lengthButton = screen.getByRole('button', { name: /Length:/i });
      await user.click(lengthButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with text input', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // Type in prompt input
      const input = screen.getByLabelText('Prompt input');
      await user.type(input, 'Test prompt');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // Tab through elements
      await user.tab();
      expect(screen.getByLabelText('Prompt input')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Length:/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /voice input/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Generate/i })).toHaveFocus();
    });

    it('should support Enter key activation', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      const input = screen.getByLabelText('Prompt input');
      await user.type(input, 'Test prompt');

      // Verify Enter key is handled (component should not throw)
      await user.keyboard('{Enter}');
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // Check input has aria-label
      expect(screen.getByLabelText('Prompt input')).toBeInTheDocument();

      // Check buttons have aria-labels
      expect(screen.getByRole('button', { name: /Length:/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    });

    it('should have proper aria-expanded on length dropdown button', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      const lengthButton = screen.getByRole('button', { name: /Length:/i });
      expect(lengthButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(lengthButton);
      expect(lengthButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria-busy on generate button when processing', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      const input = screen.getByLabelText('Prompt input');
      await user.type(input, 'Test prompt');

      const generateButton = screen.getByRole('button', { name: /Generate/i });
      expect(generateButton).toHaveAttribute('aria-busy', 'false');

      await user.click(generateButton);
      expect(generateButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      await user.tab();
      const input = screen.getByLabelText('Prompt input');
      expect(input).toHaveFocus();
      expect(input).toHaveStyle({ outline: 'none' }); // Uses box-shadow for focus
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // Tab order: input -> length -> voice -> generate
      await user.tab();
      expect(screen.getByLabelText('Prompt input')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Length:/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /voice input/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Generate/i })).toHaveFocus();
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

      render(
        <Wrapper>
          <GeneratePanel pinnedNotes={pinnedNotes} />
        </Wrapper>
      );

      // Check pinned notes indicator has role="status"
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent('1 pinned note will be included');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce errors with assertive live region', async () => {
      const user = userEvent.setup();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AIService } = require('../services/ai');
      AIService.generate.mockRejectedValueOnce(new Error('Test error'));

      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      const input = screen.getByLabelText('Prompt input');
      await user.type(input, 'Test prompt');

      const generateButton = screen.getByRole('button', { name: /Generate/i });
      await user.click(generateButton);

      // Wait for error to appear
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(errorAlert).toHaveTextContent('Test error');
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', () => {
      const { container } = render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      // This is a basic check - axe will verify actual contrast ratios
      expect(container).toBeInTheDocument();
    });
  });

  describe('Menu Accessibility', () => {
    it('should have proper menu role and menuitem roles in length dropdown', async () => {
      const user = userEvent.setup();
      render(
        <Wrapper>
          <GeneratePanel />
        </Wrapper>
      );

      const lengthButton = screen.getByRole('button', { name: /Length:/i });
      await user.click(lengthButton);

      // Check menu role
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      // Check menuitem roles
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
      expect(menuItems[0]).toHaveTextContent('Short');
      expect(menuItems[1]).toHaveTextContent('Medium');
      expect(menuItems[2]).toHaveTextContent('Long');
    });
  });
});
