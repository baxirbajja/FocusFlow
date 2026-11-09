import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  Plus, 
  Trash2, 
  Play, 
  AlertCircle, 
  Briefcase, 
  Coffee, 
  Sparkles, 
  Loader2,
  UploadCloud,
  BookOpen,
  Folder,
  Check,
  Link2
} from 'lucide-react';
import { DayPlan, YouTubeVideo, StudySubject, SubjectVideo } from '../types';
import { formatMinutes, extractYouTubeId, loadStudySubjects } from '../utils/storage';
import { fetchYouTubeDetails } from '../utils/youtube';

interface ScheduleYouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  subjects?: StudySubject[];
}

export const ScheduleYouTubeModal: React.FC<ScheduleYouTubeModalProps> = ({
  isOpen,
  onClose,
  plan,
  onUpdatePlan,
  onPlayVideo,
  subjects,
}) => {
  const [activeTab, setActiveTab] = useState<'work' | 'rest'>('work');
  const [sourceMode, setSourceMode] = useState<'paste' | 'library'>('paste');
  
  // Library selection state
  const availableSubjects = (subjects && subjects.length > 0) ? subjects : loadStudySubjects();
  const [librarySubjectId, setLibrarySubjectId] = useState<string>('');
  const [libraryPlaylistId, setLibraryPlaylistId] = useState<string>('');

  const activeLibSubject = availableSubjects.find((s) => s.id === librarySubjectId) || availableSubjects[0];
  const activeLibPlaylist = activeLibSubject?.playlists.find(
    (p) => p.id === (libraryPlaylistId || activeLibSubject?.playlists[0]?.id)
  ) || activeLibSubject?.playlists[0];

  // Add Video Form State (Paste mode)
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(20);
  const [notes, setNotes] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [isDragOverModal, setIsDragOverModal] = useState(false);

  if (!isOpen) return null;

  const workVideos = plan.youtubeWorkVideos || [];
  const restVideos = plan.youtubeRestVideos || [];

  // Tasks planned duration
  const totalTaskMins = plan.tasks.reduce((sum, t) => sum + t.plannedDuration, 0);

  // Video playlist durations
  const totalWorkVideoMins = workVideos.reduce((sum, v) => sum + v.durationMinutes, 0);
  const totalRestVideoMins = restVideos.reduce((sum, v) => sum + v.durationMinutes, 0);

  // Both tasks AND study videos count as working time
  const totalCombinedWorkMins = totalTaskMins + totalWorkVideoMins;

  const workBudgetMins = plan.workHoursBudget;
  const restBudgetMins = plan.restHoursBudget;

  const remainingWorkAllowance = workBudgetMins - totalCombinedWorkMins;
  const remainingRestAllowance = restBudgetMins - totalRestVideoMins;

  const isWorkExceeded = remainingWorkAllowance < 0;
  const isRestExceeded = remainingRestAllowance < 0;

  // Current tab specifics
  const currentTotalMins = activeTab === 'work' ? totalCombinedWorkMins : totalRestVideoMins;
  const currentBudgetMins = activeTab === 'work' ? workBudgetMins : restBudgetMins;
  const currentRemaining = activeTab === 'work' ? remainingWorkAllowance : remainingRestAllowance;
  const isCurrentExceeded = activeTab === 'work' ? isWorkExceeded : isRestExceeded;
  const currentVideos = activeTab === 'work' ? workVideos : restVideos;

  // Dynamic preview of next video
  const afterAddingRemaining = currentRemaining - (duration || 0);
  const willExceed = afterAddingRemaining < 0;

  // Auto-fetch Title and Duration when URL is entered, pasted, or dropped
  const processUrlForMetadata = async (targetUrl: string) => {
    const videoId = extractYouTubeId(targetUrl);
    if (videoId) {
      setUrl(`https://www.youtube.com/watch?v=${videoId}`);
      setIsFetchingMeta(true);
      setAutoDetected(false);
      try {
        const details = await fetchYouTubeDetails(targetUrl);
        if (details) {
          if (details.title) {
            setTitle(details.title);
          }
          if (details.durationMinutes && details.durationMinutes > 0) {
            setDuration(details.durationMinutes);
          }
          setAutoDetected(true);
          setInputError(null);
        }
      } catch (err) {
        console.warn('Auto-fetch metadata failed:', err);
      } finally {
        setIsFetchingMeta(false);
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setInputError(null);
    setAutoDetected(false);
    processUrlForMetadata(val);
  };

  const handlePasteUrl = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      processUrlForMetadata(pasted);
    }
  };

  // Drag and Drop directly into the modal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverModal(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverModal(false);
  };

  const handleDropInModal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverModal(false);

    const droppedText = e.dataTransfer.getData('text/uri-list') || 
                        e.dataTransfer.getData('text/plain') || 
                        e.dataTransfer.getData('text/html');

    if (droppedText) {
      processUrlForMetadata(droppedText);
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setInputError('Please enter a title for this video.');
      return;
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setInputError('Please enter a valid YouTube link (e.g. https://youtu.be/... or youtube.com/watch?v=...)');
      return;
    }

    const newVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      url: url.trim(),
      videoId,
      durationMinutes: Number(duration),
      type: activeTab,
      notes: notes.trim(),
      isWatched: false,
    };

    if (activeTab === 'work') {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeWorkVideos: [...workVideos, newVideo],
      };
      onUpdatePlan(updatedPlan);
    } else {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeRestVideos: [...restVideos, newVideo],
      };
      onUpdatePlan(updatedPlan);
    }

    // Reset Form
    setUrl('');
    setTitle('');
    setNotes('');
    setDuration(20);
    setInputError(null);
    setAutoDetected(false);
  };

  const handleAddFromLibrary = (video: SubjectVideo) => {
    const newVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      durationMinutes: video.durationMinutes,
      type: activeTab,
      notes: video.notes || `${activeLibSubject?.name} • ${activeLibPlaylist?.name}`,
      isWatched: false,
    };

    if (activeTab === 'work') {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeWorkVideos: [...workVideos, newVideo],
      };
      onUpdatePlan(updatedPlan);
    } else {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeRestVideos: [...restVideos, newVideo],
      };
      onUpdatePlan(updatedPlan);
    }
  };

  const handleDeleteVideo = (videoId: string, type: 'work' | 'rest') => {
    if (type === 'work') {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeWorkVideos: workVideos.filter((v) => v.id !== videoId),
      };
      onUpdatePlan(updatedPlan);
    } else {
      const updatedPlan: DayPlan = {
        ...plan,
        youtubeRestVideos: restVideos.filter((v) => v.id !== videoId),
      };
      onUpdatePlan(updatedPlan);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInModal}
    >
      <div className={`bg-[#18181b] border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col p-5 shadow-2xl transition-all relative ${
        isDragOverModal ? 'border-zinc-300 ring-2 ring-zinc-400/30' : 'border-zinc-700'
      }`}>
        
        {/* Drag Drop Hint Overlay */}
        {isDragOverModal && (
          <div className="absolute inset-0 bg-black/80 rounded-2xl z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xs animate-fade-in pointer-events-none">
            <UploadCloud className="w-12 h-12 text-zinc-200 mb-2 animate-bounce" />
            <h4 className="text-base font-bold font-display text-white">Drop YouTube Video Here</h4>
            <p className="text-xs text-zinc-400">Title, duration, and thumbnail will be auto-loaded for this playlist.</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Tv className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  Schedule YouTube Playlists
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                  {plan.date}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Drag & drop videos from YouTube or paste links — thumbnails and durations are saved automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist Tabs (Work vs Entertainment) */}
        <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
          
          {/* Work Playlist Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              activeTab === 'work'
                ? 'bg-zinc-900 border-zinc-500 shadow-sm'
                : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 text-white">
                <Briefcase className="w-3.5 h-3.5 text-zinc-300" />
                <span>Work / Study Playlist</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-200">
                {formatMinutes(totalCombinedWorkMins)} / {formatMinutes(workBudgetMins)}
              </span>
            </div>

            <div className="text-[11px]">
              {isWorkExceeded ? (
                <span className="text-red-400 font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 mr-0.5 shrink-0" />
                  <span>Exceeds work target by +{formatMinutes(Math.abs(remainingWorkAllowance))}</span>
                </span>
              ) : (
                <div className="text-zinc-400 font-medium">
                  <div>
                    Remaining allowance: <strong className="text-emerald-400 font-bold font-mono">{formatMinutes(remainingWorkAllowance)}</strong> left
                  </div>
                  {totalTaskMins > 0 && (
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      ({formatMinutes(totalTaskMins)} tasks + {formatMinutes(totalWorkVideoMins)} videos)
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Entertainment Playlist Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('rest')}
            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              activeTab === 'rest'
                ? 'bg-zinc-900 border-zinc-500 shadow-sm'
                : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 text-white">
                <Coffee className="w-3.5 h-3.5 text-zinc-300" />
                <span>Entertainment (Rest)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-300">
                {formatMinutes(totalRestVideoMins)} / {formatMinutes(restBudgetMins)}
              </span>
            </div>

            <div className="text-[11px]">
              {isRestExceeded ? (
                <span className="text-red-400 font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 mr-0.5" />
                  <span>Exceeds rest budget by +{formatMinutes(Math.abs(remainingRestAllowance))}</span>
                </span>
              ) : (
                <span className="text-zinc-400 font-medium">
                  Remaining allowance: <strong className="text-zinc-100 font-bold font-mono">{formatMinutes(remainingRestAllowance)}</strong> left
                </span>
              )}
            </div>
          </button>

        </div>

        {/* Scrollable Body: Add Form + Thumbnail-Only Grid */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-1">
          
          {/* Source Mode Switcher: Link/Drop vs Choose from Study Library */}
          <div className="flex items-center space-x-2 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => setSourceMode('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                sourceMode === 'paste'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Paste Link / Drag & Drop</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                sourceMode === 'library'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Choose from Study Library</span>
            </button>
          </div>

          {/* Mode 1: Choose from Study Library (Subject & Playlist Dropdowns) */}
          {sourceMode === 'library' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-white flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-300 stroke-[2.5]" />
                    <span>Pick Video from Subject Playlists</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Select a subject and playlist to schedule directly into today's {activeTab === 'work' ? 'Study' : 'Entertainment'} playlist.
                  </p>
                </div>

                {/* Subject & Playlist Dropdowns */}
                <div className="flex items-center space-x-2">
                  <select
                    value={activeLibSubject?.id || ''}
                    onChange={(e) => {
                      setLibrarySubjectId(e.target.value);
                      const sub = availableSubjects.find((s) => s.id === e.target.value);
                      setLibraryPlaylistId(sub?.playlists[0]?.id || '');
                    }}
                    className="bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        📚 {sub.name}
                      </option>
                    ))}
                  </select>

                  {activeLibSubject && (
                    <select
                      value={activeLibPlaylist?.id || ''}
                      onChange={(e) => setLibraryPlaylistId(e.target.value)}
                      className="bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      {activeLibSubject.playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          📁 {pl.name} ({pl.videos.length})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Videos in selected Library Playlist */}
              {(!activeLibPlaylist || activeLibPlaylist.videos.length === 0) ? (
                <div className="bg-[#18181b] border border-dashed border-zinc-800 rounded-lg p-6 text-center text-xs text-zinc-500">
                  No videos saved in this playlist yet. You can add videos in the Study Library view!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeLibPlaylist.videos.map((vid) => {
                    const isAlreadyAdded = (activeTab === 'work' ? workVideos : restVideos).some(
                      (v) => v.videoId === vid.videoId
                    );
                    const remainingAfter = currentRemaining - vid.durationMinutes;

                    return (
                      <div
                        key={vid.id}
                        className="bg-[#18181b] border border-zinc-800 rounded-lg p-2.5 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex space-x-2">
                          <div className="relative w-20 aspect-video rounded overflow-hidden shrink-0 bg-black">
                            <img
                              src={`https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[9px] font-mono font-bold text-white px-1 rounded">
                              {formatMinutes(vid.durationMinutes)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-[11px] font-bold text-white line-clamp-2 leading-snug" title={vid.title}>
                              {vid.title}
                            </h5>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                              ⏱ {formatMinutes(vid.durationMinutes)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {remainingAfter < 0 ? (
                              <span className="text-red-400 font-semibold">Exceeds target</span>
                            ) : (
                              <span>{formatMinutes(remainingAfter)} left</span>
                            )}
                          </span>

                          {isAlreadyAdded ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Scheduled</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddFromLibrary(vid)}
                              className="px-2 py-1 rounded bg-zinc-200 hover:bg-white text-zinc-950 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>Add Video</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Paste Link / Drag & Drop Form */}
          {sourceMode === 'paste' && (
            <form onSubmit={handleAddVideo} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
                  <span>Add Video to {activeTab === 'work' ? 'Study' : 'Entertainment'} Playlist</span>
                </h4>

                {/* Dynamic Remaining Allowance Indicator */}
                <div className="text-[11px]">
                  {willExceed ? (
                    <span className="text-red-400 font-bold flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 mr-0.5" />
                      <span>This video will exceed limit by +{formatMinutes(Math.abs(afterAddingRemaining))}!</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 font-medium">
                      Adding this leaves <strong className="text-zinc-100 font-bold font-mono">{formatMinutes(afterAddingRemaining)}</strong> allowance
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* URL with automatic fetch trigger */}
                <div className="md:col-span-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-zinc-300">
                      YouTube Link (or Drag & Drop here) *
                    </label>
                    {isFetchingMeta && (
                      <span className="text-[10px] text-zinc-400 flex items-center space-x-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
                        <span>Fetching details...</span>
                      </span>
                    )}
                    {autoDetected && !isFetchingMeta && (
                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-bold">
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-filled!</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Paste or drag YouTube link here..."
                    value={url}
                    onChange={handleUrlChange}
                    onPaste={handlePasteUrl}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-medium focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Title (Auto-filled) */}
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isFetchingMeta ? "Fetching title..." : "Title auto-detected on paste/drop"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-medium focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Duration (Auto-filled) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-zinc-300">
                      Duration (mins)
                    </label>
                    {autoDetected && (
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800/60">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={isFetchingMeta ? '' : duration}
                      placeholder={isFetchingMeta ? '...' : '15'}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                    />
                    {isFetchingMeta && (
                      <div className="absolute right-2 top-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick duration buttons */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-semibold text-zinc-500 mr-1">Override duration:</span>
                {[5, 10, 15, 20, 30, 45, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                      duration === d
                        ? 'bg-zinc-700 border-zinc-500 text-white'
                        : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>

              {inputError && (
                <p className="text-[11px] text-red-400 font-semibold">{inputError}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add to {activeTab === 'work' ? 'Work' : 'Rest'} Playlist</span>
                </button>
              </div>
            </form>
          )}

          {/* Thumbnail-Only Gallery of Videos */}
          <div>
            <h4 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 mb-2.5 flex items-center justify-between">
              <span>{activeTab === 'work' ? 'Study' : 'Entertainment'} Playlist ({currentVideos.length} Videos)</span>
              <span className="text-[11px] font-normal text-zinc-500 font-sans">
                {activeTab === 'work' ? (
                  <span>
                    Videos: <strong className="font-mono text-zinc-200">{formatMinutes(totalWorkVideoMins)}</strong>
                    {totalTaskMins > 0 && (
                      <span> (Total work with tasks: <strong className="font-mono text-zinc-100">{formatMinutes(totalCombinedWorkMins)}</strong>)</span>
                    )}
                  </span>
                ) : (
                  <span>Total time: <strong className="font-mono text-zinc-200">{formatMinutes(totalRestVideoMins)}</strong></span>
                )}
              </span>
            </h4>

            {currentVideos.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 text-xs text-zinc-500">
                No videos in this playlist yet. Drag and drop any YouTube video here, or paste a link above.
              </div>
            ) : (
              /* Thumbnail Card Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {currentVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative bg-[#18181b] border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-all flex flex-col shadow-sm"
                  >
                    {/* Thumbnail View */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* YouTube Time Badge on bottom-right corner */}
                      <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/10">
                        ⏱ {formatMinutes(video.durationMinutes)}
                      </div>

                      {/* Center Play Button Overlay on Hover */}
                      <button
                        type="button"
                        onClick={() => onPlayVideo(video)}
                        className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Watch video"
                      >
                        <div className="w-9 h-9 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </button>

                      {/* Top-Right Delete Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVideo(video.id, video.type);
                        }}
                        title="Remove from playlist"
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/75 hover:bg-red-950 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Single-line Minimal Title */}
                    <div className="p-2">
                      <h5 
                        className="text-[11px] font-bold text-zinc-200 truncate group-hover:text-white transition-colors"
                        title={video.title}
                      >
                        {video.title}
                      </h5>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-zinc-500 font-mono">
            {workVideos.length} study videos • {restVideos.length} entertainment videos
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done Scheduling
          </button>
        </div>

      </div>
    </div>
  );
};
