# State Management

This directory contains the application state management using React Context.

## Files

- **store.ts** - Defines the AppState interface, actions interface, and context
- **actions.ts** - Action creators, action types, and reducer function for type-safe state updates
- **AppProvider.tsx** - Provider component that manages state and provides actions
- **index.ts** - Exports for easy importing

## Usage

### 1. Wrap your app with AppProvider

```tsx
import { AppProvider } from './state';

function App() {
  return (
    <AppProvider>
      <YourComponents />
    </AppProvider>
  );
}
```

### 2. Use the useAppState hook in components

```tsx
import { useAppState } from './state';

function MyComponent() {
  const { state, actions } = useAppState();

  // Access state
  console.log(state.activeTab);
  console.log(state.settings);
  console.log(state.pinnedNotes);

  // Use actions
  const handleClick = () => {
    actions.setActiveTab('voice');
    actions.setCurrentText('Hello world');
  };

  return <div>...</div>;
}
```

### 3. Using action creators and reducer (alternative approach)

For more complex state management or testing, you can use the action creators and reducer directly:

```tsx
import { useReducer } from 'react';
import { appReducer, initialState, setActiveTab, addPinnedNote } from './state';

function MyComponent() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const handleClick = () => {
    dispatch(setActiveTab('voice'));
    dispatch(addPinnedNote({
      id: '123',
      title: 'Note',
      content: 'Content',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  };

  return <div>...</div>;
}
```

## State Structure

```typescript
interface AppState {
  // UI state
  activeTab: Tab;
  isProcessing: boolean;

  // Data
  settings: Settings;
  pinnedNotes: PinnedNote[];
  history: HistoryItem[];

  // Current operation
  currentText: string;
  currentResult: string | null;

  // AI availability
  aiAvailability: AIAvailability;

  // Errors
  error: string | null;
}
```

## Available Actions

### UI Actions
- `setActiveTab(tab)` - Change active tab
- `setIsProcessing(boolean)` - Set processing state

### Settings Actions
- `setSettings(settings)` - Replace all settings
- `updateSettings(updates)` - Update specific settings (persists to storage)

### Pinned Notes Actions
- `setPinnedNotes(notes)` - Replace all notes
- `addPinnedNote(note)` - Add a new note
- `updatePinnedNote(id, updates)` - Update a note
- `deletePinnedNote(id)` - Delete a note

### History Actions
- `setHistory(history)` - Replace all history
- `addHistoryItem(item)` - Add a history item
- `clearHistory()` - Clear all history (persists to storage)

### Current Operation Actions
- `setCurrentText(text)` - Set current text being processed
- `setCurrentResult(result)` - Set current result

### AI Availability Actions
- `setAIAvailability(availability)` - Set AI availability status
- `checkAIAvailability()` - Check and update AI availability

### Error Actions
- `setError(error)` - Set error message

## Automatic Data Loading

The AppProvider automatically loads data on mount:
- Settings from chrome.storage.local
- Pinned notes from IndexedDB
- Recent history (last 50 items) from IndexedDB
- AI availability status

## Storage Persistence

The following actions automatically persist to storage:
- `updateSettings()` - Saves to chrome.storage.local
- `clearHistory()` - Clears IndexedDB history

Note: Pinned notes and history items should be persisted through the StorageService directly, then the state updated via actions.
