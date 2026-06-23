// ============================================================
// AutoClickerPAM - background.js (Service Worker)
// Manifest V3 | chrome.alarms + chrome.scripting
// ============================================================

const ALARM_NAME = "autoClickerPAM_tick";

// ------------------------------------------------------------
// Helper: Log with prefix
// ------------------------------------------------------------
function log(msg) {
  console.log(`[AutoClickerPAM] ${new Date().toLocaleTimeString()} - ${msg}`);
}

// ------------------------------------------------------------
// Scripts injected into target tab for Content Script Mode
// ------------------------------------------------------------
function startContentScriptInterval(intervalSec) {
  if (window.pamAutoClickerInterval) {
    clearInterval(window.pamAutoClickerInterval);
  }

  function simulateActivity() {
    try {
      const randomSmall = (max) => Math.floor(Math.random() * max);

      // --- Random small mousemove ---
      const mouseMoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: randomSmall(50),
        clientY: randomSmall(50),
      });
      document.dispatchEvent(mouseMoveEvent);

      // --- Random small pointermove ---
      const pointerMoveEvent = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: randomSmall(50),
        clientY: randomSmall(50),
      });
      document.dispatchEvent(pointerMoveEvent);

      // --- Mouseover on body element ---
      const mouseOverEvent = new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(mouseOverEvent);

      // --- Focus event on window ---
      const focusEvent = new Event("focus", { bubbles: false });
      window.dispatchEvent(focusEvent);

      // --- Scroll 1px down and then back ---
      const currentScrollY = window.scrollY;
      window.scrollTo(0, currentScrollY + 1);
      setTimeout(() => {
        window.scrollTo(0, currentScrollY);
      }, 200);

      console.log(
        "[AutoClickerPAM] Light activity simulated (Content Script Mode):",
        new Date().toLocaleTimeString()
      );
    } catch (err) {
      console.error("[AutoClickerPAM] Error during simulation:", err);
    }
  }

  // Execute once immediately
  simulateActivity();

  // Set the interval
  window.pamAutoClickerInterval = setInterval(simulateActivity, intervalSec * 1000);
  console.log(`[AutoClickerPAM] Keep-alive interval set to ${intervalSec}s.`);
}

function stopContentScriptInterval() {
  if (window.pamAutoClickerInterval) {
    clearInterval(window.pamAutoClickerInterval);
    window.pamAutoClickerInterval = null;
    console.log("[AutoClickerPAM] Keep-alive interval cleared.");
  }
}

// ------------------------------------------------------------
// Script injected into target tab for Alarm Mode (Fires once per alarm tick)
// ------------------------------------------------------------
function simulateActivity() {
  try {
    const randomSmall = (max) => Math.floor(Math.random() * max);

    // --- Random small mousemove ---
    const mouseMoveEvent = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: randomSmall(50),
      clientY: randomSmall(50),
    });
    document.dispatchEvent(mouseMoveEvent);

    // --- Random small pointermove ---
    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: randomSmall(50),
      clientY: randomSmall(50),
    });
    document.dispatchEvent(pointerMoveEvent);

    // --- Mouseover on body element ---
    const mouseOverEvent = new MouseEvent("mouseover", {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(mouseOverEvent);

    // --- Focus event on window ---
    const focusEvent = new Event("focus", { bubbles: false });
    window.dispatchEvent(focusEvent);

    // --- Scroll 1px down and then back ---
    const currentScrollY = window.scrollY;
    window.scrollTo(0, currentScrollY + 1);
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 200);

    console.log(
      "[AutoClickerPAM] Light activity simulated (Alarm Mode):",
      new Date().toLocaleTimeString()
    );
  } catch (err) {
    console.error("[AutoClickerPAM] Error during simulation:", err);
  }
}

// ------------------------------------------------------------
// Start session
// ------------------------------------------------------------
async function startSession(tabId, tabTitle, mode, interval) {
  await chrome.storage.local.set({
    isActive: true,
    targetTabId: tabId,
    targetTabTitle: tabTitle,
    startedAt: Date.now(),
    mode: mode,
    interval: interval
  });

  if (mode === "alarm") {
    // Clear old alarm if exists, then create a new one
    await chrome.alarms.clear(ALARM_NAME);
    const periodMinutes = interval / 60;
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: periodMinutes,
      periodInMinutes: periodMinutes,
    });
    log(`Session started (Alarm Mode). Tab: "${tabTitle}" (ID: ${tabId}). Interval: ${interval}s`);
  } else {
    // Content script mode (direct injection)
    await chrome.alarms.clear(ALARM_NAME); // Ensure alarm is clean
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        func: startContentScriptInterval,
        args: [interval]
      });
      log(`Session started (Content Script Mode). Tab: "${tabTitle}" (ID: ${tabId}). Interval: ${interval}s`);
    } catch (err) {
      log(`Failed to execute script: ${err.message}`);
      throw err;
    }
  }
}

// ------------------------------------------------------------
// Stop session — clear storage & alarm/interval
// ------------------------------------------------------------
async function stopSession(reason = "manual") {
  const data = await chrome.storage.local.get(["mode", "targetTabId"]);

  // Clear any background alarm
  await chrome.alarms.clear(ALARM_NAME);

  // Clear content script interval if running
  if (data.mode === "content_script" && data.targetTabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: data.targetTabId, allFrames: true },
        func: stopContentScriptInterval
      });
    } catch (err) {
      log(`Failed to execute stop script (tab might be closed): ${err.message}`);
    }
  }

  await chrome.storage.local.set({
    isActive: false,
    targetTabId: null,
    targetTabTitle: null,
    mode: null,
    interval: null
  });
  log(`Session stopped. Reason: ${reason}`);
}

// ------------------------------------------------------------
// Main handler when alarm fires (Only for Alarm Mode)
// ------------------------------------------------------------
async function handleAlarm(alarm) {
  if (alarm.name !== ALARM_NAME) return;

  const data = await chrome.storage.local.get([
    "isActive",
    "targetTabId",
    "targetTabTitle",
  ]);

  if (!data.isActive || data.targetTabId == null) {
    log("Alarm fired but session is inactive. Clearing alarm.");
    await chrome.alarms.clear(ALARM_NAME);
    return;
  }

  const targetTabId = data.targetTabId;

  // Check if tab still exists
  let tab;
  try {
    tab = await chrome.tabs.get(targetTabId);
  } catch (_) {
    log(`Tab ID ${targetTabId} has been closed. Automatically stopping session.`);
    await stopSession("tab closed");
    return;
  }

  // Tab exists but might be loading — skip if status is not complete
  if (tab.status !== "complete") {
    log(`Tab "${tab.title}" is still loading, skipping this tick.`);
    return;
  }

  log(`Running activity simulation on tab: "${tab.title}" (ID: ${targetTabId})`);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: targetTabId, allFrames: true },
      func: simulateActivity,
    });
    log("Activity simulation successfully executed.");
  } catch (err) {
    log(`Failed to execute script: ${err.message}`);
    if (
      err.message.includes("Cannot access") ||
      err.message.includes("No tab with id")
    ) {
      await stopSession("tab inaccessible");
    }
  }
}

// ------------------------------------------------------------
// Listener: Messages from popup
// ------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "START") {
    (async () => {
      // Get the active tab in the currently focused window
      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!activeTab) {
        sendResponse({ success: false, error: "No active tab." });
        return;
      }

      // Validation: cannot run on chrome:// or extension:// pages
      if (
        activeTab.url &&
        (activeTab.url.startsWith("chrome://") ||
          activeTab.url.startsWith("chrome-extension://") ||
          activeTab.url.startsWith("edge://") ||
          activeTab.url.startsWith("about:"))
      ) {
        sendResponse({
          success: false,
          error: "Cannot run on browser system pages.",
        });
        return;
      }

      try {
        await startSession(activeTab.id, activeTab.title || "Untitled Tab", message.mode, message.interval);
        sendResponse({ success: true, tabTitle: activeTab.title });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Async response
  }

  if (message.action === "STOP") {
    (async () => {
      await stopSession("manual");
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "GET_STATUS") {
    (async () => {
      const data = await chrome.storage.local.get([
        "isActive",
        "targetTabId",
        "targetTabTitle",
        "startedAt",
        "mode",
        "interval"
      ]);
      sendResponse(data);
    })();
    return true;
  }
});

// ------------------------------------------------------------
// Listener: Alarm
// ------------------------------------------------------------
chrome.alarms.onAlarm.addListener(handleAlarm);

// ------------------------------------------------------------
// Listener: When tab is closed — auto-stop if it is the target tab
// ------------------------------------------------------------
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.local.get(["isActive", "targetTabId"]);
  if (data.isActive && data.targetTabId === tabId) {
    log(`Target tab (ID: ${tabId}) closed by user. Stopping session.`);
    await stopSession("target tab closed");
  }
});

// ------------------------------------------------------------
// Listener: When tab is updated — re-inject if reloaded in Content Script Mode
// ------------------------------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const data = await chrome.storage.local.get(["isActive", "targetTabId", "mode", "interval"]);
    if (data.isActive && data.mode === "content_script" && data.targetTabId === tabId) {
      log(`Target tab (ID: ${tabId}) reloaded. Re-injecting interval script.`);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          func: startContentScriptInterval,
          args: [data.interval]
        });
      } catch (err) {
        log(`Failed to re-inject script on reload: ${err.message}`);
      }
    }
  }
});

// Service Worker startup log
log("Service Worker active and ready.");
