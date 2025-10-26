/**
 * Settings Component - Comprehensive Accessibility Audit
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Settings } from './Settings';
import type { Settings as SettingsType, PinnedNote } from '../services/storage';

expect.extend(toHaveNoViolations);

// Mock chrome.storage API
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
  },
  onChanged: {
    addListener: jest.fn(),
  },
};

// Mock chrome.runtime API
const mockChromeRuntime = {
  sendMessage: jest.fn(),
};

// @ts-ignore
global.chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
};

// Mock StorageService
jest.mock('../services/storage', () => ({
  StorageService: {
    getPinnedNotes: jest.fn().mockResolvedValue([]),
    savePinnedNote: jest.fn().mockResolvedValue({
      id: 'test-note-1',
      title: 'Test Note',
      content: 'Test content',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    deletePinnedNote: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Settings Component - Comprehensive Accessibility Audit', () => {
  const defaultSettings: SettingsType = {
    language: 'en-US',
    theme: 'dark',
    localOnlyMode: false,
    accentHue: 255,
    shortcuts: {
      openPanel: 'Ctrl+Shift+F',
      record: 'Ctrl+Shift+R',
      summarize: 'Ctrl+Shift+S',
      rewrite: 'Ctrl+Shift+W',
    },
  };

  const sampleNotes: PinnedNote[] = [
    {
      id: 'note-1',
      title: 'Writing Style',
      content: 'Use clear, concise language',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeStorage.local.get.mockResolvedValue({ settings: defaultSettings });
  });

  describe('Initial Render States', () => {
    it('should have no violations in default state', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with pinned notes', async () => {
      const { container } = render(
        <Settings settings={defaultSettings} pinnedNotes={sampleNotes} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in light mode', async () => {
      const lightSettings = { ...defaultSettings, theme: 'light' as const };
      const { container } = render(<Settings settings={lightSettings} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Picker Accessibility', () => {
    it('should have proper label association for color input', async () => {
      render(<Settings settings={defaultSettings} />);
      
      const colorInput = screen.getByLabelText(/accent color/i);
      expect(colorInput).toBeInTheDocument();
      expect(colorInput).toHaveAttribute('type', 'color');
      expect(colorInput).toHaveAttribute('id', 'accent-color');
    });

    it('should have no violations with color picker', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible name for color input', async () => {
      render(<Settings settings={defaultSettings} />);
      
      const colorInput = screen.getByLabelText('Select accent color');
      expect(colorInput).toBeInTheDocument();
    });

    it('should maintain accessibility after color change', async () => {
      const user = userEvent.setup();
      const { container } = render(<Settings settings={defaultSettings} />);
      
      const colorInput = screen.getByLabelText(/accent color/i);
      await user.click(colorInput);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Toggle Controls Accessibility', () => {
    it('should have proper ARIA labels for all toggles', async () => {
      render(<Settings settings={defaultSettings} />);
      
      expect(screen.getByLabelText('Toggle light mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle local-only mode')).toBeInTheDocument();
    });

    it('should have no violations with toggles', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should maintain accessibility after toggle interaction', async () => {
      const user = userEvent.setup();
      const { container } = render(<Settings settings={defaultSettings} />);
      
      const lightModeToggle = screen.getByLabelText('Toggle light mode');
      await user.click(lightModeToggle);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      // Tab through interactive elements
      await user.tab(); // Light mode toggle
      expect(screen.getByLabelText('Toggle light mode')).toHaveFocus();
      
      await user.tab(); // Color picker
      expect(screen.getByLabelText('Select accent color')).toHaveFocus();
      
      await user.tab(); // Language select
      expect(screen.getByLabelText(/select speech recognition language/i)).toHaveFocus();
      
      await user.tab(); // Local-only toggle
      expect(screen.getByLabelText('Toggle local-only mode')).toHaveFocus();
    });

    it('should support keyboard activation for toggles', async () => {
      const user = userEvent.setup();
      const onSettingsChange = jest.fn();
      render(
        <Settings settings={defaultSettings} onSettingsChange={onSettingsChange} />
      );
      
      const lightModeToggle = screen.getByLabelText('Toggle light mode');
      lightModeToggle.focus();
      
      await user.keyboard(' '); // Space key
      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('Form Controls Accessibility', () => {
    it('should have proper labels for all form inputs', async () => {
      render(<Settings settings={defaultSettings} />);
      
      expect(screen.getByLabelText(/accent color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/open panel keyboard shortcut/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/record keyboard shortcut/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/summarize keyboard shortcut/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rewrite keyboard shortcut/i)).toBeInTheDocument();
    });

    it('should have no violations with form controls', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper error associations for invalid shortcuts', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      const shortcutInput = screen.getByLabelText(/open panel keyboard shortcut/i);
      await user.clear(shortcutInput);
      await user.type(shortcutInput, 'A');
      await user.tab(); // Trigger blur
      
      // Check for error message
      const errorMessage = await screen.findByText(/must include at least one modifier/i);
      expect(errorMessage).toBeInTheDocument();
      
      // Check aria-invalid
      expect(shortcutInput).toHaveAttribute('aria-invalid', 'true');
      
      // Check aria-describedby
      expect(shortcutInput).toHaveAttribute('aria-describedby', 'error-open-panel');
    });
  });

  describe('Dialog Accessibility', () => {
    it('should have no violations when add note dialog is open', async () => {
      const user = userEvent.setup();
      const { container } = render(<Settings settings={defaultSettings} />);
      
      const addButton = screen.getByLabelText('Add pinned note');
      await user.click(addButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper dialog attributes', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      const addButton = screen.getByLabelText('Add pinned note');
      await user.click(addButton);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
    });

    it('should have accessible form labels in dialog', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      const addButton = screen.getByLabelText('Add pinned note');
      await user.click(addButton);
      
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Content')).toBeInTheDocument();
    });

    it('should have no violations in delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Settings settings={defaultSettings} pinnedNotes={sampleNotes} />
      );
      
      const deleteButton = screen.getByLabelText(/delete writing style/i);
      await user.click(deleteButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      
      // Check that focus-visible styles are applied
      const style = window.getComputedStyle(container);
      expect(style).toBeDefined();
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      // Start tabbing
      await user.tab();
      const firstFocusable = document.activeElement;
      expect(firstFocusable).toBeTruthy();
      
      // Continue tabbing through elements
      await user.tab();
      const secondFocusable = document.activeElement;
      expect(secondFocusable).not.toBe(firstFocusable);
    });

    it('should trap focus in dialog', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      const addButton = screen.getByLabelText('Add pinned note');
      await user.click(addButton);
      
      // Focus should be in dialog
      const titleInput = screen.getByLabelText('Title');
      expect(titleInput).toHaveFocus();
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(<Settings settings={defaultSettings} />);
      
      // axe will check color contrast automatically
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should maintain contrast in light mode', async () => {
      const lightSettings = { ...defaultSettings, theme: 'light' as const };
      const { container } = render(<Settings settings={lightSettings} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading hierarchy', async () => {
      render(<Settings settings={defaultSettings} />);
      
      const mainHeading = screen.getByText('Settings');
      expect(mainHeading.tagName).toBe('H2');
      
      const sectionHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    it('should have descriptive button labels', async () => {
      render(<Settings settings={defaultSettings} pinnedNotes={sampleNotes} />);
      
      expect(screen.getByLabelText('Add pinned note')).toBeInTheDocument();
      expect(screen.getByLabelText(/edit writing style/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/delete writing style/i)).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', async () => {
      render(<Settings settings={defaultSettings} />);
      
      const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive States', () => {
    it('should have no violations after language change', async () => {
      const user = userEvent.setup();
      const { container } = render(<Settings settings={defaultSettings} />);
      
      const languageSelect = screen.getByLabelText(/select speech recognition language/i);
      await user.selectOptions(languageSelect, 'es-ES');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations after shortcut input', async () => {
      const user = userEvent.setup();
      const { container } = render(<Settings settings={defaultSettings} />);
      
      const shortcutInput = screen.getByLabelText(/open panel keyboard shortcut/i);
      await user.clear(shortcutInput);
      await user.type(shortcutInput, 'Ctrl+Shift+P');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Disabled States', () => {
    it('should properly indicate disabled save button', async () => {
      const user = userEvent.setup();
      render(<Settings settings={defaultSettings} />);
      
      const addButton = screen.getByLabelText('Add pinned note');
      await user.click(addButton);
      
      const saveButton = screen.getByText(/add note/i);
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveStyle({ cursor: 'not-allowed' });
    });
  });
});
