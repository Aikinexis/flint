# Generate Panel Enhancements — Design Document

## Overview

This design document details the implementation of three key enhancements to Flint's **existing** Generate panel: configurable length presets, prompt history management, and context-aware prompt processing.

**IMPORTANT:** The GeneratePanel component, AI service with `generate()` method, and basic storage infrastructure already exist. This spec ONLY adds:
1. Length selector integrated into prompt input field
2. Prompt history dropdown that appears inside/below the prompt field when empty
3. Automatic context tracking via output summaries (no visible UI)

The design prioritizes a clean, minimal UI with all controls integrated into the prompt input field. No separate dropdowns or banners - everything is contextual and unobtrusive.

## Architecture

### Component Integration

```
┌─────────────────────────────────────────────────────────────┐
│              Generate Panel (EXISTING - Enhanced)            │
├─────────────────────────────────────────────────────────────┤
│  [EXISTING] VersionCarousel with results                     │
│                                                               │
│  [NEW] Context Banner (dismissible)                          │
│  [EXISTING] Prompt Input + Voice Button                      │
│  [NEW] Length Dropdown (Short/Medium/Long)                   │
│  [NEW] Recent Prompts (5 items, star/X icons)               │
│  [EXISTING] Generate Button                                  │
│  [EXISTING] Error/Mock Provider notices                      │
│                                                               │
└───────────────────┬───────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ AI Service (EXISTING)     │
        │ - generate() EXISTS       │
        │ - [NEW] length param      │
        │ - [NEW] context param     │
        └───────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ Storage Service           │
        │ - [NEW] Prompt history    │
        │ - [NEW] Generate settings │
        └───────────────────────────┘
```

### Data Flow

1. **User enters prompt** → Component state updates
2. **User selects length** → Component state updates
3. **User clicks Generate** → 
   - Check context awareness setting
   - If enabled, prepend previous prompt
   - Call `aiService.generate()` with prompt + length hint
   - Save prompt to history
   - Update context
   - Display result
4. **User clicks history item** → Populate prompt input
5. **User stars/deletes prompt** → Update IndexedDB

## Components and Interfaces

### Generate Panel Component (EXTEND EXISTING)

**File:** `src/components/GeneratePanel.tsx` (ALREADY EXISTS)

**Current State (DO NOT CHANGE):**
```typescript
// EXISTING state - keep as is
const [prompt, setPrompt] = useState('');
const [isProcessing, setIsProcessing] = useState(false);
const [error, setError] = useState<string | null>(null);
const [isMockProvider, setIsMockProvider] = useState(false);
const [isRecording, setIsRecording] = useState(false);
const [versions, setVersions] = useState<Version[]>([]);
const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
```

**NEW State to Add:**
```typescript
// ADD these new state variables
const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
const [currentContext, setCurrentContext] = useState<string | null>(null);
const [generateSettings, setGenerateSettings] = useState<GenerateSettings | null>(null);
```

**UI Changes (ADD to existing structure):**

The existing GeneratePanel has:
- VersionCarousel (results display) - KEEP
- Prompt input with voice button and generate button inline - KEEP
- Error/mock provider notices - KEEP

**MODIFY the prompt input area:**

```tsx
{/* MODIFIED: Prompt input with integrated controls */}
<div style={{ position: 'relative', marginBottom: '16px' }}>
  <input
    ref={promptInputRef}
    type="text"
    className="flint-input"
    placeholder="Ask anything..."
    value={prompt}
    onChange={(e) => handlePromptChange(e.target.value)}
    onFocus={handlePromptFocus}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
        e.preventDefault();
        handleGenerate();
      }
    }}
    disabled={isProcessing}
    style={{
      width: '100%',
      height: '48px',
      padding: '0 140px 0 16px', // Space for length + voice + generate buttons
    }}
  />

  {/* NEW: Length selector button (inside input, left of voice button) */}
  <button
    className="length-selector-btn"
    onClick={() => setShowLengthDropdown(!showLengthDropdown)}
    disabled={isProcessing}
    title={`Length: ${selectedLength}`}
    style={{
      position: 'absolute',
      top: '50%',
      right: '100px',
      transform: 'translateY(-50%)',
      width: '36px',
      height: '36px',
    }}
  >
    {getLengthIcon(selectedLength)}
  </button>

  {/* EXISTING: Voice button (inside input) */}
  {/* EXISTING: Generate button (inside input) */}

  {/* NEW: Length dropdown (appears below button when open) */}
  {showLengthDropdown && (
    <div className="length-dropdown" style={{ position: 'absolute', top: '52px', right: '100px' }}>
      <button onClick={() => selectLength('short')}>Short (~500 chars)</button>
      <button onClick={() => selectLength('medium')}>Medium (~1500 chars)</button>
      <button onClick={() => selectLength('long')}>Long (unlimited)</button>
    </div>
  )}

  {/* NEW: Prompt history dropdown (appears below input when focused and empty) */}
  {showPromptHistory && promptHistory.length > 0 && (
    <div className="prompt-history-dropdown" style={{ position: 'absolute', top: '52px', left: 0, right: 0 }}>
      {promptHistory.slice(0, 5).map(item => (
        <div key={item.id} className="history-item">
          <button onClick={() => selectPrompt(item.text)} style={{ flex: 1 }}>
            {item.text}
          </button>
          <button onClick={() => handleTogglePin(item.id)}>
            {item.pinned ? '★' : '☆'}
          </button>
          <button onClick={() => handleDeletePrompt(item.id)}>×</button>
        </div>
      ))}
    </div>
  )}
</div>

{/* NO context banner - context is handled invisibly */}
{/* EXISTING: Error and mock provider notices */}
```

**NEW Methods to Add:**
- `handleTogglePin(id)` - Pin/unpin prompt in history
- `handleDeletePrompt(id)` - Remove prompt from history
- `handlePromptFocus()` - Show history dropdown when field is empty
- `selectPrompt(text)` - Load prompt from history and close dropdown
- `selectLength(length)` - Set length and close dropdown
- `getLengthIcon(length)` - Return icon for current length
- `generateOutputSummary(text)` - Create summary of generated output for context
- `loadPromptHistory()` - Load history on mount
- `loadGenerateSettings()` - Load settings on mount

**MODIFY Existing Method:**
- `handleGenerate()` - Add context awareness (using output summary) and length hint logic

### AI Service Extension

**File:** `src/services/ai.ts` (ALREADY EXISTS)

**EXISTING Method (DO NOT RECREATE):**
```typescript
// This already exists - we just need to extend GenerateOptions
static async generate(prompt: string, options: GenerateOptions = {}): Promise<string>
```

**EXTEND Existing Interface:**
```typescript
// Current GenerateOptions interface - ADD new fields
interface GenerateOptions {
  pinnedNotes?: string[]; // EXISTING - keep
  length?: 'short' | 'medium' | 'long'; // NEW - add
  lengthHint?: number; // NEW - add (character count)
  context?: string; // NEW - add (previous prompt)
}
```

**Implementation Changes (MODIFY existing generate() method):**

The `generate()` method already exists. We only need to ADD context and length handling:

```typescript
// MODIFY existing generate() method to add these steps:

// 1. Build prompt with context from previous OUTPUT summary (ADD THIS)
let fullPrompt = prompt;
if (options.context) {
  fullPrompt = `Previous output summary: ${options.context}\n\nNew request: ${prompt}`;
}

// 2. Add length hint (ADD THIS)
if (options.length && options.length !== 'long' && options.lengthHint) {
  fullPrompt += `\n\nTarget length: approximately ${options.lengthHint} characters`;
}

// 3. Merge pinned notes (ALREADY EXISTS - keep as is)
if (options.pinnedNotes && options.pinnedNotes.length > 0) {
  fullPrompt += `\n\nContext notes:\n${options.pinnedNotes.join('\n')}`;
}

// 4. Call Writer/Prompt API (ALREADY EXISTS - keep as is)
// ... existing API call logic

// 5. Mock provider (ALREADY EXISTS - modify to remove lighthouse text)
// Return simple, length-appropriate mock text without default stories
```

**NEW METHOD NEEDED:**
```typescript
// Add method to generate output summary for context
static async summarizeOutput(text: string): Promise<string> {
  // Use AI to create a one-sentence summary of the generated output
  // This summary will be used as context for the next generation
  const summaryPrompt = `Summarize the following text in one concise sentence (max 100 characters): ${text.slice(0, 500)}`;
  try {
    const summary = await this.generate(summaryPrompt, { length: 'short', lengthHint: 100 });
    return summary;
  } catch {
    // Fallback: use first 100 chars of output
    return text.slice(0, 100) + '...';
  }
}
```

### Storage Service Extension

**File:** `src/services/storage.ts` (extend existing)

**New Interfaces:**
```typescript
interface PromptHistoryItem {
  id: string; // UUID
  text: string;
  timestamp: number;
  pinned: boolean;
}

interface GenerateSettings {
  shortLength: number; // Default: 500
  mediumLength: number; // Default: 1500
  contextAwarenessEnabled: boolean; // Default: true
}
```

**New Methods:**
```typescript
interface StorageService {
  // ... existing methods
  
  // Prompt History
  getPromptHistory(limit?: number): Promise<PromptHistoryItem[]>;
  savePromptToHistory(text: string): Promise<void>;
  togglePromptPin(id: string): Promise<void>;
  deletePromptFromHistory(id: string): Promise<void>;
  cleanupOldPrompts(): Promise<void>;
  
  // Generate Settings
  getGenerateSettings(): Promise<GenerateSettings>;
  saveGenerateSettings(settings: GenerateSettings): Promise<void>;
}
```

**IndexedDB Schema Extension:**

Add new object store to existing database:

```typescript
const db = await openDB('FlintDB', 2, {
  upgrade(db, oldVersion) {
    // ... existing stores (pinnedNotes, history)
    
    if (oldVersion < 2) {
      // Create promptHistory store
      const promptStore = db.createObjectStore('promptHistory', {
        keyPath: 'id'
      });
      promptStore.createIndex('timestamp', 'timestamp');
      promptStore.createIndex('pinned', 'pinned');
    }
  }
});
```

**Implementation Details:**

1. **getPromptHistory():**
   - Query promptHistory store
   - Sort by pinned (true first), then timestamp (newest first)
   - Limit to specified count (default 5)
   - Return array of PromptHistoryItem

2. **savePromptToHistory():**
   - Create new PromptHistoryItem with UUID
   - Set pinned = false, timestamp = Date.now()
   - Add to promptHistory store
   - Check total count, delete oldest unpinned if > 50

3. **togglePromptPin():**
   - Get item by id
   - Toggle pinned boolean
   - Update in store

4. **deletePromptFromHistory():**
   - Delete item by id from store

5. **cleanupOldPrompts():**
   - Query all unpinned prompts
   - Filter items older than 30 days
   - Delete from store

6. **getGenerateSettings():**
   - Read from chrome.storage.local key 'generateSettings'
   - Return defaults if not found

7. **saveGenerateSettings():**
   - Write to chrome.storage.local key 'generateSettings'

### Settings Component Extension

**File:** `src/components/Settings.tsx` (extend existing)

**New Section:**
```tsx
<div className="settings-section">
  <h3>Generate Panel</h3>
  
  {/* Length Presets */}
  <div className="setting-group">
    <label>Short Length (characters)</label>
    <input
      type="number"
      min="100"
      max="10000"
      value={generateSettings.shortLength}
      onChange={handleShortLengthChange}
    />
    {shortLengthError && <span className="error">{shortLengthError}</span>}
  </div>
  
  <div className="setting-group">
    <label>Medium Length (characters)</label>
    <input
      type="number"
      min="100"
      max="10000"
      value={generateSettings.mediumLength}
      onChange={handleMediumLengthChange}
    />
    {mediumLengthError && <span className="error">{mediumLengthError}</span>}
  </div>
  
  {/* Context Awareness */}
  <div className="setting-group">
    <label>
      <input
        type="checkbox"
        checked={generateSettings.contextAwarenessEnabled}
        onChange={handleContextToggle}
      />
      Use previous prompt as context
    </label>
    <p className="setting-description">
      When enabled, the AI will reference your last prompt to understand follow-up requests like "make another"
    </p>
  </div>
</div>
```

**Validation Logic:**
```typescript
function validateLengthInput(value: number): string | null {
  if (isNaN(value)) return 'Length must be a number';
  if (value < 100) return 'Length must be at least 100 characters';
  if (value > 10000) return 'Length must be at most 10000 characters';
  return null;
}
```

### State Management Extension

**File:** `src/state/store.ts` (extend existing)

**State Extension:**
```typescript
interface AppState {
  // ... existing state
  
  // Generate panel state
  generateSettings: GenerateSettings;
  promptHistory: PromptHistoryItem[];
  currentContext: string | null;
}
```

**New Actions:**
```typescript
// src/state/actions.ts
export const actions = {
  // ... existing actions
  
  // Generate settings
  setGenerateSettings(settings: GenerateSettings): void;
  
  // Prompt history
  loadPromptHistory(): Promise<void>;
  addPromptToHistory(text: string): Promise<void>;
  togglePromptPin(id: string): Promise<void>;
  deletePromptFromHistory(id: string): Promise<void>;
  
  // Context
  setCurrentContext(text: string | null): void;
};
```

## Data Models

### PromptHistoryItem

```typescript
interface PromptHistoryItem {
  id: string;                    // UUID
  text: string;                  // User's prompt text
  timestamp: number;             // Unix timestamp (ms)
  pinned: boolean;               // Whether user starred this prompt
}
```

**Storage:** IndexedDB `promptHistory` object store

**Indexes:**
- Primary key: `id`
- Index: `timestamp` (for sorting)
- Index: `pinned` (for filtering)

### GenerateSettings

```typescript
interface GenerateSettings {
  shortLength: number;           // Default: 500
  mediumLength: number;          // Default: 1500
  contextAwarenessEnabled: boolean; // Default: true
}
```

**Storage:** chrome.storage.local under key `generateSettings`

**Defaults:**
```typescript
const DEFAULT_GENERATE_SETTINGS: GenerateSettings = {
  shortLength: 500,
  mediumLength: 1500,
  contextAwarenessEnabled: true
};
```

## Error Handling

### Error Scenarios and Recovery

**1. Empty Prompt**
- Detection: Check `promptText.trim().length === 0`
- Recovery: Show inline error, disable Generate button
- Message: "Please enter a prompt"

**2. AI Generation Failure**
- Detection: Catch exception from `aiService.generate()`
- Recovery: Display error banner with retry button
- Message: Use error message from AI service

**3. Generation Timeout**
- Detection: Promise timeout after 10 seconds
- Recovery: Cancel request, show error with retry
- Message: "Generation timed out. Please try a shorter prompt."

**4. No Context Available**
- Detection: `contextAwarenessEnabled === true` but `currentContext === null`
- Recovery: Process prompt without context (no error)
- Message: None (silent fallback)

**5. Storage Failure**
- Detection: Catch exception from storage service
- Recovery: Log error, continue without saving history
- Message: None (silent fallback, log to console)

**6. Invalid Length Setting**
- Detection: Validate input on change
- Recovery: Show inline error, don't save
- Message: "Length must be between 100 and 10000 characters"

**7. Empty History**
- Detection: `promptHistory.length === 0`
- Recovery: Show empty state message
- Message: "No recent prompts"

## UI/UX Design

### Integrated Prompt Input

**Visual Design:**
- Single-line text input with integrated controls
- Length selector button (left side of inline buttons)
- Voice button (middle of inline buttons)
- Generate button (right side of inline buttons)
- All buttons positioned inside the input field on the right
- Clean, minimal appearance

**Behavior:**
- Click input when empty → show prompt history dropdown
- Type any character → hide prompt history dropdown
- Click length button → toggle length dropdown
- Click outside → close all dropdowns

**CSS:**
```css
.prompt-input-container {
  position: relative;
  margin-bottom: 16px;
}

.prompt-input-container input {
  width: 100%;
  height: 48px;
  padding: 0 140px 0 16px; /* Space for 3 buttons */
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--fs-md);
}

.prompt-input-container .inline-buttons {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
}

.prompt-input-container button {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Length Selector Dropdown

**Visual Design:**
- Compact dropdown menu
- Appears below the length button
- Shows icon for each length option
- Highlights current selection

**Behavior:**
- Click length button → toggle dropdown
- Click option → select and close
- Click outside → close

**Icons:**
- Short: ⚡ (lightning bolt)
- Medium: ≈ (approximately equal)
- Long: ∞ (infinity)

**CSS:**
```css
.length-dropdown {
  position: absolute;
  top: 52px;
  right: 100px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
  min-width: 180px;
}

.length-dropdown button {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.length-dropdown button:hover {
  background: var(--surface-2);
}

.length-dropdown button.selected {
  background: var(--accent-surface);
  color: var(--accent);
}
```

### Prompt History Dropdown

**Visual Design:**
- Dropdown appears below prompt input
- Full width of input field
- Each item shows prompt text with star and X icons
- Pinned items at top with filled star
- Smooth appearance animation

**Behavior:**
- Appears when input is focused and empty
- Click prompt → load into input and close
- Click star → toggle pin (stays open)
- Click X → delete (stays open)
- Type anything → close
- Click outside → close

**CSS:**
```css
.prompt-history-dropdown {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-muted);
  transition: background 0.15s;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: var(--surface-2);
}

.history-item button:first-child {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  font-size: var(--fs-md);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 4px;
}

.history-item button:not(:first-child) {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  flex-shrink: 0;
}

.history-item button:not(:first-child):hover {
  color: var(--accent);
}
```

### No Context Banner

**Design Decision:**
- Context is tracked automatically in the background
- No visible UI for context
- User doesn't need to see or manage context
- Cleaner, less cluttered interface

## Implementation Workflow

### Phase 1: Storage Extension (NEW functionality only)

1. **Add to storage service (`src/services/storage.ts`):**
   - Add PromptHistoryItem interface
   - Add GenerateSettings interface
   - Upgrade IndexedDB schema to add promptHistory store
   - Add prompt history CRUD methods (get, save, togglePin, delete, cleanup)
   - Add generate settings methods (get, save)

2. **Extend Settings component (`src/components/Settings.tsx`):**
   - Add "Generate Panel" section
   - Add length input fields (Short/Medium) with validation
   - Add context awareness toggle
   - Wire up to storage service

### Phase 2: AI Service Extension (MODIFY existing)

1. **Modify `generate()` method in `src/services/ai.ts`:**
   - Extend GenerateOptions interface (add length, lengthHint, context)
   - Add context prepending logic before API call
   - Add length hint to prompt
   - Update mock provider to respect length

### Phase 3: GeneratePanel Component (EXTEND existing)

1. **Add new state to `src/components/GeneratePanel.tsx`:**
   - selectedLength
   - showLengthDropdown
   - promptHistory
   - showPromptHistory
   - currentContext (output summary, not visible to user)
   - generateSettings

2. **Modify prompt input UI:**
   - Add length selector button inside input field
   - Add length dropdown (appears below button)
   - Add prompt history dropdown (appears below input when focused and empty)
   - Remove any separate context banner UI

3. **Add new methods:**
   - handlePromptFocus() - Show history when field is empty
   - selectPrompt(text) - Load prompt and close dropdown
   - selectLength(length) - Set length and close dropdown
   - getLengthIcon(length) - Return icon for current length
   - generateOutputSummary(text) - Create summary for context
   - loadPromptHistory()
   - loadGenerateSettings()
   - handleTogglePin()
   - handleDeletePrompt()

4. **Modify existing handleGenerate():**
   - Load settings to get length hints
   - Build context-aware prompt using OUTPUT SUMMARY (not user's previous prompt)
   - Pass length and context to AI service
   - Save prompt to history after generation
   - Generate output summary and store as currentContext

5. **Add useEffect hooks:**
   - Load prompt history on mount
   - Load generate settings on mount
   - Close dropdowns when clicking outside

### Phase 4: Testing

1. **Test storage:**
   - Verify IndexedDB upgrade
   - Test prompt history CRUD
   - Test settings persistence

2. **Test AI service:**
   - Test context prepending
   - Test length hints
   - Test with different APIs

3. **Test GeneratePanel:**
   - Test length selection
   - Test prompt history interactions
   - Test context awareness on/off
   - Test pin/unpin/delete
   - Test settings changes apply

4. **Test integration:**
   - Full workflow with context
   - History persistence across sessions
   - Settings changes reflected in UI

## Testing Strategy

### Unit Tests

**Storage Service:**
- Test prompt history CRUD operations
- Test cleanup of old prompts (30 days)
- Test 50-item limit enforcement
- Test pinned prompt persistence
- Test generate settings save/load

**AI Service:**
- Test generate() with context
- Test generate() without context
- Test length hint formatting
- Test API fallback chain
- Test timeout handling
- Test mock provider

**GeneratePanel Component:**
- Test prompt input validation
- Test length selection
- Test history item click
- Test pin/unpin toggle
- Test delete confirmation
- Test context banner dismiss
- Test generate button disabled state

### Integration Tests

**Full Generation Flow:**
1. User enters prompt
2. Selects length
3. Clicks Generate
4. Result appears
5. Prompt saved to history
6. Context updated

**Context Awareness Flow:**
1. Generate with prompt "Make a song"
2. Verify context stored
3. Generate with prompt "Make another"
4. Verify AI receives "Previous request: Make a song\n\nNew request: Make another"

**History Management Flow:**
1. Generate 5 prompts
2. Verify all appear in history
3. Pin one prompt
4. Generate 50 more prompts
5. Verify pinned prompt persists
6. Verify oldest unpinned deleted

### Manual Testing Checklist

- [ ] Generate short content (verify ~500 chars)
- [ ] Generate medium content (verify ~1500 chars)
- [ ] Generate long content (verify no limit)
- [ ] Customize length settings
- [ ] Toggle context awareness on/off
- [ ] Use follow-up prompt with context
- [ ] Click history item to load
- [ ] Pin/unpin prompts
- [ ] Delete prompt with confirmation
- [ ] Clear context banner
- [ ] Copy result to clipboard
- [ ] Insert result into page
- [ ] Test with AI unavailable (mock)
- [ ] Test empty prompt validation
- [ ] Test generation timeout

## Performance Considerations

**Bundle Size Impact:**
- New component: ~5 KB
- Storage extension: ~2 KB
- AI service extension: ~3 KB
- Total: ~10 KB (well within 1 MB budget)

**Runtime Performance:**
- IndexedDB queries: <10ms for 50 items
- Context prepending: <1ms
- History rendering: <5ms for 5 items
- No performance concerns

**Storage Usage:**
- Prompt history: ~50 items × 200 bytes = 10 KB
- Generate settings: <1 KB
- Total: ~11 KB (negligible)

## Security Considerations

**Input Sanitization:**
- Escape HTML in prompt text before display
- Use `textContent` for history items
- Validate length settings (100-10000)

**Storage Security:**
- Prompt history stored locally (IndexedDB)
- No sensitive data transmission
- No external API calls

**Privacy:**
- All processing local (Chrome built-in AI)
- Prompt history never leaves device
- User can delete history anytime

## Migration and Compatibility

**Database Migration:**
- Upgrade FlintDB from v1 to v2
- Add promptHistory object store
- Existing data (pinnedNotes, history) unaffected

**Settings Migration:**
- Add generateSettings key to chrome.storage.local
- Use defaults if not present
- No breaking changes to existing settings

**Backward Compatibility:**
- New features don't affect existing panels
- Generate panel is additive (new tab)
- No changes to existing APIs

## Future Enhancements (Out of Scope)

- Full conversation history (multi-turn context)
- Prompt templates library
- Export/import prompt history
- Prompt categories/tags
- Collaborative prompt sharing
- Advanced length controls (word count, sentence count)
- Streaming generation with partial results
