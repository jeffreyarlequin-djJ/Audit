// Content script - runs on every page
// Exposes page content extraction to the extension popup

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const content = extractPageContent();
    sendResponse({ content });
  }
  return true;
});

function extractPageContent() {
  // Try specific selectors first (common ticketing systems)
  const selectors = [
    "main", "[role='main']", ".ticket-content", ".incident-detail",
    "#ticket-content", ".case-detail", ".record-detail", "article",
    ".content-area", ".detail-view", ".case-content"
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 50) {
      return el.innerText.trim();
    }
  }
  
  // Fallback to body text
  return document.body.innerText.trim();
}
