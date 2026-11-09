import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  Calendar, 
  CalendarPlus, 
  Check, 
  CheckCircle2,
  Tv, 
  Layers, 
  Clock, 
  Sparkles, 
  FolderPlus, 
  Folder, 
  ExternalLink, 
  AlertCircle,
  Loader2,
  X,
  Edit2
} from 'lucide-react';
import { StudySubject, SubjectPlaylist, SubjectVideo, DayPlan, YouTubeVideo } from '../types';
import { 
  formatMinutes, 
  formatSeconds,
  extractYouTubeId, 
  getFormattedDate, 
  getTomorrowDate,
  loadDayPlan,
  saveDayPlan
} from '../utils/storage';
import { fetchYouTubeDetails } from '../utils/youtube';

interface StudyLibraryProps {
  subjects: StudySubject[];
  currentPlan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onUpdateSubjects: (updatedSubjects: StudySubject[]) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  onOpenImportPlaylist?: () => void;
}

const SUBJECT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Zinc', value: '#71717a' },
];

export const StudyLibrary: React.FC<StudyLibraryProps> = ({
  subjects,
  currentPlan,
  onUpdatePlan,
  onUpdateSubjects,
  onPlayVideo,
  onOpenImportPlaylist,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');

  // Modals & form state
  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);

  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Add video state
  const [addVideoUrl, setAddVideoUrl] = useState('');
  const [addVideoTitle, setAddVideoTitle] = useState('');
  const [addVideoDuration, setAddVideoDuration] = useState<number>(20);
  const [addVideoNotes, setAddVideoNotes] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [videoFormError, setVideoFormError] = useState<string | null>(null);

  // Notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activePlaylist = activeSubject?.playlists.find(
    (p) => p.id === (selectedPlaylistId || activeSubject?.playlists[0]?.id)
  ) || activeSubject?.playlists[0];

  const todayStr = getFormattedDate();
  const tomorrowStr = getTomorrowDate();

  // Helper to trigger notification toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Video metadata auto-fetch
  const handleUrlChange = async (urlVal: string) => {
    setAddVideoUrl(urlVal);
    setVideoFormError(null);
    const videoId = extractYouTubeId(urlVal);
    if (videoId) {
      setIsFetchingMeta(true);
      try {
        const details = await fetchYouTubeDetails(urlVal);
        if (details) {
          if (details.title) setAddVideoTitle(details.title);
          if (details.durationMinutes && details.durationMinutes > 0) {
            setAddVideoDuration(details.durationMinutes);
          }
        }
      } catch (err) {
        console.warn('Auto metadata fetch error:', err);
      } finally {
        setIsFetchingMeta(false);
      }
    }
  };

  // Create Subject
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSubject: StudySubject = {
      id: 'subject_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newSubjectName.trim(),
      description: newSubjectDesc.trim(),
      color: newSubjectColor,
      createdAt: new Date().toISOString(),
      playlists: [
        {
          id: 'pl_' + Date.now() + '_main',
          name: 'Watch Later & Queue',
          description: 'Default watch queue for ' + newSubjectName.trim(),
          createdAt: new Date().toISOString(),
          videos: [],
        },
      ],
    };

    const updated = [...subjects, newSubject];
    onUpdateSubjects(updated);
    setSelectedSubjectId(newSubject.id);
    setSelectedPlaylistId(newSubject.playlists[0].id);

    setNewSubjectName('');
    setNewSubjectDesc('');
    setIsNewSubjectModalOpen(false);
    showToast(`Created subject "${newSubject.name}"`);
  };

  // Delete Subject
  const handleDeleteSubject = (subjectId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and all its playlists?`)) return;
    const updated = subjects.filter((s) => s.id !== subjectId);
    onUpdateSubjects(updated);
    if (selectedSubjectId === subjectId) {
      setSelectedSubjectId(updated[0]?.id || '');
    }
    showToast(`Deleted subject "${name}"`);
  };

  // Create Playlist
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newPlaylistName.trim()) return;

    const newPlaylist: SubjectPlaylist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newPlaylistName.trim(),
      description: newPlaylistDesc.trim(),
      createdAt: new Date().toISOString(),
      videos: [],
    };

    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return {
          ...s,
          playlists: [...s.playlists, newPlaylist],
        };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setSelectedPlaylistId(newPlaylist.id);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsNewPlaylistModalOpen(false);
    showToast(`Created playlist "${newPlaylist.name}"`);
  };

  // Delete Playlist
  const handleDeletePlaylist = (playlistId: string, name: string) => {
    if (!activeSubject) return;
    if (activeSubject.playlists.length <= 1) {
      alert('A subject must have at least one playlist.');
      return;
    }
    if (!confirm(`Delete playlist "${name}" and its saved videos?`)) return;

    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return {
          ...s,
          playlists: s.playlists.filter((p) => p.id !== playlistId),
        };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setSelectedPlaylistId('');
    showToast(`Deleted playlist "${name}"`);
  };

  // Add Video to Active Playlist
  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !activePlaylist) return;

    const videoId = extractYouTubeId(addVideoUrl);
    if (!videoId) {
      setVideoFormError('Please enter a valid YouTube link.');
      return;
    }
    if (!addVideoTitle.trim()) {
      setVideoFormError('Please enter a video title.');
      return;
    }

    const newVid: SubjectVideo = {
      id: 'sv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: addVideoTitle.trim(),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      durationMinutes: Math.max(1, Number(addVideoDuration)),
      notes: addVideoNotes.trim(),
      addedAt: new Date().toISOString(),
    };

    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return {
          ...s,
          playlists: s.playlists.map((p) => {
            if (p.id === activePlaylist.id) {
              const filtered = p.videos.filter((v) => v.videoId !== videoId);
              return {
                ...p,
                videos: [newVid, ...filtered],
              };
            }
            return p;
          }),
        };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setAddVideoUrl('');
    setAddVideoTitle('');
    setAddVideoNotes('');
    setAddVideoDuration(20);
    setVideoFormError(null);
    showToast(`Added "${newVid.title}" to ${activePlaylist.name}`);
  };

  // Delete Video from Playlist
  const handleDeleteVideo = (videoId: string) => {
    if (!activeSubject || !activePlaylist) return;

    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return {
          ...s,
          playlists: s.playlists.map((p) => {
            if (p.id === activePlaylist.id) {
              return {
                ...p,
                videos: p.videos.filter((v) => v.id !== videoId),
              };
            }
            return p;
          }),
        };
      }
      return s;
    });

    onUpdateSubjects(updated);
  };

  // Schedule Video directly into Today's Study Schedule
  const handleScheduleForToday = (video: SubjectVideo) => {
    const todayPlan = currentPlan.date === todayStr ? currentPlan : loadDayPlan(todayStr);
    const existingWorkVideos = todayPlan.youtubeWorkVideos || [];

    // Check if already in today's plan
    if (existingWorkVideos.some((v) => v.videoId === video.videoId)) {
      showToast(`"${video.title}" is already in today's study schedule!`);
      return;
    }

    const scheduledVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      durationMinutes: video.durationMinutes,
      type: 'work',
      notes: video.notes || `${activeSubject?.name} • ${activePlaylist?.name}`,
      isWatched: false,
    };

    const updatedDayPlan: DayPlan = {
      ...todayPlan,
      youtubeWorkVideos: [...existingWorkVideos, scheduledVideo],
    };

    if (currentPlan.date === todayStr) {
      onUpdatePlan(updatedDayPlan);
    } else {
      saveDayPlan(updatedDayPlan);
    }

    showToast(`✓ Added "${video.title}" (${video.durationMinutes}m) to Today's Study Schedule!`);
  };

  // Schedule Video for Tomorrow
  const handleScheduleForTomorrow = (video: SubjectVideo) => {
    const tomorrowPlan = currentPlan.date === tomorrowStr ? currentPlan : loadDayPlan(tomorrowStr);
    const existingWorkVideos = tomorrowPlan.youtubeWorkVideos || [];

    if (existingWorkVideos.some((v) => v.videoId === video.videoId)) {
      showToast(`"${video.title}" is already in tomorrow's schedule!`);
      return;
    }

    const scheduledVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      durationMinutes: video.durationMinutes,
      type: 'work',
      notes: video.notes || `${activeSubject?.name} • ${activePlaylist?.name}`,
      isWatched: false,
    };

    const updatedTomorrow: DayPlan = {
      ...tomorrowPlan,
      youtubeWorkVideos: [...existingWorkVideos, scheduledVideo],
    };

    if (currentPlan.date === tomorrowStr) {
      onUpdatePlan(updatedTomorrow);
    } else {
      saveDayPlan(updatedTomorrow);
    }

    showToast(`✓ Added "${video.title}" (${video.durationMinutes}m) to Tomorrow's Schedule!`);
  };

  // Stats
  const totalSubjectVideos = activeSubject?.playlists.reduce((sum, p) => sum + p.videos.length, 0) || 0;
  const totalSubjectMinutes = activeSubject?.playlists.reduce(
    (sum, p) => sum + p.videos.reduce((vSum, v) => vSum + v.durationMinutes, 0),
    0
  ) || 0;

  const activePlaylistVideos = activePlaylist?.videos || [];
  const activePlaylistMinutes = activePlaylistVideos.reduce((sum, v) => sum + v.durationMinutes, 0);

  // Check which videos are in current active day plan
  const scheduledVideoIds = new Set(
    (currentPlan.youtubeWorkVideos || []).map((v) => v.videoId)
  );

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-emerald-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold font-display text-white tracking-tight">
                Study Library & Subject Playlists
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                {subjects.length} Subjects
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Organize study subjects and watch-later YouTube playlists. Pick any video to schedule it directly into your day.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenImportPlaylist && (
            <button
              onClick={onOpenImportPlaylist}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all border border-zinc-700 cursor-pointer shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-zinc-300 stroke-[2.2]" />
              <span>Import YouTube Playlist</span>
            </button>
          )}

          <button
            onClick={() => setIsNewSubjectModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Subjects Sidebar + Active Subject Playlists */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Column: Subjects List (3 cols) */}
        <div className="md:col-span-4 lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400">
              Your Subjects
            </span>
            <span className="text-[11px] font-mono text-zinc-500 font-medium">
              {subjects.length} Total
            </span>
          </div>

          <div className="space-y-1.5">
            {subjects.map((sub) => {
              const isSelected = sub.id === activeSubject?.id;
              const subVideoCount = sub.playlists.reduce((sum, p) => sum + p.videos.length, 0);

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setSelectedPlaylistId(sub.playlists[0]?.id || '');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex items-start justify-between ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-600 shadow-sm'
                      : 'bg-[#18181b] border-zinc-800/80 hover:border-zinc-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                    <div 
                      className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2 ring-black"
                      style={{ backgroundColor: sub.color || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold font-display text-white truncate">
                        {sub.name}
                      </h4>
                      {sub.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {sub.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{sub.playlists.length} playlists</span>
                        <span>•</span>
                        <span>{subVideoCount} videos</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject Delete Button (Visible on hover or selected) */}
                  {subjects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(sub.id, sub.name);
                      }}
                      title="Delete Subject"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setIsNewSubjectModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Another Subject</span>
          </button>
        </div>

        {/* Right Column: Active Subject, Unlimited Playlists & Videos (9 cols) */}
        <div className="md:col-span-8 lg:col-span-9 space-y-5">
          {activeSubject ? (
            <>
              {/* Subject Detail Header Card */}
              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3.5 h-3.5 rounded-full ring-4 ring-zinc-800"
                      style={{ backgroundColor: activeSubject.color }}
                    />
                    <div>
                      <h3 className="text-base font-extrabold font-display text-white">
                        {activeSubject.name}
                      </h3>
                      {activeSubject.description && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {activeSubject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right text-[11px] font-mono text-zinc-400">
                      <div><strong className="text-zinc-200">{totalSubjectVideos}</strong> saved videos</div>
                      <div className="text-zinc-500">{formatMinutes(totalSubjectMinutes)} total duration</div>
                    </div>

                    <button
                      onClick={() => setIsNewPlaylistModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 border border-zinc-700 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Playlist</span>
                    </button>
                  </div>
                </div>

                {/* Playlist Tabs Bar */}
                <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-zinc-800/80 overflow-x-auto pb-1">
                  {activeSubject.playlists.map((pl) => {
                    const isPlSelected = pl.id === activePlaylist?.id;
                    const plMins = pl.videos.reduce((s, v) => s + v.durationMinutes, 0);

                    return (
                      <button
                        key={pl.id}
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer ${
                          isPlSelected
                            ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>{pl.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isPlSelected ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {pl.videos.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Playlist Content Area */}
              {activePlaylist && (
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-5">
                  
                  {/* Playlist Header & Delete Action */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                          {activePlaylist.name}
                        </h4>
                        <span className="text-[11px] font-mono font-bold text-zinc-400">
                          ({activePlaylistVideos.length} videos • {formatMinutes(activePlaylistMinutes)})
                        </span>
                      </div>
                      {activePlaylist.description && (
                        <p className="text-xs text-zinc-400 mt-0.5">{activePlaylist.description}</p>
                      )}
                    </div>

                    {activeSubject.playlists.length > 1 && (
                      <button
                        onClick={() => handleDeletePlaylist(activePlaylist.id, activePlaylist.name)}
                        className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center space-x-1 px-2 py-1 rounded hover:bg-zinc-800/80 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Playlist</span>
                      </button>
                    )}
                  </div>

                  {/* Add Video to Playlist Form */}
                  <form onSubmit={handleAddVideo} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add Video to "{activePlaylist.name}"</span>
                      </span>
                      {isFetchingMeta && (
                        <span className="text-[11px] text-zinc-400 flex items-center space-x-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Fetching YouTube title & duration...</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* URL input */}
                      <div className="md:col-span-8">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          YouTube Link *
                        </label>
                        <input
                          type="text"
                          value={addVideoUrl}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                        />
                      </div>

                      {/* Duration */}
                      <div className="md:col-span-4">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Duration (min) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="600"
                          value={addVideoDuration}
                          onChange={(e) => setAddVideoDuration(Number(e.target.value))}
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Title & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-7">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Video Title *
                        </label>
                        <input
                          type="text"
                          value={addVideoTitle}
                          onChange={(e) => setAddVideoTitle(e.target.value)}
                          placeholder="Video title (auto-detected)"
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Optional Study Notes
                        </label>
                        <input
                          type="text"
                          value={addVideoNotes}
                          onChange={(e) => setAddVideoNotes(e.target.value)}
                          placeholder="Concepts covered, exercise #, etc."
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    {videoFormError && (
                      <p className="text-xs text-red-400 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{videoFormError}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Video to Playlist</span>
                      </button>
                    </div>
                  </form>

                  {/* Saved Videos Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300">
                        Saved Playlist Videos ({activePlaylistVideos.length})
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Click "Schedule" to add any video directly to your day plan
                      </span>
                    </div>

                    {activePlaylistVideos.length === 0 ? (
                      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                        <Tv className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <h5 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300">
                          Playlist is empty
                        </h5>
                        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-1">
                          Paste a YouTube link above to add study videos, tutorials, or lectures you want to watch later for {activeSubject.name}.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {activePlaylistVideos.map((video) => {
                          const isScheduledToday = scheduledVideoIds.has(video.videoId);

                          const hasResume = video.lastPlayedSeconds && video.lastPlayedSeconds > 0 && !video.isWatched;
                          const progressPercent = hasResume && video.durationMinutes
                            ? Math.min(100, Math.round((video.lastPlayedSeconds! / (video.durationMinutes * 60)) * 100))
                            : 0;

                          return (
                            <div
                              key={video.id}
                              className={`bg-zinc-900 border rounded-xl overflow-hidden flex flex-col group transition-all shadow-sm ${video.isWatched ? "border-emerald-700/60 opacity-85 hover:opacity-100" : "border-zinc-800 hover:border-zinc-700"}`}
                            >
                              {/* Thumbnail with overlay duration & play */}
                              <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                                <img
                                  src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
                                  }}
                                />
                                
                                {/* Watched or Resume badge */}
                                {video.isWatched ? (
                                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold border border-emerald-400/40 flex items-center space-x-1 shadow">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Watched</span>
                                  </div>
                                ) : hasResume ? (
                                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-zinc-950 text-[10px] font-mono font-bold border border-amber-300/60 flex items-center space-x-1 shadow">
                                    <span>▶ Resume {formatSeconds(video.lastPlayedSeconds!)}</span>
                                  </div>
                                ) : null}

                                {/* Duration pill */}
                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-zinc-100 text-[10px] font-mono font-bold border border-zinc-700/60 flex items-center space-x-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{formatMinutes(video.durationMinutes)}</span>
                                </div>

                                {/* Resume Progress Bar */}
                                {hasResume && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                                    <div 
                                      className="h-full bg-emerald-500" 
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                )}

                                {/* Play button hover overlay */}
                                <div 
                                  onClick={() => onPlayVideo({
                                    id: video.id,
                                    title: video.title,
                                    url: video.url,
                                    videoId: video.videoId,
                                    durationMinutes: video.durationMinutes,
                                    type: 'work',
                                    lastPlayedSeconds: video.lastPlayedSeconds,
                                    isWatched: video.isWatched,
                                  })}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                  title="Play Video"
                                >
                                  <div className="w-10 h-10 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                  </div>
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                <div>
                                  <h5 
                                    className="text-xs font-bold text-white line-clamp-2 leading-snug"
                                    title={video.title}
                                  >
                                    {video.title}
                                  </h5>
                                  {video.notes && (
                                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1 font-medium">
                                      {video.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Scheduling Actions */}
                                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                                  {isScheduledToday ? (
                                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Scheduled Today</span>
                                    </span>
                                  ) : (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleScheduleForToday(video)}
                                        title="Add to Today's Study Schedule"
                                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center space-x-1 transition-colors border border-zinc-700/80 cursor-pointer"
                                      >
                                        <Calendar className="w-3 h-3 text-emerald-400" />
                                        <span>+ Today</span>
                                      </button>

                                      <button
                                        onClick={() => handleScheduleForTomorrow(video)}
                                        title="Add to Tomorrow's Schedule"
                                        className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium flex items-center space-x-1 transition-colors border border-zinc-800 cursor-pointer"
                                      >
                                        <CalendarPlus className="w-3 h-3" />
                                        <span>+ Tomorrow</span>
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => handleDeleteVideo(video.id)}
                                    title="Delete from Playlist"
                                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          ) : (
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold font-display text-white">No Subjects Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Create subjects to organize your study playlists, homework references, and watch later queues.
              </p>
              <button
                onClick={() => setIsNewSubjectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider inline-flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Your First Subject</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal 1: Create New Subject */}
      {isNewSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  Create Study Subject
                </h3>
              </div>
              <button
                onClick={() => setIsNewSubjectModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. French Language, Linux Administration, Calculus"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Description / Focus (Optional)
                </label>
                <input
                  type="text"
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  placeholder="e.g. B1 to C1 immersion, homework TP, exam prep"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center space-x-2">
                  {SUBJECT_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setNewSubjectColor(col.value)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newSubjectColor === col.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewSubjectModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Playlist */}
      {isNewPlaylistModalOpen && activeSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                    New Playlist for {activeSubject.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsNewPlaylistModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Grammar Drills, Podcast Listening, Exam Review"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Brief description of what to watch in this playlist"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewPlaylistModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
