/**
 * Mini Bar Injector Module
 * 
 * Injects and manages a mini bar near text selections on web pages.
 * Uses Shadow DOM for style isolation to prevent conflicts with host page styles.
 * 
 * @module content/injector
 */

/**
 * Position coordinates for mini bar placement
 */
export interface Position {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
}

/**
 * Callback functions for mini bar button actions
 */
export interface MiniBarCallbacks {
  /** Called when record button is clicked */
  onRecord: () => void;
  /** Called when summarize button is clicked */
  onSummarize: () => void;
  /** Called when rewrite button is clicked */
  onRewrite: () => void;
  /** Called when close button is clicked */
  onClose: () => void;
}

/**
 * Interface for managing the mini bar injection and positioning
 */
export interface MiniBarInjector {
  /**
   * Show the mini bar at the specified position
   * @param position Coordinates where mini bar should appear
   * @param callbacks Button click handlers
   */
  show(position: Position, callbacks: MiniBarCallbacks): void;

  /**
   * Hide and remove the mini bar from the page
   */
  hide(): void;

  /**
   * Check if the mini bar is currently visible
   * @returns True if mini bar is visible
   */
  isVisible(): boolean;
}

/**
 * Implementation of MiniBarInjector using Shadow DOM
 * Renders minibar in isolated shadow root for stable, flicker-free UI
 */
class MiniBarInjectorImpl implements MiniBarInjector {
  private host: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private bar: HTMLDivElement | null = null;
  private scrollHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private callbacks: MiniBarCallbacks | null = null;

  constructor() {
    // Create shadow host on initialization
    this.createShadowHost();
  }

  /**
   * Create shadow host and minibar structure
   * Uses Shadow DOM for style isolation
   */
  private createShadowHost(): void {
    if (this.host) return;

    // Create shadow host
    this.host = document.createElement('div');
    this.host.id = 'flint-host';
    Object.assign(this.host.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      pointerEvents: 'none'
    });

    // Attach shadow root
    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    // Create minibar element
    this.bar = document.createElement('div');
    this.bar.className = 'flint-bar';
    this.bar.style.cssText = `
      position: fixed;
      display: none;
      pointer-events: auto;
      background: rgba(50, 50, 50, 0.95);
      color: #F4F6FA;
      border: none;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      padding: 8px 10px;
      gap: 8px;
      align-items: center;
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(0.9);
      transition: opacity 0.2s ease, transform 0.2s ease, left 0.15s ease, top 0.15s ease;
      will-change: transform, opacity, left, top;
    `;

    // Add buttons
    this.bar.innerHTML = `
      <button data-action="record" aria-label="Record voice" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
        </svg>
      </button>
      <button data-action="summarize" aria-label="Summarize" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>
      <button data-action="rewrite" aria-label="Rewrite" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button data-action="close" aria-label="Close" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .flint-bar {
        display: flex;
      }
      .flint-bar button {
        /* Aggressive reset */
        all: unset;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        
        /* Size and spacing */
        box-sizing: border-box;
        width: 22px;
        height: 22px;
        padding: 0 !important;
        margin: 0 !important;
        
        /* Remove all borders and backgrounds */
        border: none !important;
        border-width: 0 !important;
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
        outline: none !important;
        
        /* Color and shape */
        color: inherit;
        border-radius: 6px;
        
        /* Layout */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.12s ease;
      }
      .flint-bar button:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
      .flint-bar button:active {
        transform: translateY(1px);
      }
      .flint-bar button:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      .flint-bar button svg {
        display: block;
        pointer-events: none;
      }
    `;

    this.shadowRoot.append(style, this.bar);

    // Set up button event listeners with pointerdown capture
    this.bar.addEventListener(
      'pointerdown',
      (e) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const action = btn.getAttribute('data-action');
        if (!action) return;

        if (action === 'close') {
          this.hide();
          return;
        }

        // Execute callback
        if (this.callbacks) {
          switch (action) {
            case 'record':
              this.callbacks.onRecord();
              break;
            case 'summarize':
              this.callbacks.onSummarize();
              break;
            case 'rewrite':
              this.callbacks.onRewrite();
              break;
          }
        }
      },
      { capture: true }
    );

    // Append to document
    if (document.documentElement) {
      document.documentElement.appendChild(this.host);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.host && document.documentElement) {
          document.documentElement.appendChild(this.host);
        }
      });
    }

    console.log('[Flint] Shadow host created');
  }

  /**
   * Show the mini bar near the text selection
   */
  show(position: Position, callbacks: MiniBarCallbacks): void {
    if (!this.bar) return;

    // Store callbacks
    this.callbacks = callbacks;

    // Calculate position with offset above selection
    const minibarWidth = 180;
    const minibarHeight = 40;
    const offset = 8;

    // Convert to viewport coordinates (subtract scroll since we use fixed positioning)
    let left = position.x - window.scrollX - minibarWidth / 2;
    let top = position.y - window.scrollY - minibarHeight - offset;

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 10) left = 10;
    if (left + minibarWidth > viewportWidth - 10) {
      left = viewportWidth - minibarWidth - 10;
    }

    if (top < 10) {
      // Flip below if not enough space above
      top = position.y - window.scrollY + offset;
    }

    if (top + minibarHeight > viewportHeight - 10) {
      top = viewportHeight - minibarHeight - 10;
    }

    // Position and show minibar
    this.bar.style.left = `${Math.round(left)}px`;
    this.bar.style.top = `${Math.round(top)}px`;
    this.bar.style.display = 'flex';

    // Delay before showing to avoid jumpiness during selection
    setTimeout(() => {
      if (!this.bar || !this.callbacks) return;
      
      // Trigger animation
      requestAnimationFrame(() => {
        if (this.bar) {
          this.bar.style.opacity = '1';
          this.bar.style.transform = 'translate3d(0, 0, 0) scale(1)';
        }
      });
    }, 100);

    // Set up scroll and resize repositioning
    this.setupScrollRepositioning();
    this.setupResizeRepositioning();
  }

  /**
   * Hide the mini bar
   */
  hide(): void {
    if (this.bar) {
      // Fade out animation
      this.bar.style.opacity = '0';
      this.bar.style.transform = 'translate3d(0, 0, 0) scale(0.9)';
      
      // Hide after animation completes
      setTimeout(() => {
        if (this.bar) {
          this.bar.style.display = 'none';
        }
      }, 200);
    }

    // Remove event listeners
    this.removeScrollListener();
    this.removeResizeListener();

    // Clear callbacks
    this.callbacks = null;
  }

  /**
   * Check if mini bar is currently visible
   */
  isVisible(): boolean {
    return this.callbacks !== null;
  }

  /**
   * Set up scroll event listener to hide mini bar on scroll
   * With fixed positioning, minibar stays in place but selection moves, so hide it
   */
  private setupScrollRepositioning(): void {
    // Hide mini bar immediately on scroll
    this.scrollHandler = () => {
      this.hide();
    };

    // Add scroll listener to window and document
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    document.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  /**
   * Remove scroll event listener
   */
  private removeScrollListener(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      document.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  /**
   * Set up resize event listener to reposition mini bar when viewport changes
   * This handles side panel resizing and window resizing
   */
  private setupResizeRepositioning(): void {
    this.resizeHandler = () => {
      // Reposition mini bar based on current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        this.hide();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate new position
      const minibarWidth = 180;
      const minibarHeight = 40;
      const offset = 8;

      let left = rect.left + rect.width / 2 - minibarWidth / 2;
      let top = rect.top - minibarHeight - offset;

      // Keep within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 10) left = 10;
      if (left + minibarWidth > viewportWidth - 10) {
        left = viewportWidth - minibarWidth - 10;
      }

      if (top < 10) {
        top = rect.top + offset;
      }

      if (top + minibarHeight > viewportHeight - 10) {
        top = viewportHeight - minibarHeight - 10;
      }

      // Update position smoothly
      if (this.bar) {
        this.bar.style.left = `${Math.round(left)}px`;
        this.bar.style.top = `${Math.round(top)}px`;
      }
    };

    // Add resize listener
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  /**
   * Remove resize event listener
   */
  private removeResizeListener(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

/**
 * Create and return a new MiniBarInjector instance
 */
export function createMiniBarInjector(): MiniBarInjector {
  return new MiniBarInjectorImpl();
}

/**
 * Default export for convenience
 */
export default createMiniBarInjector;
