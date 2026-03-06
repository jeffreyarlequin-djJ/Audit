const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade",
  cloture: "Cloture", comprehension: "Comprehension"
};

// Content extraction function - injected into the page
function extractAllContent() {
  // Try specific ticketing system selectors first
  const selectors = [
    // ServiceNow
    ".sn-widget-textblock-body", ".activity-stream", ".sn-form-fields",
    ".form_section", ".nav_content", "#output_messages",
    // BMC Remedy / ITSM
    ".ardbn", ".arfid", ".ticket-form", ".form-content",
    // Jira Service Desk
    "[data-testid='issue.views.issue-base.content']", ".issue-body-content",
    // Zendesk
    ".ticket_body", ".comment_body", ".ticket-content",
    // General ITSM / ticketing systems
    "main", "[role='main']", ".incident-detail", "#ticket-content",
    ".case-detail", ".record-detail", "article", ".content-area",
    ".detail-view", ".case-content", ".work-notes",
    // Tables containing ticket data
    "table.list", ".data-table", ".record-table",
    // Generic content containers
    ".container main", "#main-content", ".page-content", ".app-content",
    "[role='document']"
  ];

  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        const combined = Array.from(elements).map(el => el.innerText.trim()).join("\n\n");
        if (combined.length > 50) return combined;
      }
    } catch (e) { /* skip invalid selectors */ }
  }

  // Fallback: get all visible text from body, filtering out scripts/styles
  const body = document.body;
  if (body) {
    const clone = body.cloneNode(true);
    // Remove script, style, nav, footer elements
    clone.querySelectorAll("script, style, nav, footer, header, [aria-hidden='true']").forEach(el => el.remove());
    const text = clone.innerText.trim();
    if (text.length > 50) return text;
  }

  return document.body ? document.body.innerText.trim() : "";
}

// DOM elements
const apiUrlInput = document.getElementById("apiUrl");
const ticketRefInput = document.getElementById("ticketRef");
const prioritySelect = document.getElementById("priority");
const agentNameInput = document.getElementById("agentName");
const captureBtn = document.getElementById("captureBtn");
const captureSelectionBtn = document.getElementById("captureSelectionBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const contentText = document.getElementById("contentText");
const capturedContent = document.getElementById("capturedContent");
const charCount = document.getElementById("charCount");
const loadingDiv = document.getElementById("loading");
const resultsDiv = document.getElementById("results");
const statusDiv = document.getElementById("status");
const openAppBtn = document.getElementById("openAppBtn");

// Load saved API URL
chrome.storage.local.get(["apiUrl", "agentName"], (data) => {
  if (data.apiUrl) apiUrlInput.value = data.apiUrl;
  if (data.agentName) agentNameInput.value = data.agentName;
});

// Save API URL on change
apiUrlInput.addEventListener("change", () => {
  chrome.storage.local.set({ apiUrl: apiUrlInput.value });
});

agentNameInput.addEventListener("change", () => {
  chrome.storage.local.set({ agentName: agentNameInput.value });
});

// Capture page content - improved with multiple strategies
captureBtn.addEventListener("click", async () => {
  setStatus("Capture...", "loading");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      setStatus("Onglet non accessible", "error");
      return;
    }

    // Strategy 1: Try main frame
    let text = "";
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractAllContent
      });
      text = results[0]?.result || "";
    } catch (e) {
      console.log("Main frame capture failed:", e);
    }

    // Strategy 2: Try all frames (for iframes - ServiceNow, Remedy, etc.)
    if (text.length < 100) {
      try {
        const frameResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: extractAllContent
        });
        // Combine content from all frames
        const allTexts = frameResults
          .map(r => r?.result || "")
          .filter(t => t.length > 20);
        if (allTexts.length > 0) {
          // Take the longest content or combine them
          const combined = allTexts.sort((a, b) => b.length - a.length).join("\n\n---\n\n");
          if (combined.length > text.length) {
            text = combined;
          }
        }
      } catch (e) {
        console.log("All frames capture failed:", e);
      }
    }

    if (text.length > 10) {
      contentText.value = text.substring(0, 15000);
      charCount.textContent = contentText.value.length;
      analyzeBtn.disabled = false;
      setStatus("Capture reussie (" + contentText.value.length + " car.)", "success");
    } else {
      setStatus("Peu de contenu - collez manuellement", "error");
    }
  } catch (err) {
    console.error("Capture error:", err);
    setStatus("Erreur - collez le contenu manuellement", "error");
  }
});

// Capture selected text on the page
captureSelectionBtn.addEventListener("click", async () => {
  setStatus("Capture selection...", "loading");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      setStatus("Onglet non accessible", "error");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        const selection = window.getSelection();
        return selection ? selection.toString().trim() : "";
      }
    });

    // Combine selections from all frames
    const allSelections = results
      .map(r => r?.result || "")
      .filter(t => t.length > 0);
    const selectedText = allSelections.join("\n\n");

    if (selectedText.length > 0) {
      contentText.value = selectedText.substring(0, 15000);
      charCount.textContent = contentText.value.length;
      analyzeBtn.disabled = false;
      setStatus("Selection capturee (" + contentText.value.length + " car.)", "success");
    } else {
      setStatus("Aucune selection - selectionnez du texte d'abord", "error");
    }
  } catch (err) {
    console.error("Selection capture error:", err);
    setStatus("Erreur - collez le contenu manuellement", "error");
  }
});

// Update char count on manual edit and enable analyze button
contentText.addEventListener("input", () => {
  charCount.textContent = contentText.value.length;
  analyzeBtn.disabled = contentText.value.trim().length === 0;
  if (contentText.value.trim().length > 0) {
    setStatus("Pret", "success");
  }
});

// Analyze
analyzeBtn.addEventListener("click", async () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
  if (!apiUrl) {
    setStatus("URL application requise", "error");
    return;
  }
  if (!contentText.value.trim()) {
    setStatus("Contenu requis", "error");
    return;
  }

  setStatus("Analyse en cours...", "loading");
  loadingDiv.style.display = "flex";
  resultsDiv.style.display = "none";
  analyzeBtn.disabled = true;

  try {
    const response = await fetch(`${apiUrl}/api/tickets/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: contentText.value,
        ticket_ref: ticketRefInput.value,
        priority: prioritySelect.value,
        agent_name: agentNameInput.value
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    loadingDiv.style.display = "none";
    displayResults(data);
    setStatus("Analyse terminee", "success");
  } catch (err) {
    loadingDiv.style.display = "none";
    analyzeBtn.disabled = false;
    setStatus("Erreur: " + err.message, "error");
  }
});

// Open in app
openAppBtn.addEventListener("click", () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
  if (apiUrl) chrome.tabs.create({ url: apiUrl + "/historique" });
});

function setStatus(text, type) {
  statusDiv.textContent = text;
  statusDiv.className = "status " + (type || "");
}

function getScoreBadgeClass(score) {
  if (score === -1) return "na";
  if (score === 2) return "bon";
  if (score === 1) return "moyen";
  return "mauvais";
}

function getScoreText(score) {
  if (score === -1) return "NA";
  if (score === 2) return "Bon";
  if (score === 1) return "Moyen";
  return "Mauvais";
}

function displayResults(data) {
  resultsDiv.style.display = "block";

  // Global score
  const scoreEl = document.getElementById("globalScore");
  scoreEl.textContent = data.score_global + "%";
  scoreEl.className = "score-circle " + (data.score_global >= 80 ? "excellent" : data.score_global >= 50 ? "moyen" : "faible");

  // Quality label
  const labelEl = document.getElementById("qualityLabel");
  const qualClass = data.score_global >= 80 ? "excellent" : data.score_global >= 50 ? "moyen" : "faible";
  labelEl.textContent = data.score_global >= 80 ? "Excellent" : data.score_global >= 50 ? "Moyen" : "Faible";
  labelEl.style.borderColor = qualClass === "excellent" ? "#10b981" : qualClass === "moyen" ? "#f59e0b" : "#ef4444";
  labelEl.style.color = qualClass === "excellent" ? "#10b981" : qualClass === "moyen" ? "#f59e0b" : "#ef4444";

  // Scores tab
  const scoresTab = document.getElementById("tab-scores");
  scoresTab.innerHTML = Object.entries(data.scores || {}).map(([key, val]) =>
    `<div class="score-item">
      <span class="score-item-label">${CRITERIA_LABELS[key] || key}</span>
      <span class="score-badge ${getScoreBadgeClass(val)}">${getScoreText(val)}</span>
    </div>`
  ).join("");

  // Details tab
  const detailsTab = document.getElementById("tab-details");
  detailsTab.innerHTML = Object.entries(data.details || {}).map(([key, text]) =>
    `<div class="detail-item">
      <div class="detail-item-header">
        <span class="score-badge ${getScoreBadgeClass(data.scores?.[key])}">${getScoreText(data.scores?.[key])}</span>
        <span class="score-item-label" style="width:auto">${CRITERIA_LABELS[key] || key}</span>
      </div>
      <div class="detail-item-text">${text}</div>
    </div>`
  ).join("");

  // Recommendations tab
  const recoTab = document.getElementById("tab-reco");
  let recoHtml = "";
  if (data.resume) {
    recoHtml += `<div style="background:#0f172a;color:#fff;padding:10px;margin-bottom:8px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#FF5722;margin-bottom:4px;">RESUME</div>
      <div style="font-size:12px;line-height:1.5;">${data.resume}</div>
    </div>`;
  }
  recoHtml += (data.recommandations || []).map((r, i) =>
    `<div class="reco-item"><span class="reco-num">${i + 1}.</span><span class="reco-text">${r}</span></div>`
  ).join("");
  recoTab.innerHTML = recoHtml;

  analyzeBtn.disabled = false;
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});
