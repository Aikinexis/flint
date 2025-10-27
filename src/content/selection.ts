/**
 * Selection Handler Module
 * 
 * Captures text selections and manages selection state on web pages.
 * Supports both standard text selections and editable field selections.
 * 
 * @module content/selection
 */

/**
 * Interface for handling text selections on web pages
 */
export interface SelectionHandler {
  /**
   * Get the currently selected text
   * @returns The selected text or null if no selection
   */
  getSelectedText(): string | null;

  /**
   * Get the selection range for replacement operations
   * @returns The Range object or null if no selection
   */
  getSelectionRange(): Range | null;

  /**
   * Listen for selection changes
   * @param callback Function to call when selection changes
   */
  onSelectionChange(callback: (text: string) => void): void;

  /**
   * Check if the current selection is in an editable field
   * @returns True if selection is in textarea or contenteditable
   */
  isEditableSelection(): boolean;
}

/**
 * Implementation of SelectionHandler for web page text selections
 */
class SelectionHandlerImpl implements SelectionHandler {
  private selectionChangeCallback: ((text: string) => void) | null = null;

  constructor() {
    try {
      // Listen for selection changes
      document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
      
      // Store selection on mouseup
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
      
      console.log('[Flint Selection] Handler initialized on:', window.location.href);
    } catch (error) {
      console.error('[Flint Selection] Failed to initialize:', error);
    }
  }

  /**
   * Handle selection change events
   */
  private handleSelectionChange(): void {
    if (this.selectionChangeCallback) {
      try {
        const text = this.getSelectedText();
        this.selectionChangeCallback(text || '');
      } catch (error) {
        // Silently ignore errors in selection handling
        // This can happen in iframes or restricted contexts
      }
    }
  }

  /**
   * Store selection in chrome.storage when user finishes selecting
   */
  private handleMouseUp(): void {
    try {
      const text = this.getSelectedText();
      if (text && text.length >= 3) {
        chrome.storage.local.set({ 'flint.lastSelection': text }).catch(() => {
          // Ignore errors
        });
      }
    } catch (error) {
      // Silently ignore errors
    }
  }



  /**
   * Get currently selected text using window.getSelection()
   */
  getSelectedText(): string | null {
    try {
      const selection = window.getSelection();
      
      // Handle empty or null selection
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const text = selection.toString().trim();
      
      // Return null for empty selections
      return text.length > 0 ? text : null;
    } catch (error) {
      console.error('[Flint] Error getting selected text:', error);
      return null;
    }
  }

  /**
   * Get the selection range for text replacement operations
   */
  getSelectionRange(): Range | null {
    try {
      const selection = window.getSelection();
      
      // Handle empty or null selection
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      // Get the first range (most common case)
      const range = selection.getRangeAt(0);
      
      // Verify range is not collapsed (has content)
      if (range.collapsed) {
        return null;
      }

      return range;
    } catch (error) {
      console.error('[Flint] Error getting selection range:', error);
      return null;
    }
  }

  /**
   * Register a callback for selection changes
   */
  onSelectionChange(callback: (text: string) => void): void {
    this.selectionChangeCallback = callback;
  }

  /**
   * Check if the current selection is within an editable element
   */
  isEditableSelection(): boolean {
    try {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        return false;
      }

      // Get the anchor node (start of selection)
      const anchorNode = selection.anchorNode;
      
      if (!anchorNode) {
        return false;
      }

      // Get the element containing the selection
      const element = anchorNode.nodeType === Node.ELEMENT_NODE 
        ? anchorNode as Element
        : anchorNode.parentElement;

      if (!element) {
        return false;
      }

      // Check if element is a textarea or input
      if (element instanceof HTMLTextAreaElement) {
        return true;
      }

      if (element instanceof HTMLInputElement) {
        // Only text-like input types are editable for our purposes
        const editableTypes = ['text', 'search', 'url', 'tel', 'email'];
        return editableTypes.includes(element.type);
      }

      // Check if element or any parent is contenteditable
      let currentElement: Element | null = element;
      while (currentElement) {
        if (currentElement instanceof HTMLElement) {
          const contentEditable = currentElement.getAttribute('contenteditable');
          if (contentEditable === 'true' || contentEditable === '') {
            return true;
          }
          // Stop if explicitly set to false
          if (contentEditable === 'false') {
            return false;
          }
        }
        currentElement = currentElement.parentElement;
      }

      return false;
    } catch (error) {
      console.error('[Flint] Error checking editable selection:', error);
      return false;
    }
  }
}

/**
 * Create and return a new SelectionHandler instance
 */
export function createSelectionHandler(): SelectionHandler {
  return new SelectionHandlerImpl();
}

/**
 * Default export for convenience
 */
export default createSelectionHandler;
