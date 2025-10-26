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
import { createMiniBarInjector, MiniBarInjector, Position } from './injector';

/**
 * Message types for communication with panel and background
 */
type MessageType = 
  | 'GET_SELECTION'
  | 'INSERT_TEXT'
  | 'REPLACE_TEXT'
  | 'SHOW_MINI_BAR'
  | 'HIDE_MINI_BAR';

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

  constructor() {
    // Initialize handlers
    this.selectionHandler = createSelectionHandler();
    this.caretHandler = createCaretHandler();
    this.miniBarInjector = createMiniBarInjector();

    // Set up event listeners
    this.setupSelectionListener();
    this.setupMessageListener();

    console.log('[Flint] Content script initialized');
  }

  /**
   * Set up listener for text selection changes
   * Shows mini bar when text is selected
   */
  private setupSelectionListener(): void {
    this.selectionHandler.onSelectionChange((text: string) => {
      // Hide mini bar if selection is too short or empty
      if (!text || text.length < this.SELECTION_THRESHOLD) {
        this.miniBarInjector.hide();
        return;
      }

      // Get selection position for mini bar placement
      const position = this.getSelectionPosition();
      
      if (position) {
        // Show mini bar near selection
        this.showMiniBar(position);
      }
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
        // Handle message asynchronously
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
      const position = this.getSelectionPosition();

      if (!position) {
        return {
          success: false,
          error: 'Could not determine selection position'
        };
      }

      this.showMiniBar(position);

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
   * Get the position of the current text selection
   * Used for positioning the mini bar
   */
  private getSelectionPosition(): Position | null {
    try {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate position at the center-top of the selection
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + window.scrollY;

      return { x, y };
    } catch (error) {
      console.error('[Flint] Error getting selection position:', error);
      return null;
    }
  }

  /**
   * Show the mini bar at the specified position
   * Sets up callbacks for mini bar button actions
   */
  private showMiniBar(position: Position): void {
    this.miniBarInjector.show(position, {
      onRecord: () => {
        console.log('[Flint] Record button clicked');
        this.sendMessageToPanel('OPEN_VOICE_TAB');
      },
      onSummarize: () => {
        console.log('[Flint] Summarize button clicked');
        const text = this.selectionHandler.getSelectedText();
        if (text) {
          this.sendMessageToPanel('OPEN_SUMMARY_TAB', { text });
        }
      },
      onRewrite: () => {
        console.log('[Flint] Rewrite button clicked');
        const text = this.selectionHandler.getSelectedText();
        if (text) {
          this.sendMessageToPanel('OPEN_REWRITE_TAB', { text });
        }
      },
      onClose: () => {
        console.log('[Flint] Close button clicked');
        this.miniBarInjector.hide();
      }
    });
  }

  /**
   * Send a message to the panel via background worker
   * Used for mini bar button actions
   */
  private sendMessageToPanel(type: string, payload?: any): void {
    chrome.runtime.sendMessage(
      {
        type,
        payload,
        source: 'content-script'
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Flint] Error sending message to panel:', chrome.runtime.lastError);
        } else {
          console.log('[Flint] Message sent to panel:', type, response);
        }
      }
    );
  }
}

// Initialize the content script coordinator when script loads
const coordinator = new ContentScriptCoordinator();

// Export for testing purposes
export default coordinator;
