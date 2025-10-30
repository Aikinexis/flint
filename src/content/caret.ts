/**
 * Caret Handler Module
 *
 * Manages caret position detection and text insertion/replacement
 * in editable fields (textarea and contenteditable elements).
 *
 * @module content/caret
 */

/**
 * Represents a caret position in an editable element
 */
export interface CaretPosition {
  /** The HTML element containing the caret */
  element: HTMLElement;
  /** The character offset of the caret position */
  offset: number;
}

/**
 * Context around the cursor for text generation
 */
export interface CursorContext {
  /** Text before the cursor (limited by maxLength) */
  before: string;
  /** Text after the cursor (limited by maxLength) */
  after: string;
  /** Total text in the element */
  fullText: string;
  /** Cursor position in the full text */
  cursorPosition: number;
}

/**
 * Result of a text insertion or replacement operation
 */
export interface InsertionResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Whether clipboard fallback was used */
  usedClipboard: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Interface for handling caret position and text insertion
 */
export interface CaretHandler {
  /**
   * Get the current caret position
   * @returns CaretPosition object or null if no caret
   */
  getCaretPosition(): CaretPosition | null;

  /**
   * Get context around the cursor for text generation
   * @param maxContextLength Maximum characters to include before/after cursor (default: 500)
   * @returns CursorContext with text before and after cursor, or null if no cursor
   */
  getCursorContext(maxContextLength?: number): CursorContext | null;

  /**
   * Insert text at the current caret position with clipboard fallback
   * @param text Text to insert
   * @returns InsertionResult with success status and fallback info
   */
  insertAtCaret(text: string): Promise<InsertionResult>;

  /**
   * Replace the currently selected text with new text with clipboard fallback
   * @param text Text to replace selection with
   * @returns InsertionResult with success status and fallback info
   */
  replaceSelection(text: string): Promise<InsertionResult>;

  /**
   * Check if an element supports direct text insertion
   * @param element Element to check
   * @returns True if element supports insertion
   */
  supportsInsertion(element: HTMLElement): boolean;
}

/**
 * Implementation of CaretHandler for text insertion and manipulation
 */
class CaretHandlerImpl implements CaretHandler {
  /**
   * Get the current caret position in an editable element
   */
  getCaretPosition(): CaretPosition | null {
    try {
      const activeElement = document.activeElement;

      if (!activeElement || !(activeElement instanceof HTMLElement)) {
        return null;
      }

      // Handle textarea and input elements
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement
      ) {
        const offset = activeElement.selectionStart ?? 0;
        return {
          element: activeElement,
          offset: offset,
        };
      }

      // Handle contenteditable elements
      if (this.isContentEditable(activeElement)) {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
          return null;
        }

        const range = selection.getRangeAt(0);
        const offset = range.startOffset;

        return {
          element: activeElement,
          offset: offset,
        };
      }

      return null;
    } catch (error) {
      console.error('[Flint] Error getting caret position:', error);
      return null;
    }
  }

  /**
   * Get context around the cursor for text generation
   * @param maxContextLength Maximum characters to include before/after cursor (default: 500)
   */
  getCursorContext(maxContextLength: number = 500): CursorContext | null {
    try {
      const activeElement = document.activeElement;

      if (!activeElement || !(activeElement instanceof HTMLElement)) {
        return null;
      }

      // Handle textarea and input elements
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement
      ) {
        const fullText = activeElement.value;
        const cursorPosition = activeElement.selectionStart ?? 0;

        // Get text before cursor (limited by maxContextLength)
        const beforeStart = Math.max(0, cursorPosition - maxContextLength);
        const before = fullText.substring(beforeStart, cursorPosition);

        // Get text after cursor (limited by maxContextLength)
        const afterEnd = Math.min(fullText.length, cursorPosition + maxContextLength);
        const after = fullText.substring(cursorPosition, afterEnd);

        return {
          before,
          after,
          fullText,
          cursorPosition,
        };
      }

      // Handle contenteditable elements
      if (this.isContentEditable(activeElement)) {
        const fullText = activeElement.textContent || '';
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
          return null;
        }

        const range = selection.getRangeAt(0);
        const cursorPosition = this.getTextOffsetInElement(
          activeElement,
          range.startContainer,
          range.startOffset
        );

        // Get text before cursor (limited by maxContextLength)
        const beforeStart = Math.max(0, cursorPosition - maxContextLength);
        const before = fullText.substring(beforeStart, cursorPosition);

        // Get text after cursor (limited by maxContextLength)
        const afterEnd = Math.min(fullText.length, cursorPosition + maxContextLength);
        const after = fullText.substring(cursorPosition, afterEnd);

        return {
          before,
          after,
          fullText,
          cursorPosition,
        };
      }

      return null;
    } catch (error) {
      console.error('[Flint] Error getting cursor context:', error);
      return null;
    }
  }

  /**
   * Get the text offset of a position within a contenteditable element
   */
  private getTextOffsetInElement(element: HTMLElement, node: Node, offset: number): number {
    try {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.setEnd(node, offset);
      return range.toString().length;
    } catch (error) {
      console.error('[Flint] Error calculating text offset:', error);
      return 0;
    }
  }

  /**
   * Insert text at the current caret position with clipboard fallback
   */
  async insertAtCaret(text: string): Promise<InsertionResult> {
    try {
      const activeElement = document.activeElement;

      if (!activeElement || !(activeElement instanceof HTMLElement)) {
        console.warn('[Flint] No active element for text insertion');
        return await this.fallbackToClipboard(text, 'No active element found');
      }

      // Handle textarea and input elements
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement
      ) {
        const success = this.insertInTextarea(activeElement, text);
        if (success) {
          return { success: true, usedClipboard: false };
        }
        console.warn('[Flint] Direct insertion failed in textarea, using clipboard fallback');
        return await this.fallbackToClipboard(text, 'Direct insertion failed in textarea');
      }

      // Handle contenteditable elements
      if (this.isContentEditable(activeElement)) {
        const success = this.insertInContentEditable(text);
        if (success) {
          return { success: true, usedClipboard: false };
        }
        console.warn(
          '[Flint] Direct insertion failed in contenteditable, using clipboard fallback'
        );
        return await this.fallbackToClipboard(text, 'Direct insertion failed in contenteditable');
      }

      // Element doesn't support direct insertion
      console.warn('[Flint] Element does not support direct insertion, using clipboard fallback');
      return await this.fallbackToClipboard(
        text,
        'Unsupported editor type (e.g., Google Docs, complex editors)'
      );
    } catch (error) {
      console.error('[Flint] Error inserting text at caret:', error);
      return await this.fallbackToClipboard(
        text,
        `Insertion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Replace the currently selected text with new text with clipboard fallback
   */
  async replaceSelection(text: string): Promise<InsertionResult> {
    try {
      const activeElement = document.activeElement;

      if (!activeElement || !(activeElement instanceof HTMLElement)) {
        console.warn('[Flint] No active element for text replacement');
        return await this.fallbackToClipboard(text, 'No active element found');
      }

      // Handle textarea and input elements
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement
      ) {
        const success = this.replaceInTextarea(activeElement, text);
        if (success) {
          return { success: true, usedClipboard: false };
        }
        console.warn('[Flint] Direct replacement failed in textarea, using clipboard fallback');
        return await this.fallbackToClipboard(text, 'Direct replacement failed in textarea');
      }

      // Handle contenteditable elements
      if (this.isContentEditable(activeElement)) {
        const success = this.replaceInContentEditable(text);
        if (success) {
          return { success: true, usedClipboard: false };
        }
        console.warn(
          '[Flint] Direct replacement failed in contenteditable, using clipboard fallback'
        );
        return await this.fallbackToClipboard(text, 'Direct replacement failed in contenteditable');
      }

      // Element doesn't support direct replacement
      console.warn('[Flint] Element does not support direct replacement, using clipboard fallback');
      return await this.fallbackToClipboard(
        text,
        'Unsupported editor type (e.g., Google Docs, complex editors)'
      );
    } catch (error) {
      console.error('[Flint] Error replacing selection:', error);
      return await this.fallbackToClipboard(
        text,
        `Replacement error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if an element supports direct text insertion
   */
  supportsInsertion(element: HTMLElement): boolean {
    try {
      // Check for textarea
      if (element instanceof HTMLTextAreaElement) {
        return true;
      }

      // Check for text input
      if (element instanceof HTMLInputElement) {
        const editableTypes = ['text', 'search', 'url', 'tel', 'email'];
        return editableTypes.includes(element.type);
      }

      // Check for contenteditable
      if (this.isContentEditable(element)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Flint] Error checking insertion support:', error);
      return false;
    }
  }

  /**
   * Check if an element is contenteditable
   */
  private isContentEditable(element: HTMLElement): boolean {
    const contentEditable = element.getAttribute('contenteditable');
    return contentEditable === 'true' || contentEditable === '';
  }

  /**
   * Insert text in a textarea or input element
   */
  private insertInTextarea(element: HTMLTextAreaElement | HTMLInputElement, text: string): boolean {
    try {
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const currentValue = element.value;

      // Insert text at caret position
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      element.value = newValue;

      // Update caret position to end of inserted text
      const newCaretPosition = start + text.length;
      element.selectionStart = newCaretPosition;
      element.selectionEnd = newCaretPosition;

      // Trigger input event for form validation and listeners
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);

      return true;
    } catch (error) {
      console.error('[Flint] Error inserting in textarea:', error);
      return false;
    }
  }

  /**
   * Insert text in a contenteditable element
   */
  private insertInContentEditable(text: string): boolean {
    try {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return false;
      }

      const range = selection.getRangeAt(0);

      // Delete any selected content first
      range.deleteContents();

      // Create text node with new content
      const textNode = document.createTextNode(text);

      // Insert the text node at the range
      range.insertNode(textNode);

      // Move caret to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger input event
      const activeElement = document.activeElement;
      if (activeElement) {
        const inputEvent = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(inputEvent);
      }

      return true;
    } catch (error) {
      console.error('[Flint] Error inserting in contenteditable:', error);
      return false;
    }
  }

  /**
   * Replace selected text in a textarea or input element
   */
  private replaceInTextarea(
    element: HTMLTextAreaElement | HTMLInputElement,
    text: string
  ): boolean {
    try {
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const currentValue = element.value;

      // Replace selected text
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      element.value = newValue;

      // Update selection to highlight replaced text
      element.selectionStart = start;
      element.selectionEnd = start + text.length;

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);

      return true;
    } catch (error) {
      console.error('[Flint] Error replacing in textarea:', error);
      return false;
    }
  }

  /**
   * Replace selected text in a contenteditable element
   */
  private replaceInContentEditable(text: string): boolean {
    try {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return false;
      }

      const range = selection.getRangeAt(0);

      // Delete the selected content
      range.deleteContents();

      // Create text node with replacement text
      const textNode = document.createTextNode(text);

      // Insert the text node
      range.insertNode(textNode);

      // Select the newly inserted text
      range.setStartBefore(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger input event
      const activeElement = document.activeElement;
      if (activeElement) {
        const inputEvent = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(inputEvent);
      }

      return true;
    } catch (error) {
      console.error('[Flint] Error replacing in contenteditable:', error);
      return false;
    }
  }

  /**
   * Fallback to clipboard when direct insertion fails
   * @param text Text to copy to clipboard
   * @param reason Reason for using fallback (for logging)
   * @returns InsertionResult indicating clipboard was used
   */
  private async fallbackToClipboard(text: string, reason: string): Promise<InsertionResult> {
    try {
      // Log the reason for fallback
      console.warn('[Flint] Using clipboard fallback:', reason);

      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        console.error('[Flint] Clipboard API not available');
        return {
          success: false,
          usedClipboard: false,
          error: 'Clipboard API not available in this context',
        };
      }

      // Copy text to clipboard
      await navigator.clipboard.writeText(text);

      console.log('[Flint] Text successfully copied to clipboard');

      return {
        success: true,
        usedClipboard: true,
      };
    } catch (error) {
      console.error('[Flint] Clipboard fallback failed:', error);
      return {
        success: false,
        usedClipboard: false,
        error: `Clipboard operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Create and return a new CaretHandler instance
 */
export function createCaretHandler(): CaretHandler {
  return new CaretHandlerImpl();
}

/**
 * Default export for convenience
 */
export default createCaretHandler;
