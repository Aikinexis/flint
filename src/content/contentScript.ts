/**
 * Content script for Flint Chrome extension
 * Injects icon toolbar into web pages
 */

// Initialize content script
console.log('Flint content script loaded');

// Create and inject the icon toolbar
function createFlintToolbar() {
  // Check if toolbar already exists
  if (document.getElementById('flint-toolbar')) {
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.id = 'flint-toolbar';
  toolbar.style.cssText = `
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background: #111421;
    border-radius: 8px 0 0 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    z-index: 999999;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  `;

  // Create icon buttons
  const icons = [
    { id: 'voice', icon: '🎤', label: 'Voice' },
    { id: 'rewrite', icon: '✏️', label: 'Rewrite' },
    { id: 'summary', icon: '📝', label: 'Summary' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  icons.forEach((item) => {
    const button = document.createElement('button');
    button.id = `flint-${item.id}`;
    button.title = item.label;
    button.textContent = item.icon;
    button.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: #b7bccf;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
      transition: background 0.12s ease, color 0.12s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#151a28';
      button.style.color = '#eef0f6';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.color = '#b7bccf';
    });

    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openFlintPanel', tab: item.id });
    });

    toolbar.appendChild(button);
  });

  document.body.appendChild(toolbar);
}

// Inject toolbar when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFlintToolbar);
} else {
  createFlintToolbar();
}

// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'toggleToolbar') {
    const toolbar = document.getElementById('flint-toolbar');
    if (toolbar) {
      toolbar.remove();
    } else {
      createFlintToolbar();
    }
  }
  
  sendResponse({ success: true });
  return true;
});
