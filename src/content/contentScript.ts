/**
 * Content script for Flint Chrome extension
 * Injected into web pages to handle text selection and manipulation
 */

// Initialize content script
console.log('Flint content script loaded');

// Message listener - placeholder for now
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);
  sendResponse({ success: true });
  return true;
});
