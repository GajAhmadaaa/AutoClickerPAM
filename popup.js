// ============================================================
// AutoClickerPAM - popup.js
// Manages popup UI: status, settings, start/stop, timer, progress
// ============================================================

// DOM References
const statusBadge   = document.getElementById("statusBadge");
const statusText    = document.getElementById("statusText");
const configCard    = document.getElementById("configCard");
const modeSelect    = document.getElementById("modeSelect");
const intervalInput = document.getElementById("intervalInput");
const inputHint     = document.getElementById("inputHint");
const tabCard       = document.getElementById("tabCard");
const tabTitle      = document.getElementById("tabTitle");
const timerCard     = document.getElementById("timerCard");
const timerValue    = document.getElementById("timerValue");
const progressWrap  = document.getElementById("progressWrap");
const progressFill  = document.getElementById("progressFill");
const errorMsg      = document.getElementById("errorMsg");
const btnStart      = document.getElementById("btnStart");
const btnStop       = document.getElementById("btnStop");

// Local popup state
let timerInterval    = null;
let progressInterval = null;
let sessionStartedAt = null;
let activeIntervalMs = 60000;

// Handle Mode selection change
modeSelect.addEventListener("change", () => {
  const mode = modeSelect.value;
  if (mode === "alarm") {
    intervalInput.min = "60";
    if (parseInt(intervalInput.value) < 60) {
      intervalInput.value = "60";
    }
    inputHint.textContent = "Alarm mode requires min 60 seconds.";
  } else {
    intervalInput.min = "5";
    inputHint.textContent = "Content script mode allows min 5 seconds.";
  }
  saveSettings();
});

intervalInput.addEventListener("input", saveSettings);

function saveSettings() {
  chrome.storage.local.set({
    settingMode: modeSelect.value,
    settingInterval: parseInt(intervalInput.value) || 60
  });
}

// Render UI based on session status
function renderUI(data) {
  const isActive = data.isActive === true;

  // Status Badge
  statusBadge.className = "status-badge" + (isActive ? " active" : "");
  statusText.textContent = isActive ? "Active" : "Inactive";

  // Toggle Visibility of Settings vs Info
  configCard.style.display = isActive ? "none" : "block";
  tabCard.style.display    = isActive ? "block" : "none";
  timerCard.style.display  = isActive ? "flex" : "none";

  // Tab Title
  if (isActive && data.targetTabTitle) {
    tabTitle.textContent = data.targetTabTitle;
  } else {
    tabTitle.textContent = "—";
  }

  // Timer & Progress Bar
  if (isActive && data.startedAt) {
    sessionStartedAt = data.startedAt;
    activeIntervalMs = (data.interval || 60) * 1000;
    startTimerInterval();
    startProgressBar();
  } else {
    sessionStartedAt = null;
    progressWrap.classList.remove("visible");
    clearTimerInterval();
    clearProgressInterval();
  }

  // Buttons
  btnStart.disabled = isActive;
  btnStop.disabled  = !isActive;
}

// Show error
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("visible");
  setTimeout(() => {
    errorMsg.classList.remove("visible");
  }, 4000);
}

function clearError() {
  errorMsg.classList.remove("visible");
}

// Timer
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0")
  ].join(":");
}

function startTimerInterval() {
  clearTimerInterval();
  function tick() {
    if (sessionStartedAt) {
      timerValue.textContent = formatDuration(Date.now() - sessionStartedAt);
    }
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

function clearTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerValue.textContent = "00:00:00";
  }
}

// Progress Bar
function startProgressBar() {
  clearProgressInterval();
  progressWrap.classList.add("visible");

  function updateProgress() {
    if (!sessionStartedAt) return;
    const elapsed = (Date.now() - sessionStartedAt) % activeIntervalMs;
    const pct = (elapsed / activeIntervalMs) * 100;
    progressFill.style.width = pct + "%";
  }

  updateProgress();
  progressInterval = setInterval(updateProgress, 250); // Faster update for smoother custom intervals
}

function clearProgressInterval() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
    progressFill.style.width = "0%";
  }
}

// Event: Start Button
btnStart.addEventListener("click", () => {
  clearError();
  const mode = modeSelect.value;
  const interval = parseInt(intervalInput.value) || 60;

  // Final validation
  if (mode === "alarm" && interval < 60) {
    showError("Alarm mode interval must be at least 60s.");
    return;
  }
  if (mode === "content_script" && interval < 5) {
    showError("Content script interval must be at least 5s.");
    return;
  }

  chrome.runtime.sendMessage({ action: "START", mode: mode, interval: interval }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Connection to background failed. Reload extension.");
      return;
    }

    if (!response || !response.success) {
      showError(response?.error || "Failed to start session.");
      return;
    }

    loadStatus();
  });
});

// Event: Stop Button
btnStop.addEventListener("click", () => {
  clearError();
  chrome.runtime.sendMessage({ action: "STOP" }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Connection to background failed.");
      return;
    }

    if (!response || !response.success) {
      showError("Failed to stop session.");
      return;
    }

    loadStatus();
  });
});

// Load settings and status
function loadStatus() {
  // Load persistent settings
  chrome.storage.local.get(["settingMode", "settingInterval"], (items) => {
    if (items.settingMode) {
      modeSelect.value = items.settingMode;
      // Trigger change event to set min and hints
      modeSelect.dispatchEvent(new Event("change"));
    }
    if (items.settingInterval) {
      intervalInput.value = items.settingInterval;
    }
  });

  // Get current active session status
  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (data) => {
    if (chrome.runtime.lastError || !data) {
      chrome.storage.local.get(
        ["isActive", "targetTabId", "targetTabTitle", "startedAt", "interval", "mode"],
        (stored) => renderUI(stored || {})
      );
      return;
    }
    renderUI(data);
  });
}

// Listen for storage changes (auto-update if tab closed, etc.)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ("isActive" in changes || "targetTabId" in changes)) {
    loadStatus();
  }
});

// Init
loadStatus();
