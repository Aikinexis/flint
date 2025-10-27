/**
 * Background service worker for Flint Chrome extension
 * Handles extension lifecycle, message routing, and content script registration
 * 
 * @module background/background
 */

/**
 * Message types for inter-component communication
 */
type MessageType =
  // Content script messages
  | 'GET_SELECTION'
  | 'INSERT_TEXT'
  | 'REPLACE_TEXT'
  | 'SHOW_MINI_BAR'
  | 'HIDE_MINI_BAR'
  | 'PING_PANEL'
  // Panel messages
  | 'PANEL_OPENED'
  | 'OPEN_GENERATE_TAB'
  | 'OPEN_SUMMARY_TAB'
  | 'OPEN_REWRITE_TAB'
  | 'OPEN_SETTINGS_TAB'
  | 'OPEN_HISTORY_TAB'
  // Settings messages
  | 'UPDATE_SHORTCUTS';

/**
 * Message structure for background communication
 */
interface BackgroundMessage {
  type: MessageType;
  payload?: unknown;
  source?: 'content-script' | 'panel';
}

/**
 * Response structure for message handlers
 */
interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Content script registration ID
 */
const CONTENT_SCRIPT_ID = 'flint-content-script';

/**
 * Extension installation and update handler
 * Registers content scripts dynamically and performs initial setup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  // Log installation/update event
  if (details.reason === 'install') {
    console.log('[Flint Background] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[Flint Background] Extension updated from version', details.previousVersion);
  }

  try {
    // Set side panel to open when extension icon is clicked
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('[Flint Background] Side panel behavior configured');

    // Unregister existing content scripts on update
    if (details.reason === 'update') {
      console.log('[Flint Background] Cleaning up old content scripts...');
      await unregisterContentScripts();
    }

    // Register content scripts dynamically
    console.log('[Flint Background] Registering content scripts...');
    await registerContentScripts();

    console.log('[Flint Background] Setup completed successfully');
  } catch (error) {
    console.error('[Flint Background] Setup failed:', error);
    // Extension will still load, but content scripts may not work
    // User will see error message when trying to use features
  }
});

// Note: chrome.sidePanel.onPanelOpened doesn't exist in the API
// The panel will send a message when it mounts instead

/**
 * Register content scripts dynamically using chrome.scripting API
 * This allows content scripts to be injected on-demand
 * 
 * @throws {Error} If registration fails
 */
async function registerContentScripts(): Promise<void> {
  try {
    // Check if content script is already registered
    const existingScripts = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID]
    });

    if (existingScripts.length > 0) {
      console.log('[Flint Background] Content script already registered');
      return;
    }

    // Register the content script
    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT_ID,
        js: ['content.js'],
        matches: ['<all_urls>'],
        runAt: 'document_idle',
        allFrames: false // Keep false - Google Docs selection works in main frame
      }
    ]);

    console.log('[Flint Background] Content script registered successfully');
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('duplicate')) {
        console.warn('[Flint Background] Content script already registered (duplicate)');
        return;
      }
      console.error('[Flint Background] Failed to register content script:', error.message);
    } else {
      console.error('[Flint Background] Failed to register content script:', error);
    }
    throw error;
  }
}

/**
 * Unregister all content scripts
 * Called during extension updates to clean up old registrations
 * 
 * Errors are logged but not thrown, as unregistration failures
 * are non-critical (e.g., script may not exist on first install)
 */
async function unregisterContentScripts(): Promise<void> {
  try {
    // First check if any scripts are registered
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID]
    });

    // Only unregister if scripts exist
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({
        ids: [CONTENT_SCRIPT_ID]
      });
      console.log('[Flint Background] Content scripts unregistered successfully');
    } else {
      console.log('[Flint Background] No content scripts to unregister (expected on first install)');
    }
  } catch (error) {
    // Silently ignore errors - they're expected on first install
    if (error instanceof Error && !error.message.includes('not found')) {
      console.warn('[Flint Background] Error unregistering content scripts:', error.message);
    }
  }
}

// Note: We use chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
// instead of chrome.action.onClicked to avoid user gesture issues.
// The panel opens automatically when the user clicks the extension icon.

/**
 * Message listener for routing messages between panel and content scripts
 * Handles bidirectional communication and message forwarding
 */
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    // Handle message asynchronously
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Flint Background] Error handling message:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    // Return true to indicate async response
    return true;
  }
);

/**
 * Handle incoming messages and route them appropriately
 * Routes messages between panel and content scripts
 */
async function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const { type, payload, source } = message;

  // Messages from content script to panel
  if (source === 'content-script') {
    return handleContentScriptMessage(type, payload);
  }

  // Messages from panel to content script
  if (source === 'panel') {
    return handlePanelMessage(type, payload);
  }

  // If no source specified, determine based on sender
  if (sender.tab?.id) {
    // Message from content script (has tab context)
    return handleContentScriptMessage(type, payload);
  } else {
    // Message from panel (no tab context)
    return handlePanelMessage(type, payload);
  }
}

/**
 * Handle messages from content script
 * These are typically notifications about user actions in the page
 * Forwards messages to the panel when appropriate
 */
async function handleContentScriptMessage(
  type: MessageType,
  payload?: unknown
): Promise<MessageResponse> {
  switch (type) {
    case 'PING_PANEL':
    case 'OPEN_GENERATE_TAB':
    case 'OPEN_SUMMARY_TAB':
    case 'OPEN_REWRITE_TAB':
    case 'OPEN_SETTINGS_TAB':
    case 'OPEN_HISTORY_TAB':
      // Forward message to panel - will only work if panel is open
      return forwardMessageToPanel(type, payload);

    default:
      return {
        success: false,
        error: `Unknown content script message type: ${type}`
      };
  }
}

/**
 * Forward a message to the panel
 * Used when content script needs to communicate with the panel
 * 
 * @param type - Message type to forward
 * @param payload - Optional message payload
 * @returns Response from the panel or error if panel is not available
 */
async function forwardMessageToPanel(
  type: MessageType,
  payload?: unknown
): Promise<MessageResponse> {
  try {
    // Send message to the extension (panel will receive it)
    const response = await chrome.runtime.sendMessage({
      type,
      payload,
      source: 'content-script'
    });

    return response || {
      success: true,
      data: { message: 'Message forwarded to panel' }
    };
  } catch (error) {
    // Panel not open - this is expected, just return error silently
    if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
      return {
        success: false,
        error: 'Panel is not open'
      };
    }

    // Log unexpected errors
    console.error('[Flint Background] Failed to forward message to panel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to communicate with panel'
    };
  }
}

/**
 * Handle messages from panel
 * These are typically commands to manipulate text in the active tab
 * Forwards messages to the content script in the active tab
 */
async function handlePanelMessage(
  type: MessageType,
  payload?: unknown
): Promise<MessageResponse> {
  // Handle PANEL_OPENED message - forward to content script with saved position
  if (type === 'PANEL_OPENED') {
    console.log('[Flint Background] ✅ Received PANEL_OPENED from panel');
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[Flint Background] Active tab:', tabs[0]?.id);

      if (tabs[0]?.id) {
        // Get saved selection position
        const { 'flint.lastSelectionPoint': lastSelectionPoint } =
          await chrome.storage.local.get('flint.lastSelectionPoint');

        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PANEL_OPENED',
          source: 'panel',
          payload: { position: lastSelectionPoint }
        });
        console.log('[Flint Background] ✅ Sent PANEL_OPENED to content script');
        return {
          success: true,
          data: { message: 'Panel opened notification sent' }
        };
      }
    } catch (error) {
      console.error('[Flint Background] ❌ Failed to send PANEL_OPENED:', error);
    }
    return { success: true };
  }

  // Handle UPDATE_SHORTCUTS message separately (doesn't need active tab)
  if (type === 'UPDATE_SHORTCUTS') {
    console.log('[Flint Background] Shortcuts updated:', payload);
    // Note: Chrome doesn't allow programmatic update of keyboard shortcuts
    // Users must update them via chrome://extensions/shortcuts
    // We just acknowledge the message here
    return {
      success: true,
      data: { message: 'Shortcuts saved. Note: Chrome shortcuts are managed in chrome://extensions/shortcuts' }
    };
  }

  try {
    // Get the active tab in the current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs.length === 0 || !tabs[0]) {
      console.error('[Flint Background] No active tab found');
      return {
        success: false,
        error: 'No active tab found. Please make sure you have a tab open.'
      };
    }

    const activeTab = tabs[0];

    if (!activeTab.id) {
      console.error('[Flint Background] Active tab has no ID');
      return {
        success: false,
        error: 'Cannot access tab information. Please try again.'
      };
    }

    // Check if the tab URL is accessible (not chrome:// or other restricted URLs)
    if (activeTab.url && (
      activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')
    )) {
      return {
        success: false,
        error: 'Cannot access this page. Flint does not work on browser internal pages.'
      };
    }

    // Forward message to content script in active tab
    return await forwardMessageToContentScript(activeTab.id, type, payload);
  } catch (error) {
    console.error('[Flint Background] Error in handlePanelMessage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process panel message'
    };
  }
}

/**
 * Forward a message to the content script in a specific tab
 * Handles communication errors and provides user-friendly error messages
 * 
 * @param tabId - ID of the tab containing the content script
 * @param type - Message type to forward
 * @param payload - Optional message payload
 * @returns Response from the content script or error if communication fails
 */
async function forwardMessageToContentScript(
  tabId: number,
  type: MessageType,
  payload?: unknown
): Promise<MessageResponse> {
  try {
    console.log(`[Flint Background] Forwarding message to content script in tab ${tabId}:`, type);

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type,
      payload
    });

    console.log('[Flint Background] Received response from content script:', response);

    // Ensure response has the expected structure
    if (!response || typeof response !== 'object') {
      return {
        success: true,
        data: response
      };
    }

    return response as MessageResponse;
  } catch (error) {
    console.error('[Flint Background] Failed to send message to content script:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Content script not injected or not responding
      if (error.message.includes('Receiving end does not exist')) {
        return {
          success: false,
          error: 'Content script not loaded. Please refresh the page and try again.'
        };
      }

      // Tab was closed or navigated away
      if (error.message.includes('No tab with id')) {
        return {
          success: false,
          error: 'Tab is no longer available. Please try again in the current tab.'
        };
      }

      // Extension context invalidated (extension was reloaded)
      if (error.message.includes('Extension context invalidated')) {
        return {
          success: false,
          error: 'Extension was reloaded. Please refresh the page and try again.'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: false,
      error: 'Failed to communicate with page. Please refresh and try again.'
    };
  }
}

/**
 * Handle extension startup
 * Performs any necessary initialization when the service worker starts
 */
chrome.runtime.onStartup.addListener(() => {
  // Extension started - service worker is active
});

/**
 * Handle service worker suspension
 * Clean up any resources before the service worker is suspended
 */
self.addEventListener('beforeunload', () => {
  // Service worker suspending - cleanup if needed
});


