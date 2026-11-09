import React, { useState, useEffect } from 'react';
import { X, Briefcase, Coffee, Check, Clock, Plus, AlertCircle, Loader2, BookOpen, Folder } from 'lucide-react';
import { DayPlan, YouTubeVideo, StudySubject } from '../types';
import { formatMinutes } from '../utils/storage';
import { fetchYouTubeDetails } from '../utils/youtube';

interface DropVideoModalProps {
  videoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  plan: DayPlan;
  onAddVideoToPlaylist: (video: YouTubeVideo) => void;
  subjects?: StudySubject[];
  onSaveToSubjectPlaylist?: (subjectId: string, playlistId: string, video: { title: string; url: string; videoId: string; durationMinutes: number; notes?: string }) => void;
}

export const DropVideoModal: React.FC<DropVideoModalProps> = ({
  videoId,
  isOpen,
  onClose,
  plan,
  onAddVideoToPlaylist,
  subjects,
  onSaveToSubjectPlaylist,
}) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(20);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Library destination
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects?.[0]?.id || '');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');

  const activeSubject = subjects?.find((s) => s.id === selectedSubjectId) || subjects?.[0];
  const activePlaylist = activeSubject?.playlists.find(
    (p) => p.id === (selectedPlaylistId || activeSubject?.playlists[0]?.id)
  ) || activeSubject?.playlists[0];

  useEffect(() => {
    if (videoId) {
      setIsLoading(true);
      fetchYouTubeDetails(`https://www.youtube.com/watch?v=${videoId}`)
        .then((res) => {
          if (res) {
            if (res.title) setTitle(res.title);
            if (res.durationMinutes && res.durationMinutes > 0) {
              setDuration(res.durationMinutes);
            }
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setTitle('');
      setDuration(20);
      setNotes('');
    }
  }, [videoId]);

  if (!isOpen || !videoId) return null;

  const workVideos = plan.youtubeWorkVideos || [];
  const restVideos = plan.youtubeRestVideos || [];

  const totalTaskMins = plan.tasks.reduce((sum, t) => sum + t.plannedDuration, 0);
  const totalWorkVideoMins = workVideos.reduce((sum, v) => sum + v.durationMinutes, 0);
  const totalCombinedWorkMins = totalTaskMins + totalWorkVideoMins;

  const totalRestMins = restVideos.reduce((sum, v) => sum + v.durationMinutes, 0);

  const remainingWork = plan.workHoursBudget - totalCombinedWorkMins;
  const remainingRest = plan.restHoursBudget - totalRestMins;

  const handleSelectPlaylist = (type: 'work' | 'rest') => {
    const newVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title.trim() || 'YouTube Video',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      durationMinutes: Number(duration),
      type,
      notes: notes.trim(),
      isWatched: false,
    };

    onAddVideoToPlaylist(newVideo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-display">
              YouTube Video Dropped
            </span>
            <h3 className="text-base font-bold font-display text-white mt-1">
              Choose Destination Playlist
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Preview Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
          <div className="relative aspect-video w-full bg-black">
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="Video Thumbnail"
              className="w-full h-full object-cover"
            />
            {/* Duration Chip on Thumbnail corner */}
            <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/10">
              ⏱ {formatMinutes(duration)}
            </div>
          </div>

          <div className="p-3">
            {isLoading ? (
              <div className="flex items-center space-x-2 text-zinc-400 text-xs py-1">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                <span>Fetching title and duration from YouTube...</span>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Video Title"
                  className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold mb-2 focus:outline-none focus:border-zinc-500"
                />

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-zinc-400">Duration:</span>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-20 bg-[#18181b] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="text-xs text-zinc-500">minutes</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Playlist Destination Buttons */}
        <p className="text-xs font-semibold text-zinc-300 mb-2">
          Which playlist does this belong to for {plan.date}?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Work Button */}
          <button
            type="button"
            onClick={() => handleSelectPlaylist('work')}
            className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-left border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold font-display uppercase tracking-wider text-white">
              <Briefcase className="w-3.5 h-3.5 text-zinc-300" />
              <span>Work / Study</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Remaining: <strong className="text-zinc-200 font-mono">{formatMinutes(remainingWork)}</strong>
              {totalTaskMins > 0 && (
                <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">
                  ({formatMinutes(totalTaskMins)} tasks + {formatMinutes(totalWorkVideoMins)} videos)
                </span>
              )}
            </div>
            {remainingWork - duration < 0 && (
              <span className="text-[10px] text-red-400 font-bold block mt-1">
                ⚠️ Exceeds by +{formatMinutes(Math.abs(remainingWork - duration))}
              </span>
            )}
          </button>

          {/* Entertainment Button */}
          <button
            type="button"
            onClick={() => handleSelectPlaylist('rest')}
            className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-left border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold font-display uppercase tracking-wider text-white">
              <Coffee className="w-3.5 h-3.5 text-zinc-300" />
              <span>Entertainment</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Remaining: <strong className="text-zinc-200 font-mono">{formatMinutes(remainingRest)}</strong>
            </div>
            {remainingRest - duration < 0 && (
              <span className="text-[10px] text-red-400 font-bold block mt-1">
                ⚠️ Exceeds by +{formatMinutes(Math.abs(remainingRest - duration))}
              </span>
            )}
          </button>
        </div>

        {/* Option 3: Save to Study Subject Library */}
        {subjects && subjects.length > 0 && onSaveToSubjectPlaylist && activeSubject && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 flex items-center space-x-1">
              <BookOpen className="w-3 h-3 text-zinc-300" />
              <span>Or Save to Study Library (Watch Later)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <select
                  value={activeSubject.id}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const sub = subjects.find((s) => s.id === e.target.value);
                    setSelectedPlaylistId(sub?.playlists[0]?.id || '');
                  }}
                  className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      📚 {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <select
                  value={activePlaylist?.id || ''}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                >
                  {activeSubject.playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSubject && activePlaylist) {
                      onSaveToSubjectPlaylist(activeSubject.id, activePlaylist.id, {
                        title: title.trim() || 'YouTube Video',
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        videoId,
                        durationMinutes: Number(duration),
                        notes: notes.trim(),
                      });
                      onClose();
                    }
                  }}
                  className="w-full h-full py-1 px-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
