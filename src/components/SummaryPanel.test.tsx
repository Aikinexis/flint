/**
 * Accessibility audit for SummaryPanel component
 */

import { render } from '@testing-library/react';
import jestAxe from 'jest-axe';
import { SummaryPanel } from './SummaryPanel';

const { axe, toHaveNoViolations } = jestAxe;

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('SummaryPanel Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    const { container } = render(<SummaryPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with initial text', async () => {
    const { container } = render(
      <SummaryPanel initialText="Sample text to summarize" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with pinned notes', async () => {
    const pinnedNotes = [
      {
        id: '1',
        title: 'Note 1',
        content: 'Content 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const { container } = render(
      <SummaryPanel pinnedNotes={pinnedNotes} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
