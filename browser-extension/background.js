// Background service worker
// Handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log("Swiss Telecom QA Extension installed");
});
