/**
 * Content Script Coordinator
 * 
 * Main entry point for content scripts injected into web pages.
 * Coordinates between SelectionHandler, CaretHandler, and MiniBarInjector
 * to provide text selection, manipulation, and mini bar functionality.
 * 
 * @module content/contentScript
 */

import { createSelectionHandler, SelectionHandler } from './selection';
import { createCaretHandler, CaretHandler, InsertionResult } from './caret';
import { createMiniBarInjector, MiniBarInjector } from './injector';

/**
 * Message types for communication with panel and background
 */
type MessageType = 
  | 'GET_SELECTION'
  | 'GET_CURSOR_CONTEXT'
  | 'INSERT_TEXT'
  | 'REPLACE_TEXT'
  | 'SHOW_MINI_BAR'
  | 'HIDE_MINI_BAR'
  | 'SHOW_MINIBAR_FROM_STORAGE';

/**
 * Message structure for content script communication
 */
interface ContentScriptMessage {
  type: MessageType;
  payload?: any;
}

/**
 * Response structure for message handlers
 */
interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Main content script coordinator class
 * Manages all content script functionality and message handling
 */
class ContentScriptCoordinator {
  private selectionHandler: SelectionHandler;
  private caretHandler: CaretHandler;
  private miniBarInjector: MiniBarInjector;
  private readonly SELECTION_THRESHOLD = 3; // Minimum characters to show mini bar
  private selectionDebounceTimer: number | null = null;
  private lastSelectionText = '';
  private isPanelOpen = false;

  constructor() {
    // Initialize handlers
    this.selectionHandler = createSelectionHandler();
    this.caretHandler = createCaretHandler();
    this.miniBarInjector = createMiniBarInjector();

    // Set up event listeners
    this.setupSelectionListener();
    this.setupMessageListener();
    this.setupPanelStateListener();

    // Check if we're on Google Docs
    if (this.isGoogleDocs()) {
      console.log('[Flint] Google Docs detected - mini bar may not work due to custom editor');
    }

    console.log('[Flint] Content script initialized');
  }

  /**
   * Check if current page is Google Docs
   */
  private isGoogleDocs(): boolean {
    return window.location.hostname === 'docs.google.com' && 
           window.location.pathname.startsWith('/document/');
  }

  /**
   * Set up listener for panel open/close state
   * Checks periodically if panel is open by pinging it
   */
  private setupPanelStateListener(): void {
    // Check panel state every 2 seconds (reduced from 500ms to minimize overhead)
    setInterval(() => {
      chrome.runtime.sendMessage(
        { type: 'PING_PANEL', source: 'content-script' },
        (response) => {
          const wasOpen = this.isPanelOpen;
          this.isPanelOpen = !chrome.runtime.lastError && response?.success === true;
          
          // If panel was just opened, clear any existing selection
          if (!wasOpen && this.isPanelOpen) {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }
            this.miniBarInjector.hide();
            this.lastSelectionText = '';
          }
          
          // If panel was just closed, hide mini bar
          if (wasOpen && !this.isPanelOpen) {
            this.miniBarInjector.hide();
          }
        }
      );
    }, 2000);
  }

  /**
   * Set up listener for text selection changes
   * Shows minibar when text is selected (with debouncing for stability)
   */
  private setupSelectionListener(): void {
    this.selectionHandler.onSelectionChange((text: string) => {
      // Clear any pending timer
      if (this.selectionDebounceTimer !== null) {
        clearTimeout(this.selectionDebounceTimer);
        this.selectionDebounceTimer = null;
      }

      // Hide mini bar immediately if selection is too short or empty
      if (!text || text.length < this.SELECTION_THRESHOLD) {
        this.miniBarInjector.hide();
        this.lastSelectionText = '';
        return;
      }

      // Skip mini bar on Google Docs (doesn't work reliably)
      if (this.isGoogleDocs()) {
        console.log('[Flint] Skipping mini bar on Google Docs - use keyboard shortcuts or copy/paste instead');
        return;
      }

      // Debounce showing the mini bar to avoid flashing during fast selections
      this.selectionDebounceTimer = window.setTimeout(() => {
        // Double-check selection is still valid
        const currentText = this.selectionHandler.getSelectedText();
        if (!currentText || currentText.length < this.SELECTION_THRESHOLD) {
          return;
        }

        // Only show mini bar if panel is open
        if (!this.isPanelOpen) {
          return;
        }

        // Only update if selection has changed
        if (currentText === this.lastSelectionText && this.miniBarInjector.isVisible()) {
          return;
        }

        this.lastSelectionText = currentText;

        // Show mini bar near selection
        this.showMiniBar();
      }, 200); // Wait 200ms for selection to stabilize
    });
  }

  /**
   * Set up listener for messages from panel and background
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (
        message: ContentScriptMessage,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageResponse) => void
      ) => {
        // Handle messages asynchronously
        this.handleMessage(message)
          .then(sendResponse)
          .catch((error) => {
            console.error('[Flint] Error handling message:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });

        // Return true to indicate async response
        return true;
      }
    );
  }

  /**
   * Handle incoming messages from panel and background
   */
  private async handleMessage(message: ContentScriptMessage): Promise<MessageResponse> {
    console.log('[Flint] Received message:', message.type);

    switch (message.type) {
      case 'GET_SELECTION':
        return this.handleGetSelection();

      case 'GET_CURSOR_CONTEXT':
        return this.handleGetCursorContext(message.payload?.maxLength);

      case 'INSERT_TEXT':
        return this.handleInsertText(message.payload?.text);

      case 'REPLACE_TEXT':
        return this.handleReplaceText(message.payload?.text);

      case 'SHOW_MINI_BAR':
        return this.handleShowMiniBar();

      case 'HIDE_MINI_BAR':
        return this.handleHideMiniBar();

      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`
        };
    }
  }

  /**
   * Handle GET_SELECTION message
   * Returns the currently selected text
   */
  private handleGetSelection(): MessageResponse {
    try {
      const selectedText = this.selectionHandler.getSelectedText();

      if (!selectedText) {
        return {
          success: false,
          error: 'No text selected'
        };
      }

      return {
        success: true,
        data: {
          text: selectedText,
          isEditable: this.selectionHandler.isEditableSelection()
        }
      };
    } catch (error) {
      console.error('[Flint] Error getting selection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get selection'
      };
    }
  }

  /**
   * Handle GET_CURSOR_CONTEXT message
   * Returns text context around the cursor for generation
   */
  private handleGetCursorContext(maxLength?: number): MessageResponse {
    try {
      const context = this.caretHandler.getCursorContext(maxLength);

      if (!context) {
        return {
          success: false,
          error: 'No cursor position found or not in editable field'
        };
      }

      return {
        success: true,
        data: context
      };
    } catch (error) {
      console.error('[Flint] Error getting cursor context:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cursor context'
      };
    }
  }

  /**
   * Handle INSERT_TEXT message
   * Inserts text at the current caret position
   */
  private async handleInsertText(text: string): Promise<MessageResponse> {
    try {
      if (!text) {
        return {
          success: false,
          error: 'No text provided for insertion'
        };
      }

      // Insert text at caret position
      const result: InsertionResult = await this.caretHandler.insertAtCaret(text);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to insert text'
        };
      }

      // Return success with clipboard fallback info
      return {
        success: true,
        data: {
          usedClipboard: result.usedClipboard,
          message: result.usedClipboard
            ? 'Text copied to clipboard. Please paste it manually.'
            : 'Text inserted successfully'
        }
      };
    } catch (error) {
      console.error('[Flint] Error inserting text:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert text'
      };
    }
  }

  /**
   * Handle REPLACE_TEXT message
   * Replaces the currently selected text with new text
   */
  private async handleReplaceText(text: string): Promise<MessageResponse> {
    try {
      if (!text) {
        return {
          success: false,
          error: 'No text provided for replacement'
        };
      }

      // Check if there's a selection to replace
      const selectedText = this.selectionHandler.getSelectedText();
      if (!selectedText) {
        return {
          success: false,
          error: 'No text selected to replace'
        };
      }

      // Replace selected text
      const result: InsertionResult = await this.caretHandler.replaceSelection(text);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to replace text'
        };
      }

      // Hide mini bar after successful replacement
      this.miniBarInjector.hide();

      // Return success with clipboard fallback info
      return {
        success: true,
        data: {
          usedClipboard: result.usedClipboard,
          message: result.usedClipboard
            ? 'Text copied to clipboard. Please paste it manually to replace the selection.'
            : 'Text replaced successfully'
        }
      };
    } catch (error) {
      console.error('[Flint] Error replacing text:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to replace text'
      };
    }
  }

  /**
   * Handle SHOW_MINI_BAR message
   * Shows the mini bar at the current selection position
   */
  private handleShowMiniBar(): MessageResponse {
    try {
      this.showMiniBar();

      return {
        success: true,
        data: { message: 'Mini bar shown' }
      };
    } catch (error) {
      console.error('[Flint] Error showing mini bar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to show mini bar'
      };
    }
  }

  /**
   * Handle HIDE_MINI_BAR message
   * Hides the mini bar
   */
  private handleHideMiniBar(): MessageResponse {
    try {
      this.miniBarInjector.hide();

      return {
        success: true,
        data: { message: 'Mini bar hidden' }
      };
    } catch (error) {
      console.error('[Flint] Error hiding mini bar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hide mini bar'
      };
    }
  }

  /**
   * Show the mini bar near the current selection
   * Sets up callbacks for mini bar button actions
   */
  private showMiniBar(): void {
    this.miniBarInjector.show({
      onGenerate: () => {
        // Get selected text and send to panel to insert (not replace)
        const text = this.selectionHandler.getSelectedText();
        if (text) {
          this.sendMessageToPanel('INSERT_AND_OPEN_GENERATE', { text });
          this.miniBarInjector.hide();
        }
      },
      onSummarize: () => {
        // Get selected text and send to panel to insert and open summarize tool
        const text = this.selectionHandler.getSelectedText();
        if (text) {
          this.sendMessageToPanel('INSERT_AND_OPEN_SUMMARY', { text });
          this.miniBarInjector.hide();
        }
      },
      onRewrite: () => {
        // Get selected text and send to panel to insert and open rewrite tool
        const text = this.selectionHandler.getSelectedText();
        if (text) {
          this.sendMessageToPanel('INSERT_AND_OPEN_REWRITE', { text });
          this.miniBarInjector.hide();
        }
      },
      onClose: () => {
        this.miniBarInjector.hide();
        this.selectionHandler.clearPreservedSelection();
      }
    });
  }

  /**
   * Send a message to the panel via background worker
   * Used for mini bar button actions
   * 
   * Note: Messages are sent with source='content-script' so the background
   * script knows to forward them to the panel. This prevents double-delivery.
   */
  private sendMessageToPanel(type: string, payload?: any): void {
    console.log('[Flint] Sending message to background for panel relay:', type);
    chrome.runtime.sendMessage(
      {
        type,
        payload,
        source: 'content-script'
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Flint] Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('[Flint] Message relayed successfully:', type, response);
        }
      }
    );
  }
}

// Initialize the content script coordinator when script loads
const coordinator = new ContentScriptCoordinator();

// Export for testing purposes
export default coordinator;
