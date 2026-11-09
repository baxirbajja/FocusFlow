import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderPlus, 
  Tv, 
  Check, 
  Clock, 
  Plus, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  Layers, 
  Sparkles,
  Link2
} from 'lucide-react';
import { StudySubject, SubjectVideo } from '../types';
import { formatMinutes, extractYouTubePlaylistId } from '../utils/storage';

interface DropPlaylistModalProps {
  playlistId: string | null;
  isOpen: boolean;
  onClose: () => void;
  subjects: StudySubject[];
  onImportPlaylist: (
    subjectId: string,
    playlistTitle: string,
    description: string,
    videos: Array<{ title: string; url: string; videoId: string; durationMinutes: number; notes?: string }>
  ) => void;
  onCreateSubjectAndImport: (
    subjectName: string,
    playlistTitle: string,
    description: string,
    videos: Array<{ title: string; url: string; videoId: string; durationMinutes: number; notes?: string }>
  ) => void;
}

interface FetchedVideo {
  videoId: string;
  title: string;
  url: string;
  durationMinutes: number;
  durationText: string;
  thumbnail: string;
}

export const DropPlaylistModal: React.FC<DropPlaylistModalProps> = ({
  playlistId,
  isOpen,
  onClose,
  subjects,
  onImportPlaylist,
  onCreateSubjectAndImport,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [videos, setVideos] = useState<FetchedVideo[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Subject selection state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const loadPlaylistById = (targetId: string) => {
    setIsLoading(true);
    setFetchError(null);
    setVideos([]);

    if (window.electronAPI?.fetchYouTubePlaylist) {
      window.electronAPI.fetchYouTubePlaylist(targetId)
        .then((res) => {
          if (res.success && res.videos) {
            setPlaylistTitle(res.title || 'YouTube Playlist');
            setVideos(res.videos);
            if (res.videos.length === 0) {
              setFetchError('No videos found in this playlist. Please check if the playlist is public.');
            }
          } else {
            setFetchError(res.error || 'Failed to fetch playlist.');
          }
        })
        .catch((err) => {
          setFetchError(err.message || 'Error fetching playlist.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
      setFetchError('Playlist fetching is supported in desktop mode.');
    }
  };

  useEffect(() => {
    if (playlistId && isOpen) {
      loadPlaylistById(playlistId);
    } else {
      setVideos([]);
      setPlaylistTitle('');
      setFetchError(null);
      setInputUrl('');
    }
  }, [playlistId, isOpen]);

  if (!isOpen) return null;

  const totalDurationMins = videos.reduce((sum, v) => sum + v.durationMinutes, 0);

  const handleConfirmImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistTitle.trim()) return;

    const videoPayload = videos.map((v) => ({
      title: v.title,
      url: v.url,
      videoId: v.videoId,
      durationMinutes: v.durationMinutes,
      notes: `Imported from YouTube Playlist: ${playlistTitle.trim()}`,
    }));

    if (isCreatingNewSubject) {
      if (!newSubjectName.trim()) return;
      onCreateSubjectAndImport(
        newSubjectName.trim(),
        playlistTitle.trim(),
        playlistDesc.trim(),
        videoPayload
      );
    } else {
      if (!selectedSubjectId && subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      }
      onImportPlaylist(
        selectedSubjectId || subjects[0]?.id,
        playlistTitle.trim(),
        playlistDesc.trim(),
        videoPayload
      );
    }

    onClose();
  };

  const targetSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-5 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <FolderPlus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  {playlistId ? 'YouTube Playlist Dropped' : 'Import YouTube Playlist'}
                </h3>
                {playlistId && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                    {playlistId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Choose which study subject to add this playlist to. All videos will be imported automatically.
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

        {/* Content */}
        <form onSubmit={handleConfirmImport} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* URL Input if opened directly without dropping */}
          {!playlistId && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>YouTube Playlist Link</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputUrl(val);
                    const plId = extractYouTubePlaylistId(val);
                    if (plId) {
                      loadPlaylistById(plId);
                    }
                  }}
                  placeholder="Paste YouTube playlist URL (e.g. https://www.youtube.com/playlist?list=PL...)"
                  className="flex-1 bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const plId = extractYouTubePlaylistId(inputUrl);
                    if (plId) {
                      loadPlaylistById(plId);
                    } else {
                      setFetchError('Please enter a valid YouTube playlist URL with list=...');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fetch
                </button>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
              <h4 className="text-sm font-bold font-display text-white">
                Reading Playlist from YouTube...
              </h4>
              <p className="text-xs text-zinc-500 font-mono">
                Extracting video titles, thumbnails, and durations.
              </p>
            </div>
          ) : fetchError ? (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
              <p className="text-xs text-red-300 font-semibold">{fetchError}</p>
            </div>
          ) : (
            <>
              {/* Playlist Info Box */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                    <Tv className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Playlist Details</span>
                  </span>
                  <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-zinc-300">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      {videos.length} Videos
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      ⏱ {formatMinutes(totalDurationMins)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Playlist Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={playlistTitle}
                    onChange={(e) => setPlaylistTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={playlistDesc}
                    onChange={(e) => setPlaylistDesc(e.target.value)}
                    placeholder="e.g. Complete video course imported from YouTube"
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Subject Destination Selection */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Which Subject does this belong to? *</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewSubject(!isCreatingNewSubject)}
                    className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center space-x-1"
                  >
                    <span>{isCreatingNewSubject ? 'Choose Existing Subject' : '+ Create New Subject'}</span>
                  </button>
                </div>

                {isCreatingNewSubject ? (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      New Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Advanced French, Computer Networks, Linux Admin"
                      className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 font-bold focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-zinc-400 cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          📚 {sub.name} ({sub.playlists.length} playlists)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Videos Preview List */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 px-1">
                  Preview of Videos to Import ({videos.length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {videos.map((vid, idx) => (
                    <div
                      key={vid.videoId + '_' + idx}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center space-x-2.5"
                    >
                      <div className="relative w-16 aspect-video bg-black rounded overflow-hidden shrink-0">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[8px] font-mono font-bold text-white px-1 rounded">
                          {vid.durationText}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-[11px] font-bold text-white truncate" title={vid.title}>
                          {vid.title}
                        </h5>
                        <span className="text-[9px] text-zinc-400 font-mono block">
                          ⏱ {formatMinutes(vid.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex justify-between items-center shrink-0">
            <span className="text-[11px] text-zinc-500 font-mono">
              {videos.length} videos ready to add
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading || videos.length === 0}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white disabled:opacity-50 text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  Import Playlist ({videos.length} Videos)
                </span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
