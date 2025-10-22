/**
 * Background service worker for Flint Chrome extension
 * Handles extension lifecycle, message routing, and content script registration
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Flint extension installed');
});

// Message listener - placeholder for now
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);
  sendResponse({ success: true });
  return true; // Keep channel open for async response
});
