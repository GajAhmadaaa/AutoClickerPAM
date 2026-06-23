# Project Backstory — AutoClickerPAM

This document explains the background, real-world pain points, and reasons why the **AutoClickerPAM** extension was designed to address productivity challenges when working with **ManageEngine PAM360** and **Windows Server** remote sessions.

---

## 🛑 The Core Problem: Aggressive Session Protection

In enterprise environments, server access security is a top priority. However, overly strict security policies often create significant bottlenecks for daily productivity:

1. **ManageEngine PAM360 Auto-Logout**:
   ManageEngine PAM360 has an idle session timeout configured centrally by administrators. If the system detects no user activity in the browser for a few minutes (typically 5–15 minutes), the portal session automatically closes. This forces users to log in again using Multi-Factor Authentication (MFA) or OTP.
2. **Forced Remote Session Disconnection (RDP/SSH)**:
   When the PAM360 portal session disconnects, all active HTML5 Gateway-based RDP/SSH remote connections running inside browser tabs are also **forcefully terminated**.
3. **Windows Server GPO Timeout**:
   Besides the PAM portal level, target Windows Server operating systems often have Group Policy Objects (GPOs) that disconnect sessions or lock the screen after a certain period of inactivity.

---

## ❌ Why Traditional Solutions Fail

Many users try generic keep-alive methods, but they come with fatal flaws:

* **Auto-Refresh Pages (F5/Reload)**:
  Reloading the web page instantly disconnects active RDP/SSH sessions in the PAM360 HTML5 gateway. Users must reconnect from scratch and lose their active work progress on the server screen.
* **Generic Auto-Clickers**:
  PAM360 portals contain sensitive buttons (e.g., *Delete*, *Reset Password*, *Disconnect Session*). Clicking random page areas risks triggering unwanted actions or disrupting data.
* **Hardware Mouse Jigglers (USB)**:
  Many corporate IT policies block unauthorized USB devices. Furthermore, physical mouse jigglers move the actual mouse cursor on your host machine, interrupting typing or working on other applications.

---

## 💡 The AutoClickerPAM Solution

The **AutoClickerPAM** extension was designed as a smart, secure, and non-intrusive solution:

1. **Target Specific Tabs**:
   Only works on the target tab manually selected by the user. You can work in other tabs, chat on Teams/Slack, or use other apps without disruption.
2. **Non-Intrusive Micro-Activity Simulation**:
   The extension **never** clicks buttons, alters data, submits forms, or reloads pages. It only simulates micro-activities:
   * Microscopic random mouse/pointer movements (0–50px)
   * A `focus` event on the window
   * Scrolling 1px down and back up within 200ms
3. **Multiframe Compatibility (`allFrames: true`)**:
   Since RDP/SSH PAM360 sessions are rendered within nested `iframes`, the extension injects simulation events into the main page *and* all child `iframes`. These events are forwarded by the HTML5 gateway to the target Windows Server, preventing idle timeouts both on the portal and the remote OS.
4. **Resource-Efficient & Automated**:
   Runs using Chrome's alarms in a lightweight background Service Worker and automatically shuts down when the target tab is closed.
