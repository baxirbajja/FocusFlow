# FocusFlow - Dynamic Time & Rest Organizer

> A dynamic personal time-management and procrastination-killing tool for **Windows Desktop & Android Mobile**, built with **Electron, Capacitor, React 19, TypeScript, and Tailwind CSS**.

---

## 🎯 The Procrastination Killer & Accountability Engine

Standard to-do lists and calendar apps fail because passive notifications are easily ignored, and static schedules crumble when one task runs 15 minutes late. 

**FocusFlow solves this through dynamic synchronized systems:**

### 1. Dual Time Budgets & Rest Pool Auto-Burn
* **Work vs. Rest Budgets:** Lock in your **Target Work Hours** (e.g. 5h study) and your **Target Rest Pool** (e.g. 3h leisure).
* **🔥 The Procrastination Killer:** When your day is started and **NO task is in progress**, the app treats you as resting. Your **Rest Pool automatically burns down**.
* **Over-Rest Alarms:** If you exceed your rest budget, urgent alarms and notifications fire: *"Rest Budget Exceeded! Pick your next task now to stop wasting time."*
* **Dynamic Rebalancing:** If a task runs over, add `+10m` / `+15m` / `+30m` with one click. Subsequent tasks dynamically shift forward so your day never breaks.

---

### 2. AI Lecture & TP Homework Digest (Gemini AI)
* **Teams & Wispr Flow Transcriptions:** Paste your online class lecture transcript (or drag `.vtt`, `.srt`, `.txt` files).
* **TP Document Extraction:** Drop your teacher's PDF lab sheets or homework files.
* **Smart Analysis:** Powered by Google Gemini (`gemini-2.5-flash`), automatically extracting:
  - Exact assignments, homework, and practical works (TPs) with realistic duration estimates.
  - Core technical concepts that need clarification.
  - Top-ranked educational YouTube tutorials matched to those concepts with custom summary notes.
* **1-Click Scheduling:** Review extracted tasks and recommended tutorials, then add them directly into your daily schedule.

---

### 3. Study Library & Unlimited YouTube Playlists
* **Subject Folders:** Organize your courses (*Linux Administration*, *French Fluency*, *Mathematics*, etc.).
* **Unlimited Playlists:** Drag and drop YouTube playlist links directly onto the app to auto-import all videos with titles, thumbnails, and durations (no API key required).
* **Distraction-Free Video Player:** Embedded YouTube playback that blocks algorithmic rabbit holes, external recommendations, and comments.
* **Direct Scheduling:** Add any video from your study library directly into today's or tomorrow's work schedule.

---

### 4. Background Running & Offline PC Shutdown Catchup
* **System Tray Minimized Mode:** Closing the app with "X" does not quit — it minimizes to the Windows taskbar tray so your timers and reminders keep counting.
* **Auto-Start on PC Boot:** One-click toggle to launch FocusFlow automatically with Windows.
* **Offline Time Reconciliation:** If your computer was shut down or asleep while studying, FocusFlow calculates the exact elapsed gap upon reboot and asks if you want to count that offline study time towards your task.

---

### 5. Cross-Platform: Windows Desktop & Android Mobile
* **Windows Desktop:** Standalone executable running on Electron with system notifications, tray management, and floating HUD.
* **Android Native:** Packaged with **Capacitor** with native local notifications, touch-friendly bottom navigation, and mobile edge-to-edge styling.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
git clone https://github.com/baxirbajja/FocusFlow.git
cd FocusFlow
npm install --legacy-peer-deps
```

### Running the Desktop App
```bash
# Live development mode with hot reload
npm run electron:dev

# Run standalone desktop app
npm run desktop

# Package into Windows executable (.exe)
npm run pack
```

### Running the Android App
```bash
# Sync web build to native Android
npm run android:sync

# Open native project in Android Studio
npm run android:open
```

---

## 🛠 Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Desktop:** Electron, Node.js IPC, System Tray, File System Storage
- **Mobile:** Capacitor Android, Native Local Notifications, SharedPreferences
- **AI Integration:** Google Gemini API (`gemini-2.5-flash`)
- **Document Processing:** PDF parsing (`pdf-parse`) & YouTube oEmbed scraper
