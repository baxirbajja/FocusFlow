const { contextBridge, ipcRenderer } = require('electron');

let memoryCache = {};
try {
  memoryCache = ipcRenderer.sendSync('storage-get-all-sync') || {};
} catch (e) {
  console.warn('Failed to get initial sync storage:', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  toggleAlwaysOnTop: (flag) => ipcRenderer.invoke('toggle-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  enterMiniMode: () => ipcRenderer.invoke('enter-mini-mode'),
  exitMiniMode: () => ipcRenderer.invoke('exit-mini-mode'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizedChange: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-change', handler);
    return () => ipcRenderer.removeListener('window-maximized-change', handler);
  },
  closeWindow: () => ipcRenderer.invoke('window-close'),
  fetchYouTubeMeta: (videoId) => ipcRenderer.invoke('fetch-youtube-meta', videoId),
  searchYouTube: (query) => ipcRenderer.invoke('search-youtube', query),
  fetchYouTubePlaylist: (playlistId) => ipcRenderer.invoke('fetch-youtube-playlist', playlistId),
  parseFileContent: ({ fileName, base64Data }) => ipcRenderer.invoke('parse-file-content', { fileName, base64Data }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (flag) => ipcRenderer.invoke('set-auto-start', flag),

  // Fast disk-backed storage API (memory cached for synchronous read, flushed to disk)
  getStorage: (key) => {
    return memoryCache[key] !== undefined ? memoryCache[key] : null;
  },
  setStorage: (key, value) => {
    memoryCache[key] = value;
    ipcRenderer.invoke('storage-set-item', { key, value }).catch((err) => {
      console.error('Storage set failed in main:', err);
    });
  },
  removeStorage: (key) => {
    delete memoryCache[key];
    ipcRenderer.invoke('storage-remove-item', key).catch((err) => {
      console.error('Storage remove failed in main:', err);
    });
  },
  getAllStorage: () => {
    return { ...memoryCache };
  },
  getAllStorageKeys: () => {
    return Object.keys(memoryCache);
  },
  createStoreBackup: (label) => ipcRenderer.invoke('create-store-backup', label),
  listStoreBackups: () => ipcRenderer.invoke('list-store-backups'),
  restoreStoreBackup: async (fileName) => {
    const res = await ipcRenderer.invoke('restore-store-backup', fileName);
    if (res && res.success) {
      try {
        memoryCache = ipcRenderer.sendSync('storage-get-all-sync') || {};
      } catch (e) {
        console.warn('Failed to refresh memoryCache after restore:', e);
      }
    }
    return res;
  },
  deleteStoreBackup: (fileName) => ipcRenderer.invoke('delete-store-backup', fileName),
});
