# Panel-to-Content Script Communication

This document describes how the Flint extension communicates between the side panel and content scripts.

## Architecture

The messaging system uses Chrome's message passing API with the following flow:

```
Panel Component
    ↓ (uses messagingService)
MessagingService
    ↓ (chrome.runtime.sendMessage with source: 'panel')
Background Service Worker
    ↓ (forwards to active tab)
Content Script
    ↓ (processes message and returns response)
Background Service Worker
    ↓ (forwards response back)
MessagingService
    ↓ (returns result to component)
Panel Component
```

## Message Types

### GET_SELECTION
Retrieves the currently selected text from the active tab.

**Request:**
```typescript
{
  type: 'GET_SELECTION',
  source: 'panel'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    text: string,
    isEditable: boolean
  }
}
```

### INSERT_TEXT
Inserts text at the current caret position in the active tab.

**Request:**
```typescript
{
  type: 'INSERT_TEXT',
  payload: { text: string },
  source: 'panel'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    usedClipboard: boolean,
    message: string
  }
}
```

### REPLACE_TEXT
Replaces the currently selected text with new text.

**Request:**
```typescript
{
  type: 'REPLACE_TEXT',
  payload: { text: string },
  source: 'panel'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    usedClipboard: boolean,
    message: string
  }
}
```

### SHOW_MINI_BAR
Shows the mini bar at the current selection position.

**Request:**
```typescript
{
  type: 'SHOW_MINI_BAR',
  source: 'panel'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    message: string
  }
}
```

### HIDE_MINI_BAR
Hides the mini bar.

**Request:**
```typescript
{
  type: 'HIDE_MINI_BAR',
  source: 'panel'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    message: string
  }
}
```

## Usage Examples

### In Panel Components

Import the messaging service:

```typescript
import { messagingService } from '../services/messaging';
```

#### Get Selected Text

```typescript
try {
  const { text, isEditable } = await messagingService.getSelection();
  console.log('Selected text:', text);
  console.log('Is editable:', isEditable);
} catch (error) {
  console.error('Failed to get selection:', error);
}
```

#### Insert Text at Caret

```typescript
try {
  const result = await messagingService.insertText('Hello, world!');
  
  if (result.success) {
    if (result.usedClipboard) {
      alert('Text copied to clipboard. Please paste it manually.');
    } else {
      console.log('Text inserted successfully');
    }
  } else {
    console.error('Insert failed:', result.error);
  }
} catch (error) {
  console.error('Error inserting text:', error);
}
```

#### Replace Selected Text

```typescript
try {
  const result = await messagingService.replaceText('New text');
  
  if (result.success) {
    if (result.usedClipboard) {
      alert('Text copied to clipboard. Please paste it to replace the selection.');
    } else {
      console.log('Text replaced successfully');
    }
  } else {
    console.error('Replace failed:', result.error);
  }
} catch (error) {
  console.error('Error replacing text:', error);
}
```

#### Show/Hide Mini Bar

```typescript
// Show mini bar
try {
  const result = await messagingService.showMiniBar();
  console.log('Mini bar shown:', result.success);
} catch (error) {
  console.error('Error showing mini bar:', error);
}

// Hide mini bar
try {
  const result = await messagingService.hideMiniBar();
  console.log('Mini bar hidden:', result.success);
} catch (error) {
  console.error('Error hiding mini bar:', error);
}
```

## Error Handling

The messaging service handles various error scenarios:

### Extension Context Invalidated
Occurs when the extension is reloaded while the panel is open.

**Error message:** "Extension was reloaded. Please refresh the page and try again."

**Recovery:** User must refresh the page to reinitialize the content script.

### Content Script Not Loaded
Occurs when the content script hasn't been injected into the page yet.

**Error message:** "Content script not loaded. Please refresh the page and try again."

**Recovery:** User must refresh the page to load the content script.

### No Active Tab
Occurs when there's no active tab or the tab is inaccessible.

**Error message:** "No active tab found. Please make sure you have a tab open."

**Recovery:** User must open a tab and try again.

### Restricted Page
Occurs when trying to access browser internal pages (chrome://, edge://, etc.).

**Error message:** "Cannot access this page. Flint does not work on browser internal pages."

**Recovery:** User must navigate to a regular web page.

### Clipboard Fallback
Occurs when direct text insertion/replacement fails (e.g., in Google Docs).

**Behavior:** Text is automatically copied to clipboard and user is notified.

**User action:** User must manually paste the text.

## Implementation Details

### MessagingService Class

The `MessagingService` class provides a clean API for panel components to communicate with content scripts. It:

1. Wraps Chrome's message passing API
2. Adds proper TypeScript types
3. Handles errors gracefully
4. Provides user-friendly error messages
5. Supports clipboard fallback

### Background Worker Routing

The background service worker acts as a message router:

1. Receives messages from panel (source: 'panel')
2. Forwards messages to content script in active tab
3. Receives responses from content script
4. Forwards responses back to panel

### Content Script Handlers

The content script coordinator handles incoming messages:

1. Validates message type
2. Executes appropriate action (get selection, insert text, etc.)
3. Returns structured response with success/error status
4. Implements clipboard fallback when direct manipulation fails

## Testing

To test the messaging system:

1. Load the extension in Chrome
2. Open the side panel
3. Navigate to a web page with text
4. Try each operation:
   - Select text and check if it's captured
   - Insert text from Voice Recorder
   - Rewrite text and accept changes
   - Verify clipboard fallback on unsupported pages

## Troubleshooting

### Messages Not Reaching Content Script

**Symptoms:** Operations fail with "Content script not loaded" error

**Solutions:**
- Refresh the page to reinitialize content script
- Check browser console for content script errors
- Verify content script is registered in background worker

### Text Insertion/Replacement Fails

**Symptoms:** Operations fail or use clipboard fallback

**Solutions:**
- Verify the target element is editable (textarea or contenteditable)
- Check if the page uses custom editors (Google Docs, etc.)
- Use clipboard fallback as intended behavior for complex editors

### Extension Context Invalidated

**Symptoms:** All operations fail with "Extension context invalidated" error

**Solutions:**
- Refresh the page after reloading the extension
- Close and reopen the side panel
- Restart the browser if issues persist
