import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Briefcase, 
  Coffee, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2, 
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { YouTubeVideo } from '../types';
import { formatMinutes } from '../utils/storage';

interface YouTubePlayerModalProps {
  video: YouTubeVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkDone?: (video: YouTubeVideo, currentSeconds: number) => void;
  onCloseWithTimestamp?: (video: YouTubeVideo, currentSeconds: number) => void;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  video,
  isOpen,
  onClose,
  onMarkDone,
  onCloseWithTimestamp,
}) => {
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('focusflow_player_theater_mode');
      return saved !== null ? saved === 'true' : true; // Default to true (Theater Mode!)
    } catch {
      return true;
    }
  });

  const currentSecondsRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleTheaterMode = () => {
    setIsTheaterMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('focusflow_player_theater_mode', String(next));
      } catch {}
      return next;
    });
  };

  // Initialize or reset playback position when video changes
  useEffect(() => {
    if (video) {
      const initial = Math.max(0, Math.floor(video.lastPlayedSeconds || 0));
      setCurrentSeconds(initial);
      currentSecondsRef.current = initial;
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  }, [video]);

  // Keep ref in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Local second-by-second ticker while video is playing
  useEffect(() => {
    if (!isOpen || !video) return;

    const interval = setInterval(() => {
      if (isPlayingRef.current) {
        currentSecondsRef.current += 1;
        setCurrentSeconds(currentSecondsRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, video]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, video]);

  // Listen for YouTube IFrame PostMessage events
  useEffect(() => {
    if (!isOpen || !video) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
        if (data.event === 'onStateChange') {
          if (data.info === 0) {
            handleVideoEnded();
          } else if (data.info === 1) {
            setIsPlaying(true);
          } else if (data.info === 2) {
            setIsPlaying(false);
          }
        } else if (data.event === 'infoDelivery') {
          if (data.info) {
            if (data.info.playerState === 0) {
              handleVideoEnded();
            } else if (data.info.playerState === 1) {
              setIsPlaying(true);
            } else if (data.info.playerState === 2) {
              setIsPlaying(false);
            }

            if (typeof data.info.currentTime === 'number') {
              const ytSec = Math.floor(data.info.currentTime);
              currentSecondsRef.current = ytSec;
              setCurrentSeconds(ytSec);
            }
          }
        }
      } catch {
        // Ignore non-json or unrelated window messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, video]);

  if (!isOpen || !video) return null;

  const isWork = video.type === 'work';
  const startSeconds = Math.max(0, Math.floor(video.lastPlayedSeconds || 0));

  const handleVideoEnded = () => {
    const totalVideoSec = Math.max(currentSecondsRef.current, Math.round(video.durationMinutes * 60));
    if (onMarkDone) {
      onMarkDone(video, totalVideoSec);
    } else {
      onClose();
    }
  };

  const handleManualMarkDone = () => {
    const totalVideoSec = Math.max(currentSecondsRef.current, Math.round(video.durationMinutes * 60));
    if (onMarkDone) {
      onMarkDone(video, totalVideoSec);
    } else {
      onClose();
    }
  };

  const handleDismiss = () => {
    if (onCloseWithTimestamp) {
      onCloseWithTimestamp(video, currentSecondsRef.current);
    } else {
      onClose();
    }
  };

  const handleOpenExternal = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = `https://www.youtube.com/watch?v=${video.videoId}${startSeconds > 0 ? `&t=${startSeconds}s` : ''}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleResetPlayback = () => {
    currentSecondsRef.current = 0;
    setCurrentSeconds(0);
    if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&enablejsapi=1&start=0`;
    }
  };

  const iframeSrc = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&enablejsapi=1${startSeconds > 0 ? `&start=${startSeconds}` : ''}`;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-center bg-black/90 backdrop-blur-md animate-fade-in ${
        isTheaterMode ? 'p-0' : 'p-4 items-center'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div 
        className={`bg-[#18181b] flex flex-col shadow-2xl transition-all ${
          isTheaterMode 
            ? 'w-full max-w-none border-y border-zinc-800 my-auto' 
            : 'border border-zinc-700 rounded-2xl w-full max-w-4xl p-5 overflow-hidden'
        }`}
      >
        
        {/* Top Header */}
        <div 
          className={`flex items-center justify-between shrink-0 ${
            isTheaterMode 
              ? 'px-4 sm:px-8 py-3 border-b border-zinc-800' 
              : 'pb-3 border-b border-zinc-800 mb-3'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isWork ? 'bg-zinc-800 text-zinc-200' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
            }`}>
              {isWork ? <Briefcase className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border font-display ${
                  isWork 
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {isWork ? 'Work / Study Video' : 'Entertainment / Rest Video'}
                </span>
                
                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  {formatSeconds(currentSeconds)} / {formatMinutes(video.durationMinutes)}
                </span>

                {startSeconds > 0 && (
                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-medium">
                    Resumed from {formatSeconds(startSeconds)}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold font-display text-white truncate max-w-md sm:max-w-2xl lg:max-w-4xl mt-0.5">
                {video.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Mark Done & Complete Button */}
            <button
              type="button"
              onClick={handleManualMarkDone}
              title="Mark as watched and count toward study/work time"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>

            {/* Restart From 0:00 Button */}
            {startSeconds > 0 && (
              <button
                type="button"
                onClick={handleResetPlayback}
                title="Restart from beginning (0:00)"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Theater Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheaterMode}
              title={isTheaterMode ? 'Switch to Standard Dialog Mode' : 'Switch to Full-Width Theater Mode'}
              className="flex items-center space-x-1 p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {isTheaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="hidden md:inline text-[11px]">Dialog</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="hidden md:inline text-[11px]">Theater</span>
                </>
              )}
            </button>

            {/* Open on YouTube */}
            <button
              type="button"
              onClick={handleOpenExternal}
              title="Open in external browser (YouTube.com)"
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded YouTube Player */}
        <div 
          className={`relative w-full bg-black flex items-center justify-center overflow-hidden shadow-inner ${
            isTheaterMode 
              ? 'h-[56vh] sm:h-[64vh] md:h-[68vh] lg:h-[72vh] max-h-[76vh] border-y border-zinc-900' 
              : 'aspect-video rounded-xl border border-zinc-800'
          }`}
        >
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={video.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Status / Notes Banner */}
        <div 
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 ${
            isTheaterMode 
              ? 'px-4 sm:px-8 py-2.5 bg-[#141416] border-t border-zinc-800' 
              : 'mt-3'
          }`}
        >
          <div>
            {video.notes ? (
              <p className="text-zinc-400 text-[11px]">
                <strong className="text-zinc-200">Notes:</strong> {video.notes}
              </p>
            ) : (
              <p className="text-zinc-500 text-[11px]">
                Distraction-free theater active. External recommendations and algorithmic feeds are blocked.
              </p>
            )}
          </div>

          <div className="text-[11px] font-medium shrink-0 flex items-center space-x-3">
            {isWork ? (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <span>⚡ Study mode: Rest pool is paused. Time counts as work.</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 mr-0.5" />
                <span>Rest Pool is actively burning while you watch.</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
