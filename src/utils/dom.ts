/**
 * Utility functions for DOM manipulation and queries
 */

/**
 * Checks if an element is editable (textarea, input, or contenteditable)
 * @param element - The element to check
 * @returns True if the element is editable
 */
export function isEditableElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    const inputType = (element as HTMLInputElement).type;
    return inputType === 'text' || inputType === 'email' || inputType === 'search';
  }

  return element.getAttribute('contenteditable') === 'true';
}

/**
 * Gets the currently focused element, including within shadow DOM
 * @returns The currently focused element or null
 */
export function getActiveElement(): Element | null {
  let activeElement = document.activeElement;

  // Traverse shadow DOM if present
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return activeElement;
}

/**
 * Safely escapes HTML to prevent XSS attacks
 * @param html - The HTML string to escape
 * @returns The escaped HTML string
 */
export function escapeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Gets the text content of an element, stripping HTML tags
 * @param html - The HTML string
 * @returns The plain text content
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

/**
 * Gets the position of an element relative to the viewport
 * @param element - The element to get position for
 * @returns The element's bounding rectangle
 */
export function getElementPosition(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

/**
 * Checks if an element is visible in the viewport
 * @param element - The element to check
 * @returns True if the element is visible
 */
export function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scrolls an element into view smoothly
 * @param element - The element to scroll to
 * @param options - Scroll options
 */
export function scrollToElement(
  element: Element,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
): void {
  element.scrollIntoView(options);
}

/**
 * Creates a shadow DOM root for style isolation
 * @param host - The host element
 * @returns The shadow root
 */
export function createShadowRoot(host: HTMLElement): ShadowRoot {
  return host.attachShadow({ mode: 'open' });
}

/**
 * Waits for an element to appear in the DOM
 * @param selector - The CSS selector to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves with the element or null if timeout
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
