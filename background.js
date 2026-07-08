// ============================================================
// AutoClickerPAM - background.js (Service Worker)
// Manifest V3 | chrome.alarms + chrome.scripting
// ============================================================

const ALARM_PREFIX = "autoClickerPAM_alarm_";

// ------------------------------------------------------------
// Simulation Configuration Parameters
// ------------------------------------------------------------
const SCANCODE_LEFT_SHIFT = 42;
const MAX_MOUSE_MOVE_PX = 50;
const KEY_PRESS_DURATION_MS = 30;

// ------------------------------------------------------------
// Helper: Log with prefix
// ------------------------------------------------------------
function log(msg) {
  console.log(`[AutoClickerPAM] ${new Date().toLocaleTimeString()} - ${msg}`);
}

// ------------------------------------------------------------
// Scripts injected into target tab for Content Script Mode
// ------------------------------------------------------------
function injectContentScriptLoop(intervalSec, scancode, maxMouseMove, keyDuration) {
  if (window.pamAutoClickerInterval) {
    clearInterval(window.pamAutoClickerInterval);
  }

  // Parameters are passed via chrome.scripting.executeScript args
  // since the injected function cannot access the service worker scope

  function simulateContentScriptActivity() {
    try {
      // --- ManageEngine PAM360 ($rdp API) ---
      if (typeof window.$rdp !== "undefined") {
        try {
          if (typeof window.$rdp.writeScancode === "function") {
            window.$rdp.writeScancode(scancode, true); // Key down
            setTimeout(() => {
              if (typeof window.$rdp !== "undefined" && typeof window.$rdp.writeScancode === "function") {
                window.$rdp.writeScancode(scancode, false); // Key up
              }
            }, keyDuration);
          }
          if (typeof window.$rdp.mouseMove === "function") {
            const randomSmall = (max) => Math.floor(Math.random() * max);
            window.$rdp.mouseMove(randomSmall(maxMouseMove), randomSmall(maxMouseMove));
          }
        } catch (err) {
          console.error("[AutoClickerPAM] Error calling $rdp API:", err);
        }
      }

      console.log(
        "[AutoClickerPAM] Light activity simulated (Content Script Mode):",
        new Date().toLocaleTimeString()
      );
    } catch (err) {
      console.error("[AutoClickerPAM] Error during simulation:", err);
    }
  }

  // Execute once immediately
  simulateContentScriptActivity();

  // Set the interval
  window.pamAutoClickerInterval = setInterval(simulateContentScriptActivity, intervalSec * 1000);
  console.log(`[AutoClickerPAM] Keep-alive interval set to ${intervalSec}s.`);
}

// ------------------------------------------------------------
// Stop script injected into target tab for Content Script Mode
// ------------------------------------------------------------
function stopContentScriptLoop() {
  if (window.pamAutoClickerInterval) {
    clearInterval(window.pamAutoClickerInterval);
    window.pamAutoClickerInterval = null;
    console.log("[AutoClickerPAM] Keep-alive interval cleared.");
  }
}

// ------------------------------------------------------------
// Script injected into target tab for Alarm Mode (Fires once per alarm tick)
// ------------------------------------------------------------
function simulateAlarmActivity(scancode, maxMouseMove, keyDuration) {

  try {
    // --- ManageEngine PAM360 ($rdp API) ---
    if (typeof window.$rdp !== "undefined") {
      try {
        if (typeof window.$rdp.writeScancode === "function") {
          window.$rdp.writeScancode(scancode, true); // Key down
          setTimeout(() => {
            if (typeof window.$rdp !== "undefined" && typeof window.$rdp.writeScancode === "function") {
              window.$rdp.writeScancode(scancode, false); // Key up
            }
          }, keyDuration);
        }
        if (typeof window.$rdp.mouseMove === "function") {
          const randomSmall = (max) => Math.floor(Math.random() * max);
          window.$rdp.mouseMove(randomSmall(maxMouseMove), randomSmall(maxMouseMove));
        }
      } catch (err) {
        console.error("[AutoClickerPAM] Error calling $rdp API:", err);
      }
    }

    console.log(
      "[AutoClickerPAM] Light activity simulated (Alarm Mode):",
      new Date().toLocaleTimeString()
    );
  } catch (err) {
    console.error("[AutoClickerPAM] Error during simulation:", err);
  }
}

// ------------------------------------------------------------
// In-Memory Session Cache to prevent storage read-modify-write race conditions
// ------------------------------------------------------------
let sessionCache = null;

async function getSessions() {
  if (sessionCache === null) {
    const storage = await chrome.storage.local.get("activeSessions");
    sessionCache = storage.activeSessions || {};
  }
  return sessionCache;
}

async function saveSessions(sessions) {
  sessionCache = sessions;
  await chrome.storage.local.set({ activeSessions: sessionCache });
}

// ------------------------------------------------------------
// Start session
// ------------------------------------------------------------
async function startSession(tabId, tabTitle, mode, interval) {
  const activeSessions = await getSessions();

  activeSessions[tabId] = {
    tabId: tabId,
    tabTitle: tabTitle,
    startedAt: Date.now(),
    mode: mode,
    interval: interval
  };

  await saveSessions(activeSessions);

  const alarmName = `${ALARM_PREFIX}${tabId}`;

  if (mode === "alarm") {
    // Clear old alarm if exists, then create a new one
    await chrome.alarms.clear(alarmName);
    const periodMinutes = interval / 60;
    chrome.alarms.create(alarmName, {
      delayInMinutes: periodMinutes,
      periodInMinutes: periodMinutes,
    });
    log(`Session started (Alarm Mode). Tab: "${tabTitle}" (ID: ${tabId}). Interval: ${interval}s`);
  } else if (mode === "content_script") {
    // Content script mode (direct injection)
    await chrome.alarms.clear(alarmName); // Ensure alarm is clean
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        func: injectContentScriptLoop,
        args: [interval, SCANCODE_LEFT_SHIFT, MAX_MOUSE_MOVE_PX, KEY_PRESS_DURATION_MS],
        world: "MAIN" // Inject into page context to access window.$rdp
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
async function stopSession(tabId, reason = "manual") {
  const activeSessions = await getSessions();

  const session = activeSessions[tabId];
  if (!session) {
    log(`Stop session requested for Tab ID ${tabId} but no active session found.`);
    return;
  }

  const alarmName = `${ALARM_PREFIX}${tabId}`;
  await chrome.alarms.clear(alarmName);

  // Clear content script interval if running
  if (session.mode === "content_script") {
    let tabExists = false;
    try {
      await chrome.tabs.get(tabId);
      tabExists = true;
    } catch (_) {
      log(`Tab ID ${tabId} does not exist. Skipping stop script injection.`);
    }

    if (tabExists) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          func: stopContentScriptLoop,
          world: "MAIN" // Must match the world where we injected
        });
      } catch (err) {
        log(`Failed to execute stop script for Tab ID ${tabId}: ${err.message}`);
      }
    }
  }

  delete activeSessions[tabId];
  await saveSessions(activeSessions);
  log(`Session stopped for Tab ID ${tabId}. Reason: ${reason}`);
}

// ------------------------------------------------------------
// Main handler when alarm fires (Only for Alarm Mode)
// ------------------------------------------------------------
async function handleAlarm(alarm) {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  const tabId = parseInt(alarm.name.replace(ALARM_PREFIX, ""), 10);
  if (isNaN(tabId)) return;

  const activeSessions = await getSessions();
  const session = activeSessions[tabId];

  if (!session) {
    log(`Alarm fired for inactive session (Tab ID: ${tabId}). Clearing alarm.`);
    await chrome.alarms.clear(alarm.name);
    return;
  }

  // Check if tab still exists
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (_) {
    log(`Tab ID ${tabId} has been closed. Automatically stopping session.`);
    await stopSession(tabId, "tab closed");
    return;
  }

  // Tab exists but might be loading — skip if status is not complete
  if (tab.status !== "complete") {
    log(`Tab "${tab.title}" is still loading, skipping this tick.`);
    return;
  }

  log(`Running activity simulation on tab: "${tab.title}" (ID: ${tabId})`);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: simulateAlarmActivity,
      args: [SCANCODE_LEFT_SHIFT, MAX_MOUSE_MOVE_PX, KEY_PRESS_DURATION_MS],
      world: "MAIN" // Inject into page context to access window.$rdp
    });
    log(`Activity simulation successfully executed on Tab ID: ${tabId}`);
  } catch (err) {
    log(`Failed to execute script on Tab ID ${tabId}: ${err.message}`);
    if (
      err.message.includes("Cannot access") ||
      err.message.includes("No tab with id")
    ) {
      await stopSession(tabId, "tab inaccessible");
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

      // Defensive Validation for Mode and Interval
      const mode = message.mode;
      const interval = parseInt(message.interval, 10);

      if (mode !== "alarm" && mode !== "content_script") {
        sendResponse({ success: false, error: "Invalid operation mode." });
        return;
      }

      if (isNaN(interval) || interval < 5 || interval > 3600) {
        sendResponse({ success: false, error: "Interval must be between 5 and 3600 seconds." });
        return;
      }

      if (mode === "alarm" && interval < 60) {
        sendResponse({ success: false, error: "Alarm mode requires an interval of at least 60 seconds." });
        return;
      }

      try {
        await startSession(activeTab.id, activeTab.title || "Untitled Tab", mode, interval);
        sendResponse({ success: true, tabTitle: activeTab.title });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Async response
  }

  if (message.action === "STOP") {
    (async () => {
      const tabId = message.tabId;
      if (tabId === "all") {
        const activeSessions = await getSessions();
        for (const id of Object.keys(activeSessions)) {
          await stopSession(parseInt(id, 10), "manual_all");
        }
      } else if (tabId) {
        await stopSession(parseInt(tabId, 10), "manual");
      }
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "GET_STATUS") {
    (async () => {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      const currentTabId = activeTab ? activeTab.id : null;
      const currentTabTitle = activeTab ? activeTab.title : "";

      const activeSessions = await getSessions();

      sendResponse({
        currentTabId: currentTabId,
        currentTabTitle: currentTabTitle,
        activeSessions: activeSessions
      });
    })();
    return true;
  }
});

// ------------------------------------------------------------
// Listener: Alarm
// ------------------------------------------------------------
chrome.alarms.onAlarm.addListener(handleAlarm);

// ------------------------------------------------------------
// Listener: When tab is closed — auto-stop if it is in activeSessions
// ------------------------------------------------------------
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const activeSessions = await getSessions();
  if (activeSessions[tabId]) {
    log(`Target tab (ID: ${tabId}) closed by user. Stopping session.`);
    await stopSession(tabId, "tab closed");
  }
});

// ------------------------------------------------------------
// Listener: When tab is updated — re-inject if reloaded in Content Script Mode
// ------------------------------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const activeSessions = await getSessions();
    const session = activeSessions[tabId];
    if (session && session.mode === "content_script") {
      log(`Target tab (ID: ${tabId}) reloaded. Re-injecting interval script.`);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          func: injectContentScriptLoop,
          args: [session.interval, SCANCODE_LEFT_SHIFT, MAX_MOUSE_MOVE_PX, KEY_PRESS_DURATION_MS],
          world: "MAIN"
        });
      } catch (err) {
        log(`Failed to re-inject script on reload: ${err.message}`);
      }
    }
  }
});

// ------------------------------------------------------------
// Listener: When browser starts up — clean up all stale sessions
// ------------------------------------------------------------
chrome.runtime.onStartup.addListener(async () => {
  log("Browser started. Clearing all stale active sessions.");
  await saveSessions({});
  await chrome.alarms.clearAll();
});

// Service Worker startup log
log("Service Worker active and ready.");
