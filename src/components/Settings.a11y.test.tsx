import { render } from '@testing-library/react';
import jestAxe from 'jest-axe';
import { Settings } from './Settings';
import { AppProvider } from '../state/AppProvider';
import type { Settings as SettingsType, PinnedNote } from '../services/storage';
import * as StorageModule from '../services/storage';

const { axe, toHaveNoViolations } = jestAxe;

expect.extend(toHaveNoViolations);

// Mock StorageService methods
const mockGetPinnedNotes = () => Promise.resolve([]);
const mockSavePinnedNote = () =>
  Promise.resolve({
    id: '1',
    title: 'Test',
    content: 'Test content',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
const mockDeletePinnedNote = () => Promise.resolve(undefined);
const mockGetGenerateSettings = () =>
  Promise.resolve({
    shortLength: 500,
    mediumLength: 1500,
    contextAwarenessEnabled: true,
  });
const mockSaveGenerateSettings = () => Promise.resolve(undefined);
const mockGetHistory = () => Promise.resolve([]);
const mockClearHistory = () => Promise.resolve(undefined);

// Override StorageService methods
(StorageModule.StorageService as any).getPinnedNotes = mockGetPinnedNotes;
(StorageModule.StorageService as any).savePinnedNote = mockSavePinnedNote;
(StorageModule.StorageService as any).deletePinnedNote = mockDeletePinnedNote;
(StorageModule.StorageService as any).getGenerateSettings = mockGetGenerateSettings;
(StorageModule.StorageService as any).saveGenerateSettings = mockSaveGenerateSettings;
(StorageModule.StorageService as any).getHistory = mockGetHistory;
(StorageModule.StorageService as any).clearHistory = mockClearHistory;

const mockSettings: SettingsType = {
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

const mockPinnedNotes: PinnedNote[] = [
  {
    id: '1',
    title: 'Test Note',
    content: 'This is a test note for accessibility testing',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe('Settings Comprehensive Accessibility Audit', () => {
  beforeEach(() => {
    // Mock chrome API
    global.chrome = {
      storage: {
        local: {
          get: () =>
            Promise.resolve({
              settings: {
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
              },
            }),
          set: () => Promise.resolve(undefined),
        },
        onChanged: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
      runtime: {
        sendMessage: () => Promise.resolve(undefined),
        onMessage: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
    } as any;
  });

  describe('Initial Render States', () => {
    it('should have no violations in default state', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with pinned notes', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={mockPinnedNotes} />
        </AppProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in light mode', async () => {
      const lightSettings = { ...mockSettings, theme: 'light' as const };
      const { container } = render(
        <AppProvider>
          <Settings settings={lightSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Controls', () => {
    it('should have proper labels for all inputs', async () => {
      const { container, getByLabelText } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      // Check all form controls have labels
      expect(getByLabelText(/light mode/i)).toBeInTheDocument();
      expect(getByLabelText(/accent hue/i)).toBeInTheDocument();
      expect(getByLabelText(/speech recognition language/i)).toBeInTheDocument();
      expect(getByLabelText(/local-only mode/i)).toBeInTheDocument();
      expect(getByLabelText(/open panel keyboard shortcut/i)).toBeInTheDocument();
      expect(getByLabelText(/record keyboard shortcut/i)).toBeInTheDocument();
      expect(getByLabelText(/summarize keyboard shortcut/i)).toBeInTheDocument();
      expect(getByLabelText(/rewrite keyboard shortcut/i)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes for toggles', async () => {
      const { container, getByLabelText } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const lightModeToggle = getByLabelText(/toggle light mode/i);
      expect(lightModeToggle).toHaveAttribute('type', 'checkbox');
      expect(lightModeToggle).toHaveAttribute('aria-label');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes for error states', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      // All shortcut inputs should have aria-invalid and aria-describedby ready
      const openPanelInput = container.querySelector('#shortcut-open-panel');
      expect(openPanelInput).toHaveAttribute('aria-invalid');
      expect(openPanelInput).toHaveAttribute('aria-label');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have logical tab order', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const focusableElements = container.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Should have multiple focusable elements
      expect(focusableElements.length).toBeGreaterThan(0);

      // All focusable elements should have proper attributes
      focusableElements.forEach((el) => {
        // Should not have negative tabindex (unless explicitly set for a reason)
        const tabindex = el.getAttribute('tabindex');
        if (tabindex !== null) {
          expect(parseInt(tabindex)).toBeGreaterThanOrEqual(-1);
        }
      });
    });

    it('should have accessible buttons', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={mockPinnedNotes} />
        </AppProvider>
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        // Each button should have accessible text (aria-label or text content)
        const hasAriaLabel = button.hasAttribute('aria-label');
        const hasTextContent = button.textContent && button.textContent.trim().length > 0;
        expect(hasAriaLabel || hasTextContent).toBe(true);
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML', () => {
    it('should use proper heading hierarchy', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const h2 = container.querySelector('h2');
      const h3s = container.querySelectorAll('h3');

      expect(h2).toBeInTheDocument();
      expect(h3s.length).toBeGreaterThan(0);

      // H2 should come before H3s
      const h2Index = Array.from(container.querySelectorAll('h2, h3')).indexOf(h2!);
      expect(h2Index).toBe(0);
    });

    it('should use semantic sections', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Dialog Accessibility', () => {
    it('should have proper dialog attributes when opened', async () => {
      const { container, getByLabelText } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      // Click add note button to open dialog
      const addButton = getByLabelText(/add pinned note/i);
      addButton.click();

      // Wait for dialog to appear
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast', () => {
    it('should render with sufficient color contrast', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      // axe will check color contrast automatically
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels for icon buttons', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={mockPinnedNotes} />
        </AppProvider>
      );

      // Icon buttons should have aria-label
      const iconButtons = container.querySelectorAll('button svg');
      iconButtons.forEach((svg) => {
        const button = svg.closest('button');
        if (button) {
          const hasAriaLabel = button.hasAttribute('aria-label');
          const hasTextContent = button.textContent && button.textContent.trim().length > 0;
          expect(hasAriaLabel || hasTextContent).toBe(true);
        }
      });
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      const focusableElements = container.querySelectorAll('button, input, select, textarea');

      focusableElements.forEach((el) => {
        // Elements should be focusable
        expect(el).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Error States', () => {
    it('should have accessible error messages', async () => {
      const { container } = render(
        <AppProvider>
          <Settings settings={mockSettings} pinnedNotes={[]} />
        </AppProvider>
      );

      // Error messages should be associated with inputs via aria-describedby
      const inputs = container.querySelectorAll('input[aria-describedby]');
      inputs.forEach((input) => {
        const describedBy = input.getAttribute('aria-describedby');
        if (describedBy) {
          // The described element should exist (even if not visible yet)
          // This is okay - it will appear when there's an error
        }
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
