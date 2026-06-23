# AutoClickerPAM — Chrome Extension Manifest V3

> Keeps tabs active by automatically simulating light activity (mousemove, small scroll, focus event) without clicking buttons, submitting forms, or refreshing pages.

---

## 📁 Folder Structure

```
AutoClickerPAM/
├── manifest.json       # Manifest V3 config
├── background.js       # Service Worker (alarm + scripting)
├── popup.html          # Extension UI Popup
├── popup.js            # UI Popup Logic
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

2. Enable **Developer Mode** (toggle in the top-right corner).

3. Click the **"Load unpacked"** button.

4. Select the `AutoClickerPAM` folder (the folder containing `manifest.json`).

5. The extension will appear in your Chrome toolbar.

---

## ⚙️ How to Use

1. **Open the tab** you want to keep active (e.g., monitoring dashboard, meeting page, etc.).
2. Click the **AutoClickerPAM** icon in the Chrome toolbar.
3. Click the **Start** button — the extension will capture and save the currently active tab.
4. Feel free to switch to other tabs. The extension will keep running in the background.
5. Click **Stop** to end the session at any time.

> **Note**: If the target tab is closed, the session will automatically stop.

---

## 🛡️ Permissions Used

| Permission | Purpose |
|---|---|
| `alarms` | Triggers a tick every 60 seconds |
| `storage` | Stores tabId, status, and start time |
| `tabs` | Gets the active tab and monitors if the tab is closed |
| `scripting` | Injects the activity simulation script into the target tab |
| `activeTab` | Accesses the active tab when the popup is opened |
| `<all_urls>` | Host permission so `scripting` can run on any tab |

---

## 🎯 Simulated Activities (Every 60 seconds)

- ✅ `mousemove` — small random movement (0–50px)
- ✅ `pointermove` — small random movement (0–50px)
- ✅ `mouseover` — on the body element
- ✅ `focus` — on the window object
- ✅ Scroll 1px down and back up (after 200ms)
- ❌ Does NOT click buttons or links
- ❌ Does NOT modify page data
- ❌ Does NOT submit forms
- ❌ Does NOT refresh the page

---

## 🔧 Troubleshooting

**Extension cannot run on a specific tab?**
- The extension cannot run on browser system pages: `chrome://`, `chrome-extension://`, `edge://`, `about:`.
- Try it on a standard website tab (http:// or https://).

**Popup shows an error after reloading?**
- Reload the extension in `chrome://extensions` and open the popup again.
