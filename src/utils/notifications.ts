import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Cross-platform Desktop & Browser Notification Service

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      showNotification: (options: { title: string; body: string; urgency?: 'low' | 'normal' | 'critical' }) => Promise<boolean>;
      toggleAlwaysOnTop: (flag: boolean) => Promise<boolean>;
      getAlwaysOnTop: () => Promise<boolean>;
      fetchYouTubeMeta?: (videoId: string) => Promise<{
        success: boolean;
        title: string;
        durationMinutes: number;
        durationSeconds?: number;
        error?: string;
      }>;
      searchYouTube?: (query: string) => Promise<Array<{
        videoId: string;
        title: string;
        url: string;
        durationMinutes: number;
        durationText: string;
        channel: string;
        thumbnail: string;
      }>>;
      fetchYouTubePlaylist?: (playlistId: string) => Promise<{
        success: boolean;
        playlistId?: string;
        title?: string;
        videos?: Array<{
          videoId: string;
          title: string;
          url: string;
          durationMinutes: number;
          durationText: string;
          thumbnail: string;
        }>;
        error?: string;
      }>;
      parseFileContent?: (params: { fileName: string; base64Data: string }) => Promise<{
        success: boolean;
        text?: string;
        error?: string;
      }>;
      openExternal?: (url: string) => Promise<boolean>;
      getAutoStart?: () => Promise<boolean>;
      setAutoStart?: (enabled: boolean) => Promise<boolean>;
      getStorage?: (key: string) => any;
      setStorage?: (key: string, value: any) => void;
      removeStorage?: (key: string) => void;
      getAllStorage?: () => Record<string, any>;
      getAllStorageKeys?: () => string[];
    };
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (window.electronAPI?.isElectron) {
    return true;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Capacitor notification permission request failed:', err);
      return false;
    }
  }

  if (!('Notification' in window)) {
    console.warn('This environment does not support system notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function sendDesktopNotification(
  title: string,
  body: string,
  urgency: 'low' | 'normal' | 'critical' = 'normal'
) {
  // 1. Try Electron native notification
  if (window.electronAPI?.isElectron) {
    try {
      await window.electronAPI.showNotification({ title, body, urgency });
      return;
    } catch (e) {
      console.error('Electron notification failed:', e);
    }
  }

  // 2. Try Capacitor Android native notification
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor((Date.now() % 1000000)),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
      return;
    } catch (e) {
      console.error('Capacitor notification failed:', e);
    }
  }

  // 3. Fallback to HTML5 Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: 'focusflow-alert',
      });
      notif.onclick = () => {
        window.focus();
      };
    } catch (e) {
      console.error('HTML5 notification failed:', e);
    }
  }
}
