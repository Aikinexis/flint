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
 * Implementation of MiniBarInjector with Shadow DOM for style isolation
 */
class MiniBarInjectorImpl implements MiniBarInjector {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private autoHideTimeout: number | null = null;
  private readonly AUTO_HIDE_DELAY = 5000; // 5 seconds
  private currentPosition: Position | null = null;
  private scrollHandler: (() => void) | null = null;

  /**
   * Show the mini bar near the text selection
   */
  show(position: Position, callbacks: MiniBarCallbacks): void {
    // Remove existing mini bar if present
    this.hide();

    // Store position for repositioning on scroll
    this.currentPosition = position;

    // Create container element
    this.container = document.createElement('div');
    this.container.id = 'flint-minibar-container';
    
    // Attach shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Add styles to shadow DOM
    this.injectStyles();

    // Create mini bar HTML structure
    this.createMiniBarStructure(callbacks);

    // Position the mini bar
    this.positionMiniBar(position);

    // Append to document body
    document.body.appendChild(this.container);

    // Set up auto-hide behavior
    this.setupAutoHide();

    // Set up scroll repositioning
    this.setupScrollRepositioning();
  }

  /**
   * Hide and remove the mini bar
   */
  hide(): void {
    // Clear auto-hide timeout
    if (this.autoHideTimeout !== null) {
      window.clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    // Remove scroll event listener
    this.removeScrollListener();

    // Remove container from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Clear references
    this.container = null;
    this.shadowRoot = null;
    this.currentPosition = null;
  }

  /**
   * Check if mini bar is currently visible
   */
  isVisible(): boolean {
    return this.container !== null && document.body.contains(this.container);
  }

  /**
   * Inject CSS styles into shadow DOM
   */
  private injectStyles(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Import design tokens - using inline styles for shadow DOM */
      :host {
        /* Colors */
        --bg: oklch(0.22 0 255);
        --surface-2: color-mix(in oklab, oklch(0.22 0 255) 85%, white 15%);
        --text: oklch(0.96 0 255);
        --text-muted: oklch(0.76 0 255);
        --border: oklch(0.4 0 255);
        --border-muted: oklch(0.3 0 255);
        --primary: oklch(0.5 0.1 255);
        
        /* Layout */
        --radius-lg: 24px;
        --radius-md: 16px;
        --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.25);
        --shadow-focus: 0 0 0 2px color-mix(in oklab, var(--primary) 50%, transparent);
        --btn-height: 38px;
        
        /* Typography */
        --font-sans: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        --fs-md: 14px;
      }

      .minibar {
        position: fixed;
        z-index: 999999;
        display: inline-flex;
        gap: 8px;
        padding: 8px;
        border: 1px solid var(--border);
        background: color-mix(in oklab, var(--bg) 85%, white 15%);
        backdrop-filter: blur(8px);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-soft);
        font-family: var(--font-sans);
      }

      .minibar-btn {
        width: var(--btn-height);
        height: var(--btn-height);
        padding: 0;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-muted);
        background: var(--surface-2);
        color: var(--text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 18px;
        transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
      }

      .minibar-btn:hover {
        background: color-mix(in oklab, var(--surface-2) 70%, white 30%);
        box-shadow: 0 0 0 1px var(--border);
      }

      .minibar-btn:focus-visible {
        outline: none;
        box-shadow: var(--shadow-focus);
      }

      .minibar-btn:active {
        transform: translateY(1px);
      }

      .minibar-btn[aria-label]::after {
        content: attr(aria-label);
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background: var(--bg);
        color: var(--text);
        font-size: 12px;
        border-radius: 6px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      .minibar-btn:hover::after {
        opacity: 1;
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  /**
   * Create the mini bar HTML structure with 4 icon buttons
   */
  private createMiniBarStructure(callbacks: MiniBarCallbacks): void {
    if (!this.shadowRoot) return;

    // Create mini bar container
    const minibar = document.createElement('div');
    minibar.className = 'minibar';
    minibar.setAttribute('role', 'toolbar');
    minibar.setAttribute('aria-label', 'Flint text tools');

    // Create buttons with icons
    const buttons = [
      {
        id: 'record',
        icon: '🎤',
        label: 'Record voice',
        callback: callbacks.onRecord
      },
      {
        id: 'summarize',
        icon: '📝',
        label: 'Summarize',
        callback: callbacks.onSummarize
      },
      {
        id: 'rewrite',
        icon: '✏️',
        label: 'Rewrite',
        callback: callbacks.onRewrite
      },
      {
        id: 'close',
        icon: '✕',
        label: 'Close',
        callback: callbacks.onClose
      }
    ];

    // Create and append buttons
    buttons.forEach(({ id, icon, label, callback }) => {
      const button = document.createElement('button');
      button.className = 'minibar-btn';
      button.setAttribute('data-action', id);
      button.setAttribute('aria-label', label);
      button.textContent = icon;
      button.type = 'button';

      // Add click handler
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        callback();
      });

      minibar.appendChild(button);
    });

    this.shadowRoot.appendChild(minibar);
  }

  /**
   * Position the mini bar near the selection
   * Calculates position above or below selection to avoid covering text
   */
  private positionMiniBar(position: Position): void {
    if (!this.container) return;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Estimate mini bar dimensions (will be adjusted after render)
    const minibarWidth = 200; // Approximate width with 4 buttons
    const minibarHeight = 54; // Height with padding
    const offset = 10; // Offset from selection

    // Calculate initial position (above selection)
    let x = position.x - minibarWidth / 2;
    let y = position.y - minibarHeight - offset;

    // Adjust horizontal position to stay within viewport
    if (x < scrollX + 10) {
      x = scrollX + 10;
    } else if (x + minibarWidth > scrollX + viewportWidth - 10) {
      x = scrollX + viewportWidth - minibarWidth - 10;
    }

    // Check if mini bar would be above viewport, flip below if needed
    if (y < scrollY + 10) {
      y = position.y + offset;
    }

    // Ensure mini bar doesn't go below viewport
    if (y + minibarHeight > scrollY + viewportHeight - 10) {
      y = scrollY + viewportHeight - minibarHeight - 10;
    }

    // Apply position
    this.container.style.position = 'absolute';
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.zIndex = '999999';
  }

  /**
   * Set up auto-hide behavior
   * Mini bar hides after 5 seconds of inactivity
   * Stays visible while hovering
   */
  private setupAutoHide(): void {
    if (!this.container) return;

    // Start auto-hide timer
    this.startAutoHideTimer();

    // Keep visible while hovering
    this.container.addEventListener('mouseenter', () => {
      this.cancelAutoHideTimer();
    });

    this.container.addEventListener('mouseleave', () => {
      this.startAutoHideTimer();
    });
  }

  /**
   * Start the auto-hide timer
   */
  private startAutoHideTimer(): void {
    this.cancelAutoHideTimer();
    this.autoHideTimeout = window.setTimeout(() => {
      this.hide();
    }, this.AUTO_HIDE_DELAY);
  }

  /**
   * Cancel the auto-hide timer
   */
  private cancelAutoHideTimer(): void {
    if (this.autoHideTimeout !== null) {
      window.clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }

  /**
   * Set up scroll event listener to reposition mini bar
   * Uses throttling to avoid excessive repositioning
   */
  private setupScrollRepositioning(): void {
    if (!this.container || !this.currentPosition) return;

    // Create throttled scroll handler
    let scrollTimeout: number | null = null;
    this.scrollHandler = () => {
      // Throttle scroll events to every 100ms
      if (scrollTimeout !== null) return;

      scrollTimeout = window.setTimeout(() => {
        scrollTimeout = null;
        
        // Reposition mini bar if still visible
        if (this.isVisible() && this.currentPosition) {
          this.positionMiniBar(this.currentPosition);
        }
      }, 100);
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
