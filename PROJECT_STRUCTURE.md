# Flint Project Structure

Clean, organized structure for the Flint Chrome Extension.

## Root Directory

```
Flint/
├── README.md                 # Main project documentation
├── manifest.json             # Chrome extension manifest
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Build configuration
├── jest.config.js            # Test configuration
├── playwright.config.ts      # E2E test configuration
└── verify-build.sh           # Build verification script
```

## Source Code (`src/`)

```
src/
├── assets/                   # Static assets (logos, icons)
├── background/               # Service worker
│   └── background.ts
├── components/               # React components (UI only, no tests)
├── content/                  # Content scripts
│   ├── contentScript.ts
│   ├── selection.ts
│   ├── caret.ts
│   └── injector.ts
├── hooks/                    # Custom React hooks
├── panel/                    # Side panel entry point
│   ├── index.html
│   └── panel.tsx
├── services/                 # Core services (AI, speech, storage)
│   ├── ai.ts
│   ├── speech.ts
│   ├── storage.ts
│   └── messaging.ts
├── state/                    # State management
│   ├── store.ts
│   ├── actions.ts
│   └── selectors.ts
├── styles/                   # Global styles
│   ├── index.css
│   └── tokens.css
└── utils/                    # Utility functions
```

## Tests (`tests/`)

```
tests/
├── unit/                     # Unit tests (moved from src/)
│   ├── components/           # Component tests
│   ├── services/             # Service tests
│   └── utils/                # Utility tests
├── manual-tests/             # Manual testing HTML files
├── panel.spec.ts             # E2E panel tests
└── setup.ts                  # Test setup
```

## Documentation (`docs/`)

```
docs/
├── README.md                 # Documentation index
├── CHANGELOG.md              # Version history
├── SETUP_INSTRUCTIONS.md     # Setup guide
├── VERIFICATION.md           # Verification checklist
├── DOCUMENTATION_INDEX.md    # Full doc index
├── audits/                   # Audit reports
├── context-engine/           # Context engine docs
├── features/                 # Feature documentation
├── fixes/                    # Bug fix documentation
├── implementation/           # Implementation notes
├── mockups/                  # UI mockups and demos
└── testing/                  # Testing guides
```

## Scripts (`scripts/`)

```
scripts/
├── a11y-audit.mjs            # Accessibility audit
├── audit-sidebar.mjs         # Sidebar audit
├── audit-voice-recorder.mjs  # Voice recorder audit
├── profile-interactions.mjs  # Performance profiling
└── test-sidebar-keyboard.mjs # Keyboard navigation test
```

## Build Output

```
dist/                         # Production build (gitignored)
├── background.js
├── content.js
├── panel.js
├── index.css
└── src/panel/index.html
```

## Key Changes Made

1. **Test files moved**: All `*.test.ts` and `*.test.tsx` files moved from `src/` to `tests/unit/`
2. **Documentation consolidated**: Root-level docs moved to `docs/` folder
3. **Removed duplicates**: Eliminated duplicate FIXES_SUMMARY.md and ORGANIZATION.md files
4. **Cleaned up**: Removed .DS_Store files and added to .gitignore
5. **Removed empty directories**: Deleted unused `src/overlay/` folder
6. **Updated jest.config.js**: Test paths now point to `tests/unit/`

## Verification

All checks pass:
- ✅ TypeScript compilation (`npm run type-check`)
- ✅ Production build (`npm run build`)
- ✅ Bundle size: 95.24 kB gzipped (under 1 MB limit)
