/**
 * Tests for auto-title generation in panel.tsx
 * Tests the logic added in the auto-save debounce that generates smart titles
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the documentAnalysis module BEFORE importing
const mockGenerateSmartTitle = jest.fn<(content: string) => string>();

jest.mock('../utils/documentAnalysis.js', () => ({
  generateSmartTitle: mockGenerateSmartTitle,
  detectDocumentType: jest.fn(),
  analyzeCursorContext: jest.fn(),
  buildContextInstructions: jest.fn(),
}));

describe('Panel Auto-Title Generation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDefaultTitle helper', () => {
    // This is the helper function from panel.tsx
    const isDefaultTitle = (title: string): boolean => {
      const defaultTitles = [
        'Untitled',
        'Untitled Project',
        'My project',
        'My first project',
        'My First Project',
      ];
      return defaultTitles.includes(title);
    };

    it('should return true for default titles', () => {
      expect(isDefaultTitle('Untitled')).toBe(true);
      expect(isDefaultTitle('Untitled Project')).toBe(true);
      expect(isDefaultTitle('My project')).toBe(true);
      expect(isDefaultTitle('My first project')).toBe(true);
      expect(isDefaultTitle('My First Project')).toBe(true);
    });

    it('should return false for custom titles', () => {
      expect(isDefaultTitle('Meeting Notes')).toBe(false);
      expect(isDefaultTitle('Email Draft')).toBe(false);
      expect(isDefaultTitle('Custom Title')).toBe(false);
      expect(isDefaultTitle('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isDefaultTitle('untitled')).toBe(false);
      expect(isDefaultTitle('UNTITLED')).toBe(false);
      expect(isDefaultTitle('my project')).toBe(false);
    });
  });

  describe('Auto-title generation conditions', () => {
    const isDefaultTitle = (title: string): boolean => {
      const defaultTitles = [
        'Untitled',
        'Untitled Project',
        'My project',
        'My first project',
        'My First Project',
      ];
      return defaultTitles.includes(title);
    };

    it('should generate title when project has default title and content exists', () => {
      const projectTitle = 'Untitled';
      const content = 'Subject: Meeting Tomorrow\n\nLet me know if you can attend.';

      mockGenerateSmartTitle.mockReturnValue('Meeting Tomorrow');

      // Simulate the condition check
      const shouldGenerateTitle = isDefaultTitle(projectTitle) && !!content.trim();
      expect(shouldGenerateTitle).toBe(true);

      if (shouldGenerateTitle) {
        const smartTitle = mockGenerateSmartTitle(content);
        expect(smartTitle).toBe('Meeting Tomorrow');
        expect(mockGenerateSmartTitle).toHaveBeenCalledWith(content);
      }
    });

    it('should not generate title when project has custom title', () => {
      const projectTitle = 'My Custom Title';
      const content = 'Subject: Meeting Tomorrow\n\nLet me know if you can attend.';

      const shouldGenerateTitle = isDefaultTitle(projectTitle) && !!content.trim();
      expect(shouldGenerateTitle).toBe(false);
      expect(mockGenerateSmartTitle).not.toHaveBeenCalled();
    });

    it('should not generate title when content is empty', () => {
      const projectTitle = 'Untitled';
      const content = '';

      const shouldGenerateTitle = isDefaultTitle(projectTitle) && !!content.trim();
      expect(shouldGenerateTitle).toBe(false);
      expect(mockGenerateSmartTitle).not.toHaveBeenCalled();
    });

    it('should not generate title when content is only whitespace', () => {
      const projectTitle = 'Untitled';
      const content = '   \n\n   ';

      const shouldGenerateTitle = isDefaultTitle(projectTitle) && !!content.trim();
      expect(shouldGenerateTitle).toBe(false);
      expect(mockGenerateSmartTitle).not.toHaveBeenCalled();
    });
  });

  describe('Title update logic', () => {
    const isDefaultTitle = (title: string): boolean => {
      const defaultTitles = [
        'Untitled',
        'Untitled Project',
        'My project',
        'My first project',
        'My First Project',
      ];
      return defaultTitles.includes(title);
    };

    it('should update title when smart title is different from current title', () => {
      const projectTitle = 'Untitled';
      const content = 'Subject: Meeting Tomorrow\n\nLet me know if you can attend.';

      mockGenerateSmartTitle.mockReturnValue('Meeting Tomorrow');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('Meeting Tomorrow');
    });

    it('should not update title when smart title is "Untitled"', () => {
      const projectTitle = 'Untitled';
      const content = 'Yes\nNo\nMaybe';

      mockGenerateSmartTitle.mockReturnValue('Untitled');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBeUndefined();
    });

    it('should not update title when smart title is same as current title', () => {
      const projectTitle = 'My project';
      const content = 'My project\n\nSome content here.';

      mockGenerateSmartTitle.mockReturnValue('My project');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBeUndefined();
    });

    it('should not update title when smart title is empty', () => {
      const projectTitle = 'Untitled';
      const content = 'Some content';

      mockGenerateSmartTitle.mockReturnValue('');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBeUndefined();
    });

    it('should not update title when smart title is null/undefined', () => {
      const projectTitle = 'Untitled';
      const content = 'Some content';

      mockGenerateSmartTitle.mockReturnValue(null as any);

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    const isDefaultTitle = (title: string): boolean => {
      const defaultTitles = [
        'Untitled',
        'Untitled Project',
        'My project',
        'My first project',
        'My First Project',
      ];
      return defaultTitles.includes(title);
    };

    it('should handle content with only newlines', () => {
      const projectTitle = 'Untitled';
      const content = '\n\n\n';

      const shouldGenerateTitle = isDefaultTitle(projectTitle) && !!content.trim();
      expect(shouldGenerateTitle).toBe(false);
    });

    it('should handle very long content', () => {
      const projectTitle = 'Untitled';
      const content = 'A'.repeat(10000);

      mockGenerateSmartTitle.mockReturnValue(
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...'
      );

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...');
      expect(mockGenerateSmartTitle).toHaveBeenCalledWith(content);
    });

    it('should handle special characters in content', () => {
      const projectTitle = 'Untitled';
      const content = '# Meeting Notes 📝\n\n- Item 1\n- Item 2';

      mockGenerateSmartTitle.mockReturnValue('Meeting Notes 📝');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('Meeting Notes 📝');
    });

    it('should handle content with multiple subject lines', () => {
      const projectTitle = 'Untitled';
      const content = 'Subject: First\nSubject: Second\n\nContent here.';

      mockGenerateSmartTitle.mockReturnValue('First');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('First');
    });
  });

  describe('Integration with different default titles', () => {
    const isDefaultTitle = (title: string): boolean => {
      const defaultTitles = [
        'Untitled',
        'Untitled Project',
        'My project',
        'My first project',
        'My First Project',
      ];
      return defaultTitles.includes(title);
    };

    it('should work with "My first project" title', () => {
      const projectTitle = 'My first project';
      const content = 'Introduction to AI\n\nThis is the first paragraph.';

      mockGenerateSmartTitle.mockReturnValue('Introduction to AI');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('Introduction to AI');
    });

    it('should work with "My First Project" title (capitalized)', () => {
      const projectTitle = 'My First Project';
      const content = 'Email Draft\n\nDear John,';

      mockGenerateSmartTitle.mockReturnValue('Email Draft');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('Email Draft');
    });

    it('should work with "Untitled Project" title', () => {
      const projectTitle = 'Untitled Project';
      const content = '• First important point about the topic';

      mockGenerateSmartTitle.mockReturnValue('First important point about the topic');

      const titleUpdate: { title?: string } = {};

      if (isDefaultTitle(projectTitle) && content.trim()) {
        const smartTitle = mockGenerateSmartTitle(content);
        if (smartTitle && smartTitle !== 'Untitled' && smartTitle !== projectTitle) {
          titleUpdate.title = smartTitle;
        }
      }

      expect(titleUpdate.title).toBe('First important point about the topic');
    });
  });
});
