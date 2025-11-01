# Changelog

All notable changes to Flint Chrome Extension.

## [Unreleased] - 2024-11-01

### Added - Context Engine Implementation

#### New Features
- **Lightweight Context Engine** - Intelligent document understanding without external dependencies
  - Extracts 1500 chars of local context (up from 1000)
  - Finds 3 most relevant sections from entire document
  - Uses keyword overlap (Jaccard similarity) for relevance scoring
  - Automatic deduplication and compression
  - Document structure awareness (headings, sections)
  - 100% local processing, < 20ms performance

- **Enhanced AI Methods**
  - `AIService.generateWithEnhancedContext()` - Generate with full document awareness
  - `AIService.rewriteWithContext()` - Rewrite with surrounding context for style matching

- **Comprehensive Testing**
  - 27 new tests for context engine (all passing)
  - Test coverage for edge cases and error conditions

- **Documentation**
  - Complete technical documentation in `docs/context-engine/`
  - User-friendly quick start guide
  - Real-world usage examples
  - Before/after analysis with visual diagrams

#### Improvements
- **Generate Tool**
  - Now sees 2250 chars total (up from 1000)
  - Includes 3 most relevant sections from entire document
  - Detects and includes nearest heading
  - Stronger anti-repetition rules
  - Better instruction following

- **Rewrite Tool**
  - Now includes 500 chars before selection
  - Now includes 500 chars after selection
  - Better style matching with surrounding text
  - Improved flow and consistency

#### Fixed
- **Rewrite Prompt Handling** - Custom prompts now work correctly
  - Changed API priority to use Prompt API for custom instructions
  - Rewriter API now only used for preset tones
  - Better fallback handling
  
- **Prompt Repetition** - Eliminated duplicate prompts in rewrite requests
  - Removed duplicate addition of custom prompt
  - Cleaner prompt structure

- **Generate Repetition** - AI no longer repeats existing content
  - Strengthened anti-repetition rules
  - Explicit instructions for "expand on" vs "repeat"
  - Better handling of "talk more about" requests

#### Technical Details
- **Files Added**
  - `src/utils/contextEngine.ts` - Core implementation (320 lines)
  - `src/utils/contextEngine.test.ts` - Test suite (370 lines)
  - `docs/context-engine/` - Complete documentation

- **Files Modified**
  - `src/services/ai.ts` - Enhanced methods and fixes
  - `src/components/ToolControlsContainer.tsx` - UI integration
  - `src/utils/documentAnalysis.test.ts` - Test fixes
  - `src/panel/panel.autoTitle.test.tsx` - Test fixes

- **Performance**
  - Context assembly: < 20ms for typical documents
  - No memory leaks
  - No external dependencies
  - Bundle size: 370.76 kB (94.48 kB gzipped)

- **Quality Assurance**
  - All tests passing (27/27 for context engine)
  - Zero TypeScript errors
  - Zero ESLint warnings
  - Build successful

### Documentation Structure
```
docs/
├── README.md                          # Main documentation index
├── context-engine/                    # Context engine documentation
│   ├── README.md                      # Context engine index
│   ├── QUICK_START_CONTEXT_ENGINE.md # User guide
│   ├── FINAL_SUMMARY.md              # Complete overview
│   ├── CONTEXT_ENGINE_IMPLEMENTATION.md # Technical details
│   ├── CONTEXT_AWARENESS_ANALYSIS.md # Before/after comparison
│   ├── CONTEXT_ENGINE_USAGE_EXAMPLES.md # Real examples
│   ├── IMPLEMENTATION_SUMMARY.md     # Implementation details
│   └── REWRITE_PROMPT_FIX.md        # Fix documentation
├── audits/                            # Audit reports
├── features/                          # Feature documentation
├── fixes/                             # Bug fix documentation
├── implementation/                    # Implementation guides
├── mockups/                          # UI mockups
└── testing/                          # Testing guides
```

## Previous Changes

See individual documentation files in `docs/` for historical changes and feature implementations.

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements
