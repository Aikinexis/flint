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
  /** Called when generate button is clicked */
  onGenerate: () => void;
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
   * Show the mini bar near the current text selection
   * @param callbacks Button click handlers
   */
  show(callbacks: MiniBarCallbacks): void;

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
  private scrollTimeout: number | null = null;

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
      pointerEvents: 'none',
    });

    // Attach shadow root
    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    // Create minibar element
    this.bar = document.createElement('div');
    this.bar.className = 'flint-bar';
    this.bar.style.cssText = `
      position: absolute;
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
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.2s ease, top 0.2s ease;
      will-change: transform, opacity, left, top;
      z-index: 999999;
    `;

    // Add buttons
    this.bar.innerHTML = `
      <button data-action="generate" aria-label="Generate" type="button">
        <svg width="14" height="14" viewBox="0 0 56 56" fill="currentColor">
          <path d="M 26.6875 12.6602 C 26.9687 12.6602 27.1094 12.4961 27.1797 12.2383 C 27.9062 8.3242 27.8594 8.2305 31.9375 7.4570 C 32.2187 7.4102 32.3828 7.2461 32.3828 6.9648 C 32.3828 6.6836 32.2187 6.5195 31.9375 6.4726 C 27.8828 5.6524 28.0000 5.5586 27.1797 1.6914 C 27.1094 1.4336 26.9687 1.2695 26.6875 1.2695 C 26.4062 1.2695 26.2656 1.4336 26.1953 1.6914 C 25.3750 5.5586 25.5156 5.6524 21.4375 6.4726 C 21.1797 6.5195 20.9922 6.6836 20.9922 6.9648 C 20.9922 7.2461 21.1797 7.4102 21.4375 7.4570 C 25.5156 8.2774 25.4687 8.3242 26.1953 12.2383 C 26.2656 12.4961 26.4062 12.6602 26.6875 12.6602 Z M 15.3438 28.7852 C 15.7891 28.7852 16.0938 28.5039 16.1406 28.0821 C 16.9844 21.8242 17.1953 21.8242 23.6641 20.5821 C 24.0860 20.5117 24.3906 20.2305 24.3906 19.7852 C 24.3906 19.3633 24.0860 19.0586 23.6641 18.9883 C 17.1953 18.0977 16.9609 17.8867 16.1406 11.5117 C 16.0938 11.0899 15.7891 10.7852 15.3438 10.7852 C 14.9219 10.7852 14.6172 11.0899 14.5703 11.5352 C 13.7969 17.8164 13.4687 17.7930 7.0469 18.9883 C 6.6250 19.0821 6.3203 19.3633 6.3203 19.7852 C 6.3203 20.2539 6.6250 20.5117 7.1406 20.5821 C 13.5156 21.6133 13.7969 21.7774 14.5703 28.0352 C 14.6172 28.5039 14.9219 28.7852 15.3438 28.7852 Z M 31.2344 54.7305 C 31.8438 54.7305 32.2891 54.2852 32.4062 53.6524 C 34.0703 40.8086 35.8750 38.8633 48.5781 37.4570 C 49.2344 37.3867 49.6797 36.8945 49.6797 36.2852 C 49.6797 35.6758 49.2344 35.2070 48.5781 35.1133 C 35.8750 33.7070 34.0703 31.7617 32.4062 18.9180 C 32.2891 18.2852 31.8438 17.8633 31.2344 17.8633 C 30.6250 17.8633 30.1797 18.2852 30.0860 18.9180 C 28.4219 31.7617 26.5938 33.7070 13.9140 35.1133 C 13.2344 35.2070 12.7891 35.6758 12.7891 36.2852 C 12.7891 36.8945 13.2344 37.3867 13.9140 37.4570 C 26.5703 39.1211 28.3281 40.8321 30.0860 53.6524 C 30.1797 54.2852 30.6250 54.7305 31.2344 54.7305 Z"/>
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
            case 'generate':
              this.callbacks.onGenerate();
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
  show(callbacks: MiniBarCallbacks): void {
    if (!this.bar) return;

    // Store callbacks
    this.callbacks = callbacks;

    // Get current selection to calculate viewport position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    console.log('[Flint Minibar] Selection rect:', {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
    });

    // Calculate position with offset above selection
    const minibarWidth = 180;
    const minibarHeight = 40;
    const offset = 8;

    // Use viewport coordinates directly from getBoundingClientRect
    // This automatically accounts for all scrolling (window + containers)
    let left = rect.left + rect.width / 2 - minibarWidth / 2;
    let top = rect.top - minibarHeight - offset;

    console.log('[Flint Minibar] Calculated position before bounds check:', { left, top });

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 10) left = 10;
    if (left + minibarWidth > viewportWidth - 10) {
      left = viewportWidth - minibarWidth - 10;
    }

    if (top < 10) {
      // Flip below if not enough space above
      top = rect.bottom + offset;
    }

    if (top + minibarHeight > viewportHeight - 10) {
      top = viewportHeight - minibarHeight - 10;
    }

    console.log('[Flint Minibar] Final position after bounds check:', { left, top });

    // Position and show minibar
    this.bar.style.left = `${Math.round(left)}px`;
    this.bar.style.top = `${Math.round(top)}px`;
    this.bar.style.display = 'flex';
    this.bar.style.pointerEvents = 'auto'; // Ensure pointer events are enabled

    console.log('[Flint Minibar] Applied styles:', {
      left: this.bar.style.left,
      top: this.bar.style.top,
      position: this.bar.style.position,
    });

    // Delay before showing to avoid jumpiness during selection
    setTimeout(() => {
      if (!this.bar || !this.callbacks) return;

      // Trigger animation
      requestAnimationFrame(() => {
        if (this.bar) {
          this.bar.style.opacity = '1';
          this.bar.style.transform = 'translate3d(0, 0, 0) scale(1)';
          this.bar.style.pointerEvents = 'auto'; // Ensure pointer events stay enabled
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
    // Clear scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }

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
   * Set up scroll event listener to hide minibar while scrolling
   * Recalculates position and reappears after scrolling stops
   */
  private setupScrollRepositioning(): void {
    this.scrollHandler = () => {
      // Hide minibar immediately when scrolling starts (use opacity and scale)
      if (this.bar) {
        this.bar.style.opacity = '0';
        this.bar.style.transform = 'translate3d(0, 0, 0) scale(0.9)';
        this.bar.style.pointerEvents = 'none';
      }

      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Recalculate position and show after scrolling stops (200ms delay - faster response)
      this.scrollTimeout = window.setTimeout(() => {
        // Check if selection still exists
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
          this.hide();
          return;
        }

        // Recalculate position based on current selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Check if selection is visible in viewport
        const viewportHeight = window.innerHeight;
        if (rect.bottom < 0 || rect.top > viewportHeight) {
          // Selection is outside viewport, keep hidden
          return;
        }

        // Calculate new position
        const minibarWidth = 180;
        const minibarHeight = 40;
        const offset = 8;

        let left = rect.left + rect.width / 2 - minibarWidth / 2;
        let top = rect.top - minibarHeight - offset;

        // Keep within viewport bounds
        const viewportWidth = window.innerWidth;

        if (left < 10) left = 10;
        if (left + minibarWidth > viewportWidth - 10) {
          left = viewportWidth - minibarWidth - 10;
        }

        if (top < 10) {
          top = rect.bottom + offset; // Show below if no room above
        }

        if (top + minibarHeight > viewportHeight - 10) {
          top = viewportHeight - minibarHeight - 10;
        }

        // Update position and show with smooth fade-in and zoom effect
        if (this.bar) {
          // Set position first while still hidden
          this.bar.style.left = `${Math.round(left)}px`;
          this.bar.style.top = `${Math.round(top)}px`;

          // Set initial zoom state (start small) and make visible
          this.bar.style.opacity = '0';
          this.bar.style.transform = 'translate3d(0, 0, 0) scale(0.5)';
          this.bar.style.pointerEvents = 'none';

          // Smooth fade-in and zoom after a small delay (with bounce effect)
          requestAnimationFrame(() => {
            if (this.bar) {
              this.bar.style.opacity = '1';
              this.bar.style.transform = 'translate3d(0, 0, 0) scale(1)';
              this.bar.style.pointerEvents = 'auto';
            }
          });
        }
      }, 300);
    };

    // Add scroll listener to window and document
    window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
    document.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
  }

  /**
   * Remove scroll event listener
   */
  private removeScrollListener(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      document.removeEventListener('scroll', this.scrollHandler, true);
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
