const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade",
  cloture: "Cloture", comprehension: "Comprehension"
};

// DOM elements
const apiUrlInput = document.getElementById("apiUrl");
const ticketRefInput = document.getElementById("ticketRef");
const prioritySelect = document.getElementById("priority");
const agentNameInput = document.getElementById("agentName");
const captureBtn = document.getElementById("captureBtn");
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

// Capture page content
captureBtn.addEventListener("click", async () => {
  setStatus("Capture...", "loading");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Try to get the main content area
        const selectors = [
          "main", "[role='main']", ".ticket-content", ".incident-detail",
          "#ticket-content", ".case-detail", ".record-detail", "article", ".content-area"
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 50) return el.innerText.trim();
        }
        // Fallback to body text
        return document.body.innerText.trim();
      }
    });

    const text = results[0]?.result || "";
    if (text.length > 0) {
      contentText.value = text.substring(0, 15000); // Limit to 15k chars
      charCount.textContent = contentText.value.length;
      capturedContent.style.display = "block";
      analyzeBtn.disabled = false;
      setStatus("Capture reussie", "success");
    } else {
      setStatus("Aucun contenu trouve", "error");
    }
  } catch (err) {
    setStatus("Erreur de capture", "error");
    console.error(err);
  }
});

// Update char count on manual edit
contentText.addEventListener("input", () => {
  charCount.textContent = contentText.value.length;
  analyzeBtn.disabled = contentText.value.trim().length === 0;
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
