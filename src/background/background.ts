/**
 * Background service worker for Flint Chrome extension
 * Handles extension lifecycle, message routing, and content script registration
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Flint extension installed');
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
      console.error('Failed to open side panel:', error);
    });
  }
});

// Message listener for panel-content communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);
  sendResponse({ success: true });
  return true; // Keep channel open for async response
});
