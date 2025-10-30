# Documentation Organization

This document describes the organization of documentation and test files in the Flint Chrome extension project.

## Directory Structure

### `/docs/testing/` (6 files)
Testing guides, checklists, and instructions for verifying functionality.

**Key Files:**
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `TEST_INSTRUCTIONS.md` - Step-by-step test instructions
- `QUICK_TEST_CHECKLIST.md` - Fast verification checklist

### `/docs/implementation/` (26 files)
Detailed implementation notes, task summaries, and technical documentation for features.

**Key Files:**
- `TASK_*.md` - Implementation notes for specific tasks
- `*_IMPLEMENTATION.md` - Feature implementation summaries
- `*_FIXES_*.md` - Bug fix documentation
- `unified-editor.diff` - Diff file for unified editor changes

### `/docs/audits/` (11 files)
Audit reports and analysis documents for quality assurance.

**Key Files:**
- `A11Y_*.md` - Accessibility audit reports
- `AUDIT_SUMMARY.md` - Overall audit summary
- `BUNDLE_ANALYSIS.md` - Bundle size analysis
- `COMPLETE_STYLING_AUDIT.md` - Styling audit

### `/docs/mockups/` (4 files)
HTML mockups and prototypes used during design and development.

**Files:**
- `animation-demo.html` - Animation demonstrations
- `inline-workflow-mockup.html` - Inline workflow prototype
- `project-editor-mockup.html` - Project editor UI mockup
- `unified-editor-mockup.html` - Unified editor prototype

### `/tests/manual-tests/` (20 files)
HTML test files for manually testing specific features and components.

**Categories:**
- AI Features: `test-ai-*.html`
- Editor Features: `test-*-editor-*.html`, `test-selection-*.html`
- UI Components: `test-minibar*.html`, `test-collapsible-*.html`
- Error Handling: `test-error-*.html`
- Other: `test-clipboard-*.html`, `test-migration.html`

## Root Directory

The root directory now contains only essential project files:

- Configuration files (`.eslintrc.cjs`, `tsconfig.json`, etc.)
- Package management (`package.json`, `package-lock.json`)
- Build scripts (`vite.config.ts`, `verify-build.sh`)
- Core documentation (`README.md`, `SETUP_INSTRUCTIONS.md`)
- License and manifest (`LICENSE`, `manifest.json`)

## Benefits of This Organization

1. **Cleaner Root**: Essential files are easy to find
2. **Logical Grouping**: Related documents are together
3. **Easy Navigation**: Clear folder structure with README files
4. **Better Maintenance**: Easier to update and manage documentation
5. **Professional**: Follows standard open-source project conventions

## Finding Documents

Use the README files in each folder to understand what's inside:
- `/docs/testing/README.md`
- `/docs/implementation/README.md`
- `/docs/audits/README.md`
- `/docs/mockups/README.md`
- `/tests/manual-tests/README.md`

## Historical Context

These documents were created during the development of Flint and provide valuable context about:
- Why certain decisions were made
- How features were implemented
- What issues were encountered and resolved
- How quality was maintained throughout development
