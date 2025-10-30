/**
 * Messaging service for panel-to-content script communication
 * Provides a centralized interface for sending messages to content scripts
 * via the background service worker
 *
 * @module services/messaging
 */

/**
 * Message types for panel-to-content communication
 */
export type PanelMessageType =
  | 'GET_SELECTION'
  | 'INSERT_TEXT'
  | 'REPLACE_TEXT'
  | 'SHOW_MINI_BAR'
  | 'HIDE_MINI_BAR';

/**
 * Message structure for panel messages
 */
export interface PanelMessage {
  type: PanelMessageType;
  payload?: unknown;
  source: 'panel';
}

/**
 * Response structure from content script
 */
export interface ContentScriptResponse {
  success: boolean;
  data?: {
    text?: string;
    isEditable?: boolean;
    usedClipboard?: boolean;
    message?: string;
  };
  error?: string;
}

/**
 * Result of a message operation
 */
export interface MessageResult {
  success: boolean;
  data?: {
    text?: string;
    isEditable?: boolean;
    usedClipboard?: boolean;
    message?: string;
  };
  error?: string;
  usedClipboard?: boolean;
}

/**
 * MessagingService class for panel-to-content script communication
 * Handles all message sending and response processing
 */
export class MessagingService {
  /**
   * Get the currently selected text from the active tab
   *
   * @returns Promise resolving to the selected text and editability status
   * @throws Error if no text is selected or communication fails
   */
  async getSelection(): Promise<{ text: string; isEditable: boolean }> {
    const response = await this.sendMessage('GET_SELECTION');

    if (!response.success) {
      throw new Error(response.error || 'Failed to get selection');
    }

    if (!response.data?.text) {
      throw new Error('No text selected');
    }

    return {
      text: response.data.text,
      isEditable: response.data.isEditable || false,
    };
  }

  /**
   * Insert text at the current caret position in the active tab
   *
   * @param text - Text to insert
   * @returns Promise resolving to the result of the insertion
   */
  async insertText(text: string): Promise<MessageResult> {
    if (!text) {
      return {
        success: false,
        error: 'No text provided for insertion',
      };
    }

    const response = await this.sendMessage('INSERT_TEXT', { text });

    return {
      success: response.success,
      data: response.data,
      error: response.error,
      usedClipboard: response.data?.usedClipboard || false,
    };
  }

  /**
   * Replace the currently selected text with new text
   *
   * @param text - Text to replace the selection with
   * @returns Promise resolving to the result of the replacement
   */
  async replaceText(text: string): Promise<MessageResult> {
    if (!text) {
      return {
        success: false,
        error: 'No text provided for replacement',
      };
    }

    const response = await this.sendMessage('REPLACE_TEXT', { text });

    return {
      success: response.success,
      data: response.data,
      error: response.error,
      usedClipboard: response.data?.usedClipboard || false,
    };
  }

  /**
   * Show the mini bar at the current selection position
   *
   * @returns Promise resolving to the result of the operation
   */
  async showMiniBar(): Promise<MessageResult> {
    const response = await this.sendMessage('SHOW_MINI_BAR');

    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  }

  /**
   * Hide the mini bar
   *
   * @returns Promise resolving to the result of the operation
   */
  async hideMiniBar(): Promise<MessageResult> {
    const response = await this.sendMessage('HIDE_MINI_BAR');

    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  }

  /**
   * Send a message to the content script via the background worker
   *
   * @param type - Message type
   * @param payload - Optional message payload
   * @returns Promise resolving to the response from the content script
   * @throws Error if communication fails
   */
  private async sendMessage(
    type: PanelMessageType,
    payload?: unknown
  ): Promise<ContentScriptResponse> {
    try {
      const message: PanelMessage = {
        type,
        payload,
        source: 'panel',
      };

      // Send message via chrome.runtime (background worker will forward to content script)
      const response = await chrome.runtime.sendMessage(message);

      // Ensure response has the expected structure
      if (!response || typeof response !== 'object') {
        return {
          success: false,
          error: 'Invalid response from content script',
        };
      }

      return response as ContentScriptResponse;
    } catch (error) {
      console.error('[MessagingService] Error sending message:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        // Extension context invalidated (extension was reloaded)
        if (error.message.includes('Extension context invalidated')) {
          return {
            success: false,
            error: 'Extension was reloaded. Please refresh the page and try again.',
          };
        }

        // No receiving end (background worker or content script not available)
        if (error.message.includes('Receiving end does not exist')) {
          return {
            success: false,
            error: 'Content script not loaded. Please refresh the page and try again.',
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Failed to communicate with page. Please refresh and try again.',
      };
    }
  }
}

/**
 * Create a singleton instance of MessagingService
 */
export const messagingService = new MessagingService();
