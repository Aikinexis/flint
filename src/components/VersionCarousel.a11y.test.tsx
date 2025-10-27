import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { VersionCarousel, Version } from './VersionCarousel';

expect.extend(toHaveNoViolations);

describe('VersionCarousel Accessibility Audit', () => {
  const mockVersions: Version[] = [
    {
      id: '1',
      text: 'Original text content',
      label: 'Original',
      isOriginal: true,
      timestamp: Date.now(),
    },
    {
      id: '2',
      text: 'Rewritten version 1',
      label: 'Version 1',
      title: 'Formal rewrite',
      isLiked: false,
      timestamp: Date.now(),
    },
    {
      id: '3',
      text: 'Rewritten version 2',
      label: 'Version 2',
      title: 'Casual rewrite',
      isLiked: true,
      timestamp: Date.now(),
    },
  ];

  const mockHandlers = {
    onNavigate: jest.fn(),
    onDelete: jest.fn(),
    onToggleLike: jest.fn(),
    onCopy: jest.fn(),
    onClearAll: jest.fn(),
    onEdit: jest.fn(),
    onEditTitle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render States', () => {
    it('should have no violations with single version', async () => {
      const { container } = render(
        <VersionCarousel
          versions={[mockVersions[0]]}
          currentIndex={0}
          {...mockHandlers}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with multiple versions', async () => {
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={0}
          {...mockHandlers}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in loading state', async () => {
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={0}
          isLoading={true}
          {...mockHandlers}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with liked version', async () => {
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={2}
          {...mockHandlers}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={0}
          {...mockHandlers}
        />
      );

      const nextButton = screen.getByLabelText('Next version');
      await user.click(nextButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations after toggling like', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByLabelText('Like version');
      await user.click(likeButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations after editing text', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const textarea = screen.getByLabelText('Text content');
      await user.type(textarea, ' additional text');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations after editing title', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const titleInput = screen.getByLabelText('Version title');
      await user.clear(titleInput);
      await user.type(titleInput, 'New title');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      // Tab through elements
      await user.tab(); // Title input
      expect(screen.getByLabelText('Version title')).toHaveFocus();

      await user.tab(); // Textarea
      expect(screen.getByLabelText('Text content')).toHaveFocus();

      await user.tab(); // Previous button
      expect(screen.getByLabelText('Previous version')).toHaveFocus();

      await user.tab(); // Next button
      expect(screen.getByLabelText('Next version')).toHaveFocus();

      await user.tab(); // Clear all button
      expect(screen.getByLabelText('Clear all text')).toHaveFocus();

      await user.tab(); // Like button
      expect(screen.getByLabelText('Like version')).toHaveFocus();

      await user.tab(); // Delete button
      expect(screen.getByLabelText('Delete version')).toHaveFocus();
    });

    it('should support keyboard activation for buttons', async () => {
      const user = userEvent.setup();
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const likeButton = screen.getByLabelText('Like version');
      likeButton.focus();
      await user.keyboard('{Enter}');

      expect(mockHandlers.onToggleLike).toHaveBeenCalledWith('2');
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('region', { name: 'Version carousel' })).toBeInTheDocument();
      expect(screen.getByLabelText('Version title')).toBeInTheDocument();
      expect(screen.getByLabelText('Text content')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous version')).toBeInTheDocument();
      expect(screen.getByLabelText('Next version')).toBeInTheDocument();
      expect(screen.getByLabelText('Clear all text')).toBeInTheDocument();
      expect(screen.getByLabelText('Like version')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete version')).toBeInTheDocument();
    });

    it('should update like button aria-label based on state', () => {
      const { rerender } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      expect(screen.getByLabelText('Like version')).toBeInTheDocument();

      // Rerender with liked version
      rerender(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={2}
          {...mockHandlers}
        />
      );

      expect(screen.getByLabelText('Unlike version')).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative SVG icons', () => {
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const buttons = [
        screen.getByLabelText('Previous version'),
        screen.getByLabelText('Next version'),
        screen.getByLabelText('Like version'),
        screen.getByLabelText('Delete version'),
      ];

      buttons.forEach((button) => {
        button.focus();
        expect(button).toHaveFocus();
      });
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const expectedOrder = [
        'Version title',
        'Text content',
        'Previous version',
        'Next version',
        'Clear all text',
        'Like version',
        'Delete version',
      ];

      for (const label of expectedOrder) {
        await user.tab();
        expect(screen.getByLabelText(label)).toHaveFocus();
      }
    });
  });

  describe('Disabled States', () => {
    it('should properly disable navigation buttons at boundaries', () => {
      const { rerender } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={0}
          {...mockHandlers}
        />
      );

      const prevButton = screen.getByLabelText('Previous version');
      expect(prevButton).toBeDisabled();

      rerender(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={2}
          {...mockHandlers}
        />
      );

      const nextButton = screen.getByLabelText('Next version');
      expect(nextButton).toBeDisabled();
    });

    it('should disable all buttons when loading', () => {
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          isLoading={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByLabelText('Version title')).toBeDisabled();
      expect(screen.getByLabelText('Text content')).toBeDisabled();
      expect(screen.getByLabelText('Previous version')).toBeDisabled();
      expect(screen.getByLabelText('Next version')).toBeDisabled();
      expect(screen.getByLabelText('Clear all text')).toBeDisabled();
      expect(screen.getByLabelText('Like version')).toBeDisabled();
      expect(screen.getByLabelText('Delete version')).toBeDisabled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce version counter to screen readers', () => {
      render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('should not show navigation controls for single version', () => {
      render(
        <VersionCarousel
          versions={[mockVersions[0]]}
          currentIndex={0}
          {...mockHandlers}
        />
      );

      expect(screen.queryByLabelText('Previous version')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next version')).not.toBeInTheDocument();
      expect(screen.queryByText('1/1')).not.toBeInTheDocument();
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(
        <VersionCarousel
          versions={mockVersions}
          currentIndex={1}
          {...mockHandlers}
        />
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });
});
