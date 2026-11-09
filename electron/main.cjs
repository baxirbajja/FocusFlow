const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, shell, session, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure unified userData folder across dev and packaged modes
app.name = 'FocusFlow';
const userDataPath = path.join(app.getPath('appData'), 'FocusFlow');
app.setPath('userData', userDataPath);

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const storeFilePath = path.join(userDataPath, 'focusflow_store.json');

function readDiskStore() {
  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read store file:', err);
  }
  return {};
}

function writeDiskStore(data) {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed write to store file:', err);
    return false;
  }
}

// Disk Storage IPC Handlers
ipcMain.on('storage-get-all-sync', (event) => {
  event.returnValue = readDiskStore();
});

ipcMain.handle('storage-get-all', () => {
  return readDiskStore();
});

ipcMain.handle('storage-get-item', (event, key) => {
  const store = readDiskStore();
  return store[key] !== undefined ? store[key] : null;
});

ipcMain.handle('storage-set-item', (event, { key, value }) => {
  const store = readDiskStore();
  store[key] = value;
  return writeDiskStore(store);
});

ipcMain.handle('storage-remove-item', (event, key) => {
  const store = readDiskStore();
  delete store[key];
  return writeDiskStore(store);
});

let mainWindow = null;
let isQuitting = false;
let tray = null;

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, 'tray-icon.png');
  const icon = fs.existsSync(iconPath) 
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);

  const updateContextMenu = () => {
    const isAutoStart = app.getLoginItemSettings().openAtLogin;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open FocusFlow',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Auto-Start on PC Boot (Windows)',
        type: 'checkbox',
        checked: isAutoStart,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            openAsHidden: true,
          });
          updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit FocusFlow Completely',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();
  tray.setToolTip('FocusFlow - Time & Rest Organizer (Active in background)');

  // Clicking tray icon toggles window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'tray-icon.png');

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#121214',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    title: 'FocusFlow Organizer',
  });

  // When clicking close (X), minimize to system tray and keep running in background!
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (Notification.isSupported()) {
        const notif = new Notification({
          title: 'FocusFlow is still running in background',
          body: 'Your timer and scheduled notifications are active. Click the taskbar tray icon to reopen.',
          silent: true,
        });
        notif.show();
      }
      return false;
    }
  });

  // Route any external web links to the user's default browser (Chrome, Edge, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-auto-start', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (event, flag) => {
  app.setLoginItemSettings({
    openAtLogin: !!flag,
    openAsHidden: true,
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('open-external', (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('show-notification', (event, { title, body, urgency }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || 'FocusFlow',
      body: body || '',
      urgency: urgency || 'normal',
      silent: false,
    });
    notif.show();
    return true;
  }
  return false;
});

let savedNormalBounds = null;

ipcMain.handle('enter-mini-mode', () => {
  if (mainWindow) {
    const current = mainWindow.getBounds();
    if (current.width > 500 && current.height > 300) {
      savedNormalBounds = current;
    }
    mainWindow.setMinimumSize(320, 120);
    mainWindow.setSize(380, 165);

    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
      mainWindow.setPosition(Math.max(0, screenW - 400), Math.max(0, screenH - 185));
    } catch (_) {}

    mainWindow.setAlwaysOnTop(true, 'floating');
    return true;
  }
  return false;
});

ipcMain.handle('exit-mini-mode', () => {
  if (mainWindow) {
    mainWindow.setMinimumSize(800, 600);
    if (savedNormalBounds && savedNormalBounds.width >= 800) {
      mainWindow.setBounds(savedNormalBounds);
    } else {
      mainWindow.setSize(1240, 860);
      mainWindow.center();
    }
    mainWindow.setAlwaysOnTop(false);
    return false;
  }
  return false;
});

ipcMain.handle('toggle-always-on-top', (event, flag) => {
  if (mainWindow) {
    const next = typeof flag === 'boolean' ? flag : !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next, 'floating');
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});

ipcMain.handle('get-always-on-top', () => {
  if (mainWindow) {
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});

function parseDurationFromHtml(html) {
  // Strategy 1: itemprop="duration" content="PT...S" (Standard Schema.org meta tag)
  const itempropMatch = html.match(/itemprop=["']duration["']\s+content=["']([^"']+)["']/i);
  if (itempropMatch && itempropMatch[1]) {
    const iso = itempropMatch[1];
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds > 0) {
        return {
          durationSeconds: totalSeconds,
          durationMinutes: Math.max(1, Math.round(totalSeconds / 60))
        };
      }
    }
  }

  // Strategy 2: "approxDurationMs":"..."
  const approxMatch = html.match(/["']approxDurationMs["']\s*:\s*["'](\d+)["']/);
  if (approxMatch && approxMatch[1]) {
    const totalSeconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
    if (totalSeconds > 0) {
      return {
        durationSeconds: totalSeconds,
        durationMinutes: Math.max(1, Math.round(totalSeconds / 60))
      };
    }
  }

  // Strategy 3: lengthSeconds
  const lengthMatch = html.match(/["']?lengthSeconds["']?\s*[:=]\s*["']?(\d+)["']?/);
  if (lengthMatch && lengthMatch[1]) {
    const totalSeconds = parseInt(lengthMatch[1], 10);
    if (totalSeconds > 0) {
      return {
        durationSeconds: totalSeconds,
        durationMinutes: Math.max(1, Math.round(totalSeconds / 60))
      };
    }
  }

  // Strategy 4: simpleText duration e.g. "simpleText":"12:34" or "1:02:15"
  const timeTextMatch = html.match(/["']simpleText["']\s*:\s*["'](\d+:\d+(?::\d+)?)["']/);
  if (timeTextMatch && timeTextMatch[1]) {
    const parts = timeTextMatch[1].split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1];
    }
    if (totalSeconds > 0) {
      return {
        durationSeconds: totalSeconds,
        durationMinutes: Math.max(1, Math.round(totalSeconds / 60))
      };
    }
  }

  return null;
}

// Auto-fetch YouTube Metadata (Title & Exact Duration)
ipcMain.handle('fetch-youtube-meta', async (event, videoId) => {
  try {
    let title = '';
    let durationMinutes = 15;
    let durationSeconds = 0;
    let durationFound = false;

    // 1. Fetch clean title via YouTube oEmbed
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) {
          title = data.title;
        }
      }
    } catch (err) {
      console.warn('oEmbed fetch failed:', err);
    }

    // 2. Fetch duration & fallback title from watch page
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const parsed = parseDurationFromHtml(html);
        if (parsed) {
          durationSeconds = parsed.durationSeconds;
          durationMinutes = parsed.durationMinutes;
          durationFound = true;
        }

        if (!title) {
          const ogTitleMatch = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            title = ogTitleMatch[1];
          } else {
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].replace(' - YouTube', '').trim();
            }
          }
        }
      }
    } catch (err) {
      console.warn('Page duration fetch failed:', err);
    }

    return {
      success: true,
      title: title || 'YouTube Video',
      durationMinutes: durationMinutes || 15,
      durationSeconds,
      durationFound,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// PDF & Document File Text Extractor
ipcMain.handle('parse-file-content', async (event, { fileName, base64Data }) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const lowerName = (fileName || '').toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      return { success: true, text: data.text || '' };
    }

    // Default to utf-8 plain text for .txt, .vtt, .srt, .md, .json, .csv, .sh, .py, etc.
    const text = buffer.toString('utf-8');
    return { success: true, text };
  } catch (err) {
    console.error('File parsing error:', err);
    return { success: false, error: err.message };
  }
});

// Search YouTube directly (no API key required)
ipcMain.handle('search-youtube', async (event, query) => {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.*?});/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const items = [];
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      const renderers = section.itemSectionRenderer?.contents || [];
      for (const item of renderers) {
        if (item.videoRenderer) {
          const vr = item.videoRenderer;
          const timeText = vr.lengthText?.simpleText || '15:00';
          const parts = timeText.split(':').map(Number);
          let durationMinutes = 15;
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            durationMinutes = Math.max(1, parts[0] + Math.round(parts[1] / 60));
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            durationMinutes = Math.max(1, parts[0] * 60 + parts[1] + Math.round(parts[2] / 60));
          }

          items.push({
            videoId: vr.videoId,
            title: vr.title?.runs?.map(r => r.text).join('') || '',
            url: `https://www.youtube.com/watch?v=${vr.videoId}`,
            durationMinutes,
            durationText: timeText,
            channel: vr.ownerText?.runs?.map(r => r.text).join('') || '',
            thumbnail: `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`,
          });
        }
      }
    }
    return items.slice(0, 8);
  } catch (err) {
    console.error('YouTube search failed:', err);
    return [];
  }
});

// Fetch all videos from a YouTube Playlist (no API key required)
ipcMain.handle('fetch-youtube-playlist', async (event, playlistId) => {
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return { success: false, error: 'Could not fetch playlist page' };

    const html = await res.text();
    let playlistTitle = 'YouTube Playlist';
    const ogTitleMatch = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      playlistTitle = ogTitleMatch[1].replace(' - YouTube', '').trim();
    } else {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        playlistTitle = titleMatch[1].replace(' - YouTube', '').trim();
      }
    }

    const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.*?});/);
    const rawVideos = [];

    if (match) {
      const data = JSON.parse(match[1]);

      function extractVideos(obj) {
        if (!obj || typeof obj !== 'object') return;

        // Modern YouTube lockupViewModel
        if (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
          const lv = obj.lockupViewModel;
          const videoId = lv.contentId;
          let title = lv.metadata?.lockupMetadataViewModel?.title?.content || '';
          if (!title && lv.rendererContext?.accessibilityContext?.label) {
            title = lv.rendererContext.accessibilityContext.label;
          }

          let durationText = '15:00';
          try {
            const overlays = lv.contentImage?.thumbnailViewModel?.overlays || [];
            for (const ov of overlays) {
              const badges = ov.thumbnailBottomOverlayViewModel?.badges || [];
              for (const b of badges) {
                if (b.thumbnailBadgeViewModel?.text) {
                  durationText = b.thumbnailBadgeViewModel.text;
                  break;
                }
              }
            }
          } catch (_) {}

          const parts = durationText.split(':').map(Number);
          let durationMinutes = 15;
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            durationMinutes = Math.max(1, parts[0] + Math.round(parts[1] / 60));
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            durationMinutes = Math.max(1, parts[0] * 60 + parts[1] + Math.round(parts[2] / 60));
          }

          rawVideos.push({
            videoId,
            title: title.trim() || 'Video',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            durationMinutes,
            durationText,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          });
        }

        // Classic playlistVideoRenderer
        if (obj.playlistVideoRenderer) {
          const vr = obj.playlistVideoRenderer;
          const videoId = vr.videoId;
          const title = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || '';
          const durationText = vr.lengthText?.simpleText || '15:00';
          const parts = durationText.split(':').map(Number);
          let durationMinutes = 15;
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            durationMinutes = Math.max(1, parts[0] + Math.round(parts[1] / 60));
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            durationMinutes = Math.max(1, parts[0] * 60 + parts[1] + Math.round(parts[2] / 60));
          }

          rawVideos.push({
            videoId,
            title: title.trim() || 'Video',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            durationMinutes,
            durationText,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          });
        }

        for (const k of Object.keys(obj)) {
          extractVideos(obj[k]);
        }
      }

      extractVideos(data);
    }

    // Deduplicate videos
    const videos = [];
    const seen = new Set();
    for (const v of rawVideos) {
      if (!seen.has(v.videoId)) {
        seen.add(v.videoId);
        videos.push(v);
      }
    }

    return {
      success: true,
      playlistId,
      title: playlistTitle,
      videos,
    };
  } catch (err) {
    console.error('Fetch playlist error:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.focusflow.organizer');
  }

  // Fix YouTube Embed in Electron:
  // When loading YouTube embed from local files (file://), Chromium sends no Referer to /embed/.
  // We only inject a valid web Referer on the initial /embed/ document request, preserving
  // YouTube player's internal sub-request referrers so there are no 153 or 152-4 errors.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = details.requestHeaders || {};
    if (details.url.includes('/embed/')) {
      if (!requestHeaders['Referer'] || requestHeaders['Referer'].startsWith('file:')) {
        requestHeaders['Referer'] = 'https://www.google.com/';
      }
    }
    callback({ cancel: false, requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['x-frame-options'];
      delete responseHeaders['X-Frame-Options'];
      callback({ cancel: false, responseHeaders });
    }
  );

  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
