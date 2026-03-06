// Content script - runs on every page
// Supports extraction from complex ticketing systems including those with iframes

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const content = extractPageContent();
    sendResponse({ content });
  }
  if (request.action === "getSelection") {
    const selection = window.getSelection();
    sendResponse({ content: selection ? selection.toString().trim() : "" });
  }
  return true;
});

function extractPageContent() {
  // Try specific ticketing system selectors
  const selectors = [
    ".sn-widget-textblock-body", ".activity-stream", ".sn-form-fields",
    "main", "[role='main']", ".ticket-content", ".incident-detail",
    "#ticket-content", ".case-detail", ".record-detail", "article",
    ".content-area", ".detail-view", ".case-content",
    ".form-content", ".ticket-form", ".work-notes"
  ];
  
  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        const combined = Array.from(elements).map(el => el.innerText.trim()).join("\n\n");
        if (combined.length > 50) return combined;
      }
    } catch (e) { /* skip */ }
  }
  
  // Fallback to cleaned body text
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script, style, nav, footer, header").forEach(el => el.remove());
  return clone.innerText.trim();
}
