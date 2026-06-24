# AutoClickerPAM — Chrome Extension Manifest V3

> Keeps tabs active by automatically simulating light activity (`mousemove`, small scroll, `focus` event) without clicking buttons, submitting forms, or refreshing pages.
>
> 📖 **Read the [Project Backstory](file:///d:/proj/AutoClickerPAM/BACKSTORY.md)** to learn about the specific RDP, PAM360, and Windows GPO session timeout problems this extension solves.

---

## ⚡ Key Features

1. **Concurrent Multi-Tab Support**:
   * Run independent keep-alive sessions on multiple tabs simultaneously.
   * The popup dynamically displays status controls for the current tab, while listing all other active background sessions at the bottom.
   * Stop individual background tabs directly from the popup list, or stop all sessions at once with the **Stop All** command.
2. **Dual Activation Modes**:
   * **Alarm Mode (Min. 60s)**: Uses Chrome's background `alarms` API. It is highly battery-efficient and runs execution in the background at regular intervals (minimum 60 seconds due to Chrome limit).
   * **Content Script Mode (Min. 5s)**: Directly injects a script into the target page. Allows shorter, customizable intervals (minimum 5 seconds) for systems with aggressive session timeouts.
3. **Reload Resilience**:
   * If you refresh or reload the target tab while **Content Script Mode** is active, the extension automatically detects the update and re-injects the keep-alive loop. No manual restart is required.
4. **Safe Simulation**:
   * Simulates light, natural user activities every tick without modifying page data, clicking elements, or initiating page reloads.
5. **Minimal Dark-Themed UI**:
   * High performance, distraction-free control panel.
   * Displays the active target tab name, elapsed duration timer, and real-time visual progress bar tracking the current interval.
6. **Smart Auto-Stop**:
   * Automatically terminates background tasks and cleans up storage if a target tab is closed by the user.

---

## 📁 Folder Structure

```
AutoClickerPAM/
├── manifest.json       # Manifest V3 config
├── background.js       # Service Worker (alarm management & scripting coordination)
├── popup.html          # Light, clean, dark-themed HTML user interface
├── popup.js            # UI interactions, settings validation & state rendering
├── BACKSTORY.md        # The problem statement and design rationale
└── icons/              # Extension icons in standard resolutions
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation in Chrome

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
2. Enable **Developer Mode** (toggle switch in the top-right corner).
3. Click the **"Load unpacked"** button in the top-left.
4. Select the `AutoClickerPAM` directory (the folder containing `manifest.json`).
5. Pin the extension to your Chrome toolbar for easy access.

---

## ⚙️ How to Use

1. **Open the target tab** you wish to keep alive (e.g., an RDP session, monitoring page, or corporate portal).
2. Click the **AutoClickerPAM** icon in the toolbar.
3. Choose your preferred **Mode**:
   * **Alarm Mode**: Set an interval of **60 seconds** or more.
   * **Content Script Mode**: Set an interval between **5 seconds** and higher.
4. Click **Start**. The extension will capture the tab, lock the settings UI, and show the active duration counter and interval progress bar.
5. Click **Stop** at any time to end the session.

---

## 🛡️ Permissions Used

| Permission | Purpose |
|---|---|
| `alarms` | Triggers background tick events for the Alarm Mode |
| `storage` | Persists session configuration and active status across popup sessions |
| `tabs` | Identifies active tab metadata and listens to tab closure / updates |
| `scripting` | Coordinates injection of the simulation scripts |
| `activeTab` | Temporarily grants access to the current page when clicked |
| `<all_urls>` | Host permission allowing scripting injection on required web pages |

---

## 🎯 Simulated Activities (Every Tick)

- ✅ **`mousemove`** — Small random cursor displacement (0–50px)
- ✅ **`pointermove`** — Correlated pointer updates for modern web applications
- ✅ **`mouseover`** — Dispatched on the `document.body`
- ✅ **`focus`** — Dispatched on the `window` context
- ✅ **Microscopic Scroll** — Scrolls exactly `1px` down and back up after 200ms
- ❌ **NO Button Clicks** — Will not click random links or buttons
- ❌ **NO Form Submissions** — Will not submit or alter input fields
- ❌ **NO Hard Page Refreshes** — Keeps your current input and view state untouched

---

## 🔧 Troubleshooting

* **Extension cannot run on a specific tab?**
  * Chrome limits extensions from accessing system pages: `chrome://`, `chrome-extension://`, `edge://`, `about:`. Please run it on standard web pages (`http://` or `https://`).
* **Popup shows connection error?**
  * If you have recently updated or reloaded the extension, reload the active tab and re-open the popup UI.

