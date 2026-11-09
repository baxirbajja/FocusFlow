import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function youtubeMetaPlugin(): Plugin {
  return {
    name: 'youtube-meta-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/youtube-meta', async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const videoId = url.searchParams.get('videoId');
          if (!videoId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Missing videoId' }));
            return;
          }

          let title = '';
          let durationMinutes = 15;
          let durationSeconds = 0;
          let durationFound = false;

          // 1. oEmbed for title
          try {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (oembedRes.ok) {
              const data = await oembedRes.json();
              if (data.title) title = data.title;
            }
          } catch (e) {
            console.warn('oEmbed fetch error:', e);
          }

          // 2. Watch page for duration
          try {
            const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            if (pageRes.ok) {
              const html = await pageRes.text();

              // Schema.org itemprop="duration" content="PT...S"
              const itempropMatch = html.match(/itemprop=["']duration["']\s+content=["']([^"']+)["']/i);
              if (itempropMatch && itempropMatch[1]) {
                const iso = itempropMatch[1];
                const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                  const hours = parseInt(match[1] || '0', 10);
                  const minutes = parseInt(match[2] || '0', 10);
                  const seconds = parseInt(match[3] || '0', 10);
                  const total = hours * 3600 + minutes * 60 + seconds;
                  if (total > 0) {
                    durationSeconds = total;
                    durationMinutes = Math.max(1, Math.round(total / 60));
                    durationFound = true;
                  }
                }
              }

              // approxDurationMs
              if (!durationFound) {
                const approxMatch = html.match(/["']approxDurationMs["']\s*:\s*["'](\d+)["']/);
                if (approxMatch && approxMatch[1]) {
                  const total = Math.round(parseInt(approxMatch[1], 10) / 1000);
                  if (total > 0) {
                    durationSeconds = total;
                    durationMinutes = Math.max(1, Math.round(total / 60));
                    durationFound = true;
                  }
                }
              }

              // lengthSeconds
              if (!durationFound) {
                const lengthMatch = html.match(/["']?lengthSeconds["']?\s*[:=]\s*["']?(\d+)["']?/);
                if (lengthMatch && lengthMatch[1]) {
                  const total = parseInt(lengthMatch[1], 10);
                  if (total > 0) {
                    durationSeconds = total;
                    durationMinutes = Math.max(1, Math.round(total / 60));
                    durationFound = true;
                  }
                }
              }

              if (!title) {
                const ogTitle = html.match(/<meta property=["']og:title["'] content=["'](.*?)["']/i);
                if (ogTitle && ogTitle[1]) title = ogTitle[1];
              }
            }
          } catch (e) {
            console.warn('Watch page fetch error:', e);
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            title: title || 'YouTube Video',
            durationMinutes,
            durationSeconds,
            durationFound,
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeMetaPlugin()],
  base: './', // important for Electron packaging
  server: {
    port: 5173,
    strictPort: true,
  },
});
