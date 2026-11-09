import React from 'react';
import { X, Play, Briefcase, Coffee, AlertCircle, ExternalLink } from 'lucide-react';
import { YouTubeVideo } from '../types';
import { formatMinutes } from '../utils/storage';

interface YouTubePlayerModalProps {
  video: YouTubeVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  video,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !video) return null;

  const isWork = video.type === 'work';

  const handleOpenExternal = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const url = `https://www.youtube.com/watch?v=${video.videoId}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-4xl flex flex-col p-5 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isWork ? 'bg-zinc-800 text-zinc-200' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
            }`}>
              {isWork ? <Briefcase className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border font-display ${
                  isWork 
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {isWork ? 'Work / Study Video' : 'Entertainment / Rest Video'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">
                  {formatMinutes(video.durationMinutes)}
                </span>
              </div>
              <h3 className="text-sm font-bold font-display text-white truncate max-w-md sm:max-w-xl">
                {video.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenExternal}
              title="Open in external browser (YouTube.com)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open on YouTube</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Distraction-Free Embedded Player */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&enablejsapi=1`}
            title={video.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Status / Notes Banner */}
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div>
            {video.notes ? (
              <p className="text-zinc-400 text-[11px]">
                <strong className="text-zinc-200">Notes:</strong> {video.notes}
              </p>
            ) : (
              <p className="text-zinc-500 text-[11px]">
                Distraction-free mode active. External recommendations and algorithmic feeds are blocked.
              </p>
            )}
          </div>

          <div className="text-[11px] font-medium shrink-0 flex items-center space-x-3">
            {isWork ? (
              <span className="text-zinc-300">
                Watching educational content (counts as Study/Work).
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
