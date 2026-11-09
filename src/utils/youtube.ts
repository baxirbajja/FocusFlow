import { extractYouTubeId } from './storage';

export interface YouTubeMetaResult {
  videoId: string;
  title: string;
  durationMinutes: number;
  durationSeconds?: number;
}

export async function fetchYouTubeDetails(url: string): Promise<YouTubeMetaResult | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // 1. Try Electron native IPC (Primary: Node.js fetch with no CORS)
  if (window.electronAPI?.fetchYouTubeMeta) {
    try {
      const res = await window.electronAPI.fetchYouTubeMeta(videoId);
      if (res && res.success) {
        return {
          videoId,
          title: res.title || 'YouTube Video',
          durationMinutes: res.durationMinutes || 15,
          durationSeconds: res.durationSeconds,
        };
      }
    } catch (e) {
      console.warn('Electron YouTube meta fetch failed, falling back:', e);
    }
  }

  // 2. Try Vite Local API Dev Endpoint (/api/youtube-meta?videoId=...)
  try {
    const apiRes = await fetch(`/api/youtube-meta?videoId=${videoId}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success) {
        return {
          videoId,
          title: data.title || 'YouTube Video',
          durationMinutes: data.durationMinutes || 15,
          durationSeconds: data.durationSeconds,
        };
      }
    }
  } catch (e) {
    // If not running Vite server (e.g. static preview), continue to oEmbed
  }

  // 3. Web browser fallback via noembed / oEmbed for title
  try {
    const oembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      return {
        videoId,
        title: data.title || 'YouTube Video',
        durationMinutes: 15, // fallback
      };
    }
  } catch (err) {
    console.warn('Browser oEmbed fetch error:', err);
  }

  return {
    videoId,
    title: '',
    durationMinutes: 15,
  };
}
