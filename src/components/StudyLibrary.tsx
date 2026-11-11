import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  Calendar, 
  CalendarPlus, 
  Check, 
  CheckCircle2, 
  Circle,
  Tv, 
  Layers, 
  Clock, 
  Sparkles, 
  FolderPlus, 
  Folder, 
  ExternalLink, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  X, 
  Edit2,
  Lightbulb,
  BookmarkCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Target,
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  Pin,
  EyeOff,
  Eye,
  FileText,
  Terminal,
  Link2
} from 'lucide-react';
import { 
  StudySubject, 
  SubjectPlaylist, 
  SubjectVideo, 
  DayPlan, 
  YouTubeVideo,
  SubjectStudyPlan,
  SubjectStudyPart,
  StudyConcept,
  StudyConceptVideo,
  SubjectMilestoneTP,
  ClassIntelNotice,
  StudyNavigationTarget,
  Task
} from '../types';
import { 
  formatMinutes, 
  formatSeconds, 
  extractYouTubeId, 
  getFormattedDate, 
  getTomorrowDate, 
  loadDayPlan, 
  saveDayPlan,
  toggleStudyConceptCompleted,
  toggleStudyPartCompleted,
  toggleStudyTPCompleted,
  dismissClassIntelNotice,
  toggleConceptVideoState,
  syncTPCompletionToDayPlan,
  updateStudyPartDetails,
  updateStudyConceptDetails,
  addCustomStudyConcept,
  deleteStudyConcept,
  addManualVideoToConcept,
  updateStudyTPDetails,
  addCustomStudyTP
} from '../utils/storage';
import { fetchYouTubeDetails } from '../utils/youtube';
import { CoursePlanAuditModal } from './CoursePlanAuditModal';
import { TPExecutionModal } from './TPExecutionModal';
import { CheatSheetModal } from './CheatSheetModal';

interface StudyLibraryProps {
  subjects: StudySubject[];
  currentPlan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onUpdateSubjects: (updatedSubjects: StudySubject[]) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  onOpenImportPlaylist?: () => void;
  onOpenAIDigest?: (subjectId?: string) => void;
  navigationTarget?: StudyNavigationTarget | null;
  onClearNavigationTarget?: () => void;
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
  onOpenAIDigest,
  navigationTarget,
  onClearNavigationTarget,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    navigationTarget?.subjectId || subjects[0]?.id || ''
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'roadmap' | 'playlists'>('roadmap');
  const [showIntelRadar, setShowIntelRadar] = useState<boolean>(true);

  // Modals & form state
  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);

  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [cheatSheetPartId, setCheatSheetPartId] = useState<string | null | undefined>(undefined);
  const [activeTPSession, setActiveTPSession] = useState<{ partId: string; tpId: string } | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Inline roadmap editing & manual YouTube link state
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartTitle, setEditPartTitle] = useState('');
  const [editPartDesc, setEditPartDesc] = useState('');

  const [editingConceptKey, setEditingConceptKey] = useState<string | null>(null);
  const [editConceptName, setEditConceptName] = useState('');
  const [editConceptSummary, setEditConceptSummary] = useState('');
  const [editConceptNotes, setEditConceptNotes] = useState('');

  const [addingConceptPartId, setAddingConceptPartId] = useState<string | null>(null);
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptSummary, setNewConceptSummary] = useState('');
  const [newConceptNotes, setNewConceptNotes] = useState('');

  const [addingVideoConceptId, setAddingVideoConceptId] = useState<string | null>(null);
  const [manualVideoUrl, setManualVideoUrl] = useState('');
  const [manualVideoTitle, setManualVideoTitle] = useState('');
  const [manualVideoDuration, setManualVideoDuration] = useState<string>('');
  const [manualVideoBusy, setManualVideoBusy] = useState(false);
  const [manualVideoError, setManualVideoError] = useState<string | null>(null);

  const [editingTPKey, setEditingTPKey] = useState<string | null>(null);
  const [editTPTitle, setEditTPTitle] = useState('');
  const [editTPDesc, setEditTPDesc] = useState('');
  const [editTPMinutes, setEditTPMinutes] = useState<number>(60);
  const [editTPDeadline, setEditTPDeadline] = useState('');

  const [addingTPPartId, setAddingTPPartId] = useState<string | null>(null);
  const [newTPTitle, setNewTPTitle] = useState('');
  const [newTPDesc, setNewTPDesc] = useState('');
  const [newTPMinutes, setNewTPMinutes] = useState<number>(60);
  const [newTPDeadline, setNewTPDeadline] = useState('');

  // Add video state
  const [addVideoUrl, setAddVideoUrl] = useState('');
  const [addVideoTitle, setAddVideoTitle] = useState('');
  const [addVideoDuration, setAddVideoDuration] = useState<number>(20);
  const [addVideoNotes, setAddVideoNotes] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [videoFormError, setVideoFormError] = useState<string | null>(null);

  // Notification feedback & Part collapse state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);
  const [highlightedTPId, setHighlightedTPId] = useState<string | null>(null);
  const [highlightedConceptId, setHighlightedConceptId] = useState<string | null>(null);
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>({});
  const [resumeDirection, setResumeDirection] = useState<'down' | 'up'>('down');
  const partRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tpRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const conceptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activePlaylist = activeSubject?.playlists.find(
    (p) => p.id === (selectedPlaylistId || activeSubject?.playlists[0]?.id)
  ) || activeSubject?.playlists[0];

  const todayStr = getFormattedDate();
  const tomorrowStr = getTomorrowDate();

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
    if (!confirm(`Are you sure you want to delete "${name}" and all its playlists/plans?`)) return;
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
              return {
                ...p,
                videos: [newVid, ...p.videos],
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
    showToast('Video removed from playlist');
  };

  // Schedule Playlist Video for Today
  const handleScheduleForToday = (video: SubjectVideo) => {
    const todayPlan = currentPlan.date === todayStr ? currentPlan : loadDayPlan(todayStr);
    const existingWorkVideos = todayPlan.youtubeWorkVideos || [];

    if (existingWorkVideos.some((v) => v.videoId === video.videoId)) {
      showToast(`"${video.title}" is already in today's schedule!`);
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

  // Schedule Playlist Video for Tomorrow
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

  // ==========================================
  // Study Plan Roadmap Handlers
  // ==========================================

  const handleToggleConcept = (partId: string, conceptId: string) => {
    if (!activeSubject) return;
    const updated = toggleStudyConceptCompleted(activeSubject.id, partId, conceptId);
    onUpdateSubjects(updated);
  };

  const handleTogglePart = (partId: string) => {
    if (!activeSubject) return;
    const updated = toggleStudyPartCompleted(activeSubject.id, partId);
    onUpdateSubjects(updated);
    showToast(`Updated part status!`);
  };

  const handleToggleTP = (partId: string, tpId?: string) => {
    if (!activeSubject) return;
    const updated = toggleStudyTPCompleted(activeSubject.id, partId, tpId);
    onUpdateSubjects(updated);

    const updatedSubj = updated.find((s) => s.id === activeSubject.id);
    const updatedPart = updatedSubj?.studyPlan?.parts.find((p) => p.id === partId);
    const updatedTP = updatedPart
      ? tpId
        ? [updatedPart.targetTP, ...(updatedPart.additionalTPs || [])].find((t) => t?.id === tpId)
        : updatedPart.targetTP
      : undefined;

    if (updatedTP) {
      const syncedPlan = syncTPCompletionToDayPlan(
        currentPlan.date,
        activeSubject,
        partId,
        updatedTP,
        updatedTP.isCompleted
      );
      if (syncedPlan && currentPlan.date === syncedPlan.date) {
        onUpdatePlan(syncedPlan);
      }
    }

    showToast(`Updated Milestone TP status!`);
  };

  const handleSchedulePartToDay = (part: SubjectStudyPart, dateStr: string) => {
    if (!activeSubject) return;
    const targetPlan = dateStr === currentPlan.date ? currentPlan : loadDayPlan(dateStr);
    const remainingConcepts = part.mustLearnConcepts.filter((c) => !c.isCompleted);
    const conceptsToEstimate = remainingConcepts.length > 0 ? remainingConcepts : part.mustLearnConcepts;

    const summedVideoMins = conceptsToEstimate.reduce((acc, c) => {
      const firstVid = c.videoResources.find((v) => !v.isHidden) || c.videoResources[0];
      return acc + (firstVid?.durationMinutes || 15);
    }, 0);
    const estimatedMins = Math.min(180, Math.max(30, Math.round((summedVideoMins || 45) / 5) * 5));

    const cleanPartTitle = part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '');
    const conceptNames = conceptsToEstimate.map((c) => c.name).join(', ');
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `[${activeSubject.name}] Study Part ${part.partNumber}: ${cleanPartTitle}`,
      notes: `${part.description}\nConcepts: ${conceptNames}`,
      plannedDuration: estimatedMins,
      actualDuration: 0,
      status: 'pending',
      priority: 'normal',
      studyLink: { subjectId: activeSubject.id, partId: part.id },
    };

    const updated = {
      ...targetPlan,
      tasks: [...targetPlan.tasks, newTask],
    };

    if (dateStr === currentPlan.date) {
      onUpdatePlan(updated);
    } else {
      saveDayPlan(updated);
    }

    showToast(`✓ Scheduled Part ${part.partNumber} theory session to ${dateStr === todayStr ? "Today" : "Tomorrow"}!`);
  };

  const handleConceptVideoAction = (
    partId: string,
    conceptId: string,
    videoId: string,
    action: 'pin' | 'hide' | 'unhide_all' | 'watched'
  ) => {
    if (!activeSubject) return;
    const updated = toggleConceptVideoState(activeSubject.id, partId, conceptId, videoId, action);
    onUpdateSubjects(updated);
  };

  const handleSavePartEdit = (partId: string) => {
    if (!activeSubject) return;
    const updated = updateStudyPartDetails(activeSubject.id, partId, {
      title: editPartTitle,
      description: editPartDesc,
    });
    onUpdateSubjects(updated);
    setEditingPartId(null);
    showToast('✓ Updated Part details');
  };

  const handleSaveConceptEdit = (partId: string, conceptId: string) => {
    if (!activeSubject) return;
    const updated = updateStudyConceptDetails(activeSubject.id, partId, conceptId, {
      name: editConceptName,
      summary: editConceptSummary,
      additionalNotes: editConceptNotes,
    });
    onUpdateSubjects(updated);
    setEditingConceptKey(null);
    showToast('✓ Saved Concept notes & commands');
  };

  const handleAddCustomConcept = (partId: string) => {
    if (!activeSubject || !newConceptName.trim()) return;
    const updated = addCustomStudyConcept(activeSubject.id, partId, {
      name: newConceptName,
      summary: newConceptSummary,
      additionalNotes: newConceptNotes,
    });
    onUpdateSubjects(updated);
    setAddingConceptPartId(null);
    setNewConceptName('');
    setNewConceptSummary('');
    setNewConceptNotes('');
    showToast('✓ Added custom Concept');
  };

  const handleDeleteConcept = (partId: string, conceptId: string, conceptName: string) => {
    if (!activeSubject) return;
    if (!window.confirm(`Remove concept "${conceptName}" from this Part?`)) return;
    const updated = deleteStudyConcept(activeSubject.id, partId, conceptId);
    onUpdateSubjects(updated);
    if (editingConceptKey === `${partId}:${conceptId}`) {
      setEditingConceptKey(null);
    }
    showToast('Removed concept');
  };

  const handleAddManualVideo = async (partId: string, conceptId: string) => {
    if (!activeSubject) return;
    const rawUrl = manualVideoUrl.trim();
    const videoId = extractYouTubeId(rawUrl);
    if (!videoId) {
      setManualVideoError('Paste a valid YouTube video URL (youtube.com/watch?v=... or youtu.be/...)');
      return;
    }

    setManualVideoBusy(true);
    setManualVideoError(null);
    try {
      const meta = await fetchYouTubeDetails(rawUrl);
      const resolvedTitle =
        manualVideoTitle.trim() || meta?.title?.trim() || `YouTube Tutorial (${videoId})`;
      const parsedDuration = manualVideoDuration.trim() ? Number(manualVideoDuration) : 0;
      const durationMinutes =
        parsedDuration > 0 ? parsedDuration : meta?.durationMinutes || 15;

      const video: StudyConceptVideo = {
        videoId,
        title: resolvedTitle,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        durationMinutes,
        durationText: `${durationMinutes}m`,
        channel: 'Custom YouTube Link',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        isPinned: true,
        isHidden: false,
      };

      const updated = addManualVideoToConcept(activeSubject.id, partId, conceptId, video);
      onUpdateSubjects(updated);
      setAddingVideoConceptId(null);
      setManualVideoUrl('');
      setManualVideoTitle('');
      setManualVideoDuration('');
      showToast('✓ Added & pinned YouTube video!');
    } catch {
      setManualVideoError('Could not fetch video details. Add a title and try again.');
    } finally {
      setManualVideoBusy(false);
    }
  };

  const handleSaveTPEdit = (partId: string, tpId: string) => {
    if (!activeSubject) return;
    const updated = updateStudyTPDetails(activeSubject.id, partId, tpId, {
      title: editTPTitle,
      description: editTPDesc,
      estimatedMinutes: editTPMinutes,
      deadline: editTPDeadline,
    });
    onUpdateSubjects(updated);
    setEditingTPKey(null);
    showToast('✓ Updated TP card details');
  };

  const handleAddCustomTP = (partId: string) => {
    if (!activeSubject || !newTPTitle.trim()) return;
    const updated = addCustomStudyTP(activeSubject.id, partId, {
      title: newTPTitle,
      description: newTPDesc,
      estimatedMinutes: newTPMinutes,
      deadline: newTPDeadline,
    });
    onUpdateSubjects(updated);
    setAddingTPPartId(null);
    setNewTPTitle('');
    setNewTPDesc('');
    setNewTPMinutes(60);
    setNewTPDeadline('');
    showToast('✓ Added custom TP lab card');
  };

  const handleDismissNotice = (noticeId: string) => {
    if (!activeSubject) return;
    const updated = dismissClassIntelNotice(activeSubject.id, noticeId);
    onUpdateSubjects(updated);
  };

  const handleScheduleConceptVideoToDay = (conceptName: string, video: StudyConceptVideo, dateStr: string) => {
    const targetPlan = dateStr === currentPlan.date ? currentPlan : loadDayPlan(dateStr);
    const existingWorkVideos = targetPlan.youtubeWorkVideos || [];

    if (existingWorkVideos.some((v) => v.videoId === video.videoId)) {
      showToast(`"${video.title}" is already in schedule!`);
      return;
    }

    const scheduledVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      durationMinutes: video.durationMinutes,
      type: 'work',
      notes: `[${activeSubject?.name}] Concept: ${conceptName}`,
      isWatched: false,
    };

    const updated = {
      ...targetPlan,
      youtubeWorkVideos: [...existingWorkVideos, scheduledVideo],
    };

    if (dateStr === currentPlan.date) {
      onUpdatePlan(updated);
    } else {
      saveDayPlan(updated);
    }

    showToast(`✓ Added video to ${dateStr === todayStr ? "Today's" : "Tomorrow's"} Schedule!`);
  };

  const handleScheduleTPToDay = (partId: string, tp: SubjectMilestoneTP, dateStr: string) => {
    const targetPlan = dateStr === currentPlan.date ? currentPlan : loadDayPlan(dateStr);
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `${activeSubject?.name ? `[${activeSubject.name}] ` : ''}${tp.title}`,
      notes: `${tp.description}\nPrerequisites required: ${tp.requiredConceptNames.join(', ')}`,
      plannedDuration: tp.estimatedMinutes,
      actualDuration: 0,
      status: 'pending',
      priority: 'essential',
      studyLink: activeSubject
        ? { subjectId: activeSubject.id, partId, tpId: tp.id }
        : undefined,
    };

    const updated = {
      ...targetPlan,
      tasks: [...targetPlan.tasks, newTask],
    };

    if (dateStr === currentPlan.date) {
      onUpdatePlan(updated);
    } else {
      saveDayPlan(updated);
    }

    showToast(`✓ Added TP "${tp.title}" as task for ${dateStr === todayStr ? "Today" : "Tomorrow"}!`);
  };

  // Stats
  const totalSubjectVideos = activeSubject?.playlists.reduce((sum, p) => sum + p.videos.length, 0) || 0;
  const totalSubjectMinutes = activeSubject?.playlists.reduce(
    (sum, p) => sum + p.videos.reduce((vSum, v) => vSum + v.durationMinutes, 0),
    0
  ) || 0;

  const activePlaylistVideos = activePlaylist?.videos || [];
  const activePlaylistMinutes = activePlaylistVideos.reduce((sum, v) => sum + v.durationMinutes, 0);

  const scheduledVideoIds = new Set(
    (currentPlan.youtubeWorkVideos || []).map((v) => v.videoId)
  );

  const studyPlan = activeSubject?.studyPlan;
  const totalParts = studyPlan?.parts.length || 0;
  const completedParts = studyPlan?.parts.filter((p) => p.isCompleted).length || 0;
  const progressPercent = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
  const activeNotices = (studyPlan?.attentionNotices || []).filter((n) => !n.isDismissed);

  const getResumeTargetPart = (plan: SubjectStudyPlan | undefined) => {
    if (!plan || plan.parts.length === 0) return null;

    let lastCompletedIdx = -1;
    for (let i = 0; i < plan.parts.length; i++) {
      if (plan.parts[i].isCompleted) {
        lastCompletedIdx = i;
      }
    }

    if (lastCompletedIdx >= 0) {
      if (lastCompletedIdx + 1 < plan.parts.length) {
        return { part: plan.parts[lastCompletedIdx + 1], allDone: false };
      }
      const firstIncomplete = plan.parts.find((p) => !p.isCompleted);
      if (firstIncomplete) {
        return { part: firstIncomplete, allDone: false };
      }
      return { part: plan.parts[lastCompletedIdx], allDone: true };
    }

    let lastTouchedIdx = -1;
    for (let i = 0; i < plan.parts.length; i++) {
      const p = plan.parts[i];
      const hasDoneConcept = p.mustLearnConcepts.some((c) => c.isCompleted);
      const hasDoneTP =
        Boolean(p.targetTP?.isCompleted) ||
        Boolean(p.additionalTPs?.some((tp) => tp.isCompleted));
      if (hasDoneConcept || hasDoneTP) {
        lastTouchedIdx = i;
      }
    }

    if (lastTouchedIdx >= 0) {
      return { part: plan.parts[lastTouchedIdx], allDone: false };
    }

    return { part: plan.parts[0], allDone: false };
  };

  const resumeTarget = getResumeTargetPart(studyPlan);

  useEffect(() => {
    const updateResumeDirection = () => {
      if (!resumeTarget || activeTab !== 'roadmap') return;
      const el = partRefs.current[resumeTarget.part.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setResumeDirection(rect.top < 80 ? 'up' : 'down');
    };

    updateResumeDirection();
    window.addEventListener('scroll', updateResumeDirection, true);
    window.addEventListener('resize', updateResumeDirection);
    return () => {
      window.removeEventListener('scroll', updateResumeDirection, true);
      window.removeEventListener('resize', updateResumeDirection);
    };
  }, [resumeTarget?.part.id, activeTab, collapsedParts]);

  // Deep-link from DayTracker "Start" or Global Ctrl+F Search -> select subject, expand part, scroll directly to target card
  useEffect(() => {
    if (!navigationTarget) return;

    setSelectedSubjectId(navigationTarget.subjectId);
    setActiveTab(navigationTarget.tab || 'roadmap');
    if (navigationTarget.partId) {
      setCollapsedParts((prev) => ({
        ...prev,
        [navigationTarget.partId]: false,
      }));
    }

    const scrollTimer = setTimeout(() => {
      const tpEl = navigationTarget.tpId
        ? tpRefs.current[navigationTarget.tpId]
        : null;
      const conceptEl = navigationTarget.conceptId
        ? conceptRefs.current[navigationTarget.conceptId]
        : null;
      const partEl = navigationTarget.partId
        ? partRefs.current[navigationTarget.partId]
        : null;
      const scrollEl = tpEl || conceptEl || partEl;

      if (scrollEl) {
        scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (navigationTarget.partId) {
        setHighlightedPartId(navigationTarget.partId);
      }
      if (navigationTarget.tpId) {
        setHighlightedTPId(navigationTarget.tpId);
      }
      if (navigationTarget.conceptId) {
        setHighlightedConceptId(navigationTarget.conceptId);
      }
      onClearNavigationTarget?.();
    }, 90);

    return () => clearTimeout(scrollTimer);
  }, [navigationTarget?.nonce]);

  // Fade out Part / Concept / TP card navigation highlight ring cleanly
  useEffect(() => {
    if (!highlightedPartId && !highlightedTPId && !highlightedConceptId) return;
    const clearTimer = setTimeout(() => {
      setHighlightedPartId(null);
      setHighlightedTPId(null);
      setHighlightedConceptId(null);
    }, 2800);
    return () => clearTimeout(clearTimer);
  }, [highlightedPartId, highlightedTPId, highlightedConceptId]);

  const togglePartCollapsed = (partId: string) => {
    setCollapsedParts((prev) => ({
      ...prev,
      [partId]: !prev[partId],
    }));
  };

  const areAllPartsCollapsed =
    !!studyPlan &&
    studyPlan.parts.length > 0 &&
    studyPlan.parts.every((p) => Boolean(collapsedParts[p.id]));

  const handleToggleAllParts = () => {
    if (!studyPlan) return;
    const nextCollapsed = !areAllPartsCollapsed;
    const nextMap: Record<string, boolean> = {};
    for (const p of studyPlan.parts) {
      nextMap[p.id] = nextCollapsed;
    }
    setCollapsedParts(nextMap);
  };

  const handleJumpToResumePart = () => {
    if (!resumeTarget) return;
    const targetId = resumeTarget.part.id;
    if (collapsedParts[targetId]) {
      setCollapsedParts((prev) => ({ ...prev, [targetId]: false }));
    }
    requestAnimationFrame(() => {
      const targetEl = partRefs.current[targetId];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightedPartId(targetId);
        setTimeout(() => {
          setHighlightedPartId((prev) => (prev === targetId ? null : prev));
        }, 1800);
      }
    });
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-32 md:bottom-20 right-6 z-50 bg-zinc-900 border border-emerald-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Floating Resume Arrow Button */}
      {activeTab === 'roadmap' && studyPlan && studyPlan.parts.length > 0 && resumeTarget && (
        <button
          type="button"
          onClick={handleJumpToResumePart}
          title={
            resumeTarget.allDone
              ? `All parts completed — jump to Part ${resumeTarget.part.partNumber}`
              : `Jump ${resumeDirection} to Part ${resumeTarget.part.partNumber}: ${resumeTarget.part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '')}`
          }
          className="fixed bottom-20 md:bottom-6 right-6 z-40 group flex items-center space-x-2 px-3.5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-950/70 border border-indigo-400/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="text-xs font-bold font-display tracking-wide">
            {resumeTarget.allDone
              ? 'All Done'
              : `Part ${resumeTarget.part.partNumber}`}
          </span>
          <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
            {resumeDirection === 'up' ? (
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
            )}
          </span>
        </button>
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
                Study Subjects & Learning Roadmaps
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                {subjects.length} Subjects
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Multi-session academic roadmaps with prerequisite concept trees, milestone practical labs (TP), and curated video tutorials.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenAIDigest && (
            <button
              onClick={() => onOpenAIDigest(activeSubject?.id)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Synthesize with AI</span>
            </button>
          )}

          {onOpenImportPlaylist && (
            <button
              onClick={onOpenImportPlaylist}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all border border-zinc-700 cursor-pointer shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-zinc-300 stroke-[2.2]" />
              <span>Import Playlist</span>
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

      {/* Main Layout: Subjects Sidebar + Active Subject View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Column: Subjects List */}
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
              const hasPlan = !!sub.studyPlan;
              const partsCount = sub.studyPlan?.parts.length || 0;

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
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold font-display text-white truncate">
                          {sub.name}
                        </h4>
                        {hasPlan && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                            Roadmap
                          </span>
                        )}
                      </div>
                      {sub.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {sub.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-zinc-500 font-mono">
                        {hasPlan ? (
                          <span className="text-zinc-300 font-medium">{partsCount} Parts</span>
                        ) : (
                          <span>{sub.playlists.length} playlists</span>
                        )}
                        <span>•</span>
                        <span>{subVideoCount} videos</span>
                      </div>
                    </div>
                  </div>

                  {subjects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(sub.id, sub.name);
                      }}
                      title="Delete Subject"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all cursor-pointer"
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
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors mt-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Another Subject</span>
          </button>
        </div>

        {/* Right Column: Active Subject View */}
        <div className="md:col-span-8 lg:col-span-9 space-y-5">
          {activeSubject ? (
            <>
              {/* Subject Detail Header Card */}
              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4.5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3.5 h-3.5 rounded-full ring-4 ring-zinc-800"
                      style={{ backgroundColor: activeSubject.color }}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-extrabold font-display text-white">
                          {activeSubject.name}
                        </h3>
                        {studyPlan && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            {completedParts}/{totalParts} Parts Mastered ({progressPercent}%)
                          </span>
                        )}
                      </div>
                      {activeSubject.description && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {activeSubject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className={`flex flex-wrap items-center gap-2 ${
                      studyPlan ? 'w-full justify-between pt-0.5' : 'justify-end'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {onOpenAIDigest && (
                        <button
                          onClick={() => onOpenAIDigest(activeSubject.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 border border-zinc-700 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{studyPlan ? 'Append Session / TP' : 'Generate Roadmap'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsNewPlaylistModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 border border-zinc-700 transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>New Playlist</span>
                      </button>
                    </div>

                    {studyPlan && (
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCheatSheetPartId(null)}
                          title="Compile Master Cheat Sheet of all concepts, CLI commands, TP guides & exam hints"
                          className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 border border-amber-700/70 transition-colors cursor-pointer shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cheat Sheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsAuditModalOpen(true)}
                          title="Check existing parts, concepts, and ordering against your Course PDF"
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 border border-emerald-700/70 transition-colors cursor-pointer shadow-xs"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Audit Plan (Course PDF)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-view Navigation Tabs */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveTab('roadmap')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'roadmap'
                          ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Interactive Study Roadmap</span>
                      {studyPlan && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-300 text-zinc-900 font-bold ml-1">
                          {studyPlan.parts.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('playlists')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'playlists'
                          ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Saved Playlists & Videos</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 ml-1">
                        {totalSubjectVideos}
                      </span>
                    </button>
                  </div>

                  {studyPlan && activeNotices.length > 0 && (
                    <button
                      onClick={() => setShowIntelRadar(!showIntelRadar)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1.5 cursor-pointer px-2 py-1 rounded bg-amber-950/40 border border-amber-800/60"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{activeNotices.length} Class Notices</span>
                      {showIntelRadar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* TAB 1: INTERACTIVE STUDY ROADMAP */}
              {activeTab === 'roadmap' && (
                <div className="space-y-4">
                  {studyPlan ? (
                    <>
                      {/* Big Picture Mental Model Box */}
                      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-700/80 rounded-2xl p-5 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-indigo-400">
                            <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center">
                              <Lightbulb className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-extrabold font-display uppercase tracking-wider text-white">
                              The Big Picture & Real-World Mental Model
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
                            <span>Synthesized from {studyPlan.totalSessionsAnalyzed || 1} lecture sessions</span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                          {studyPlan.bigPictureDescription}
                        </p>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400">Course Mastery Progress</span>
                            <span className="text-emerald-400 font-bold">{progressPercent}% Completed</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Things to Give Attention To (Class Intelligence Radar) */}
                      {showIntelRadar && activeNotices.length > 0 && (
                        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4.5 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-amber-400">
                              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                              <span className="text-xs font-bold font-display uppercase tracking-wider text-amber-200">
                                Things to Give Attention To (Class Intelligence Radar)
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-amber-400/80">
                              From instructor lectures & TPs
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {activeNotices.map((notice) => (
                              <div
                                key={notice.id}
                                className="bg-zinc-950/90 border border-amber-900/50 p-3 rounded-xl flex items-start justify-between gap-2 shadow-xs"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                      {notice.category.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-bold text-zinc-100 truncate">{notice.title}</span>
                                  </div>
                                  <p className="text-[11px] text-zinc-300 leading-snug">{notice.details}</p>
                                  <span className="text-[10px] font-mono text-zinc-500 block">
                                    Source: {notice.sessionSource}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDismissNotice(notice.id)}
                                  title="Dismiss notice"
                                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900 transition-colors shrink-0 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sequential Learning Parts (Prerequisite Chaining) */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400">
                            Sequential Learning Parts ({studyPlan.parts.length} Parts Ordered by Prerequisite)
                          </span>
                          <div className="flex items-center space-x-3">
                            <span className="hidden sm:inline text-[11px] font-mono text-zinc-500">
                              Concepts must be mastered before attempting Milestone TP
                            </span>
                            <button
                              type="button"
                              onClick={handleToggleAllParts}
                              className="text-[11px] font-semibold text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              {areAllPartsCollapsed ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>Expand All</span>
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>Shrink All</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {studyPlan.parts.map((part) => {
                          const partConceptsDone = part.mustLearnConcepts.filter((c) => c.isCompleted).length;
                          const totalPartConcepts = part.mustLearnConcepts.length;
                          const partTPs = [
                            ...(part.targetTP ? [part.targetTP] : []),
                            ...(part.additionalTPs || []),
                          ];
                          const isCollapsed = Boolean(collapsedParts[part.id]);

                          return (
                            <div
                              key={part.id}
                              ref={(el) => {
                                partRefs.current[part.id] = el;
                              }}
                              className={`scroll-mt-24 rounded-2xl border transition-all shadow-sm ${
                                isCollapsed ? 'px-5 py-3.5' : 'p-5 space-y-4'
                              } ${
                                highlightedPartId === part.id
                                  ? 'ring-2 ring-indigo-500/80 border-indigo-500/70 bg-indigo-950/15'
                                  : part.isCompleted
                                  ? 'bg-zinc-900/70 border-emerald-800/60'
                                  : 'bg-[#18181b] border-zinc-800'
                              }`}
                            >
                              {/* Part Header */}
                              <div
                                className={`flex flex-wrap items-center justify-between gap-3 ${
                                  isCollapsed ? '' : 'pb-3 border-b border-zinc-800/80'
                                }`}
                              >
                                <div
                                  onClick={() => togglePartCollapsed(part.id)}
                                  className="space-y-1 min-w-0 flex-1 cursor-pointer select-none"
                                  title={isCollapsed ? 'Click to expand part' : 'Click to shrink part'}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                                      Part {part.partNumber}
                                    </span>
                                    <h4 className="text-sm font-extrabold text-white font-display">
                                      {part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '')}
                                    </h4>
                                    {part.isCompleted && (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        <span>Mastered</span>
                                      </span>
                                    )}
                                    {isCollapsed && (
                                      <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                                        {partConceptsDone}/{totalPartConcepts} Concepts
                                        {partTPs.length > 0 ? ` • ${partTPs.length} TP` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCheatSheetPartId(part.id);
                                    }}
                                    title={`Compile Cheat Sheet for Part ${part.partNumber}`}
                                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 border border-zinc-700/80 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="hidden lg:inline">Sheet</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCollapsedParts((prev) => ({ ...prev, [part.id]: false }));
                                      setEditingPartId(part.id);
                                      setEditPartTitle(part.title);
                                      setEditPartDesc(part.description || '');
                                    }}
                                    title={`Edit Part ${part.partNumber} title & description`}
                                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 border border-zinc-700/80 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSchedulePartToDay(part, todayStr);
                                    }}
                                    title="Schedule whole Part (Theory concepts) to Today's Plan"
                                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-300 border border-zinc-700/80 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="hidden sm:inline">+ Today</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSchedulePartToDay(part, tomorrowStr);
                                    }}
                                    title="Schedule whole Part (Theory concepts) to Tomorrow's Plan"
                                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-sky-300 border border-zinc-700/80 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                  >
                                    <CalendarPlus className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="hidden sm:inline">+ Tomorrow</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleTogglePart(part.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                                      part.isCompleted
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'
                                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                    }`}
                                  >
                                    {part.isCompleted ? (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>Part Mastered</span>
                                      </>
                                    ) : (
                                      <>
                                        <Circle className="w-4 h-4 text-zinc-400" />
                                        <span>Mark Part Done</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => togglePartCollapsed(part.id)}
                                    title={isCollapsed ? 'Expand part' : 'Shrink part'}
                                    aria-label={isCollapsed ? `Expand Part ${part.partNumber}` : `Shrink Part ${part.partNumber}`}
                                    aria-expanded={!isCollapsed}
                                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/70 transition-colors cursor-pointer"
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {!isCollapsed && (
                              <>

                              {/* Inline Part Editor */}
                              {editingPartId === part.id && (
                                <div className="bg-zinc-900/90 border border-indigo-500/50 rounded-xl p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
                                      Edit Part {part.partNumber}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={editPartTitle}
                                    onChange={(e) => setEditPartTitle(e.target.value)}
                                    placeholder="Part title"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                  />
                                  <textarea
                                    rows={2}
                                    value={editPartDesc}
                                    onChange={(e) => setEditPartDesc(e.target.value)}
                                    placeholder="Why this matters / overview..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPartId(null)}
                                      className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSavePartEdit(part.id)}
                                      className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Save Part
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* The Big Picture / Why You Learn It / How It Benefits You */}
                              {part.description && (
                                <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 space-y-1.5">
                                  <div className="flex items-center space-x-2 text-indigo-400">
                                    <Lightbulb className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-indigo-300">
                                      The Big Picture: Why You Learn It & How It Benefits You
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                                    {part.description}
                                  </p>
                                </div>
                              )}

                                {/* Section 1: Must-Learn Concepts (Prerequisites) */}
                              <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold font-display uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                                    <Target className="w-3.5 h-3.5" />
                                    <span>Must-Learn Concepts ({partConceptsDone}/{totalPartConcepts} Mastered)</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                                      Understand these concepts first
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingConceptPartId(addingConceptPartId === part.id ? null : part.id);
                                        setNewConceptName('');
                                        setNewConceptSummary('');
                                        setNewConceptNotes('');
                                      }}
                                      className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3 text-emerald-400" />
                                      <span>Add Concept</span>
                                    </button>
                                  </div>
                                </div>

                                {addingConceptPartId === part.id && (
                                  <div className="bg-zinc-900/90 border border-emerald-700/50 rounded-xl p-3.5 space-y-2">
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold block">
                                      New Custom Concept in Part {part.partNumber}
                                    </span>
                                    <input
                                      type="text"
                                      value={newConceptName}
                                      onChange={(e) => setNewConceptName(e.target.value)}
                                      placeholder="Concept title (e.g. Sticky Bit & SUID Permissions)"
                                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                    <textarea
                                      rows={2}
                                      value={newConceptSummary}
                                      onChange={(e) => setNewConceptSummary(e.target.value)}
                                      placeholder="Concise concept explanation..."
                                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                                    />
                                    <textarea
                                      rows={2}
                                      value={newConceptNotes}
                                      onChange={(e) => setNewConceptNotes(e.target.value)}
                                      placeholder="Optional CLI commands / code notes (included in Ctrl+F & Cheat Sheet)..."
                                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setAddingConceptPartId(null)}
                                        className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddCustomConcept(part.id)}
                                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                      >
                                        Add Concept
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2.5">
                                  {part.mustLearnConcepts.map((concept) => {
                                    const hiddenVideosCount = concept.videoResources.filter((v) => v.isHidden).length;
                                    const visibleVideos = concept.videoResources
                                      .filter((v) => !v.isHidden)
                                      .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
                                    const isHighlightedConcept = highlightedConceptId === concept.id;

                                    return (
                                    <div
                                      key={concept.id}
                                      ref={(el) => {
                                        conceptRefs.current[concept.id] = el;
                                      }}
                                      className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                                        isHighlightedConcept
                                          ? 'bg-indigo-950/35 border-indigo-400 ring-2 ring-indigo-500/40'
                                          : concept.isCompleted
                                          ? 'bg-zinc-950/70 border-emerald-900/50'
                                          : 'bg-zinc-950 border-zinc-800'
                                      }`}
                                    >
                                      {/* Concept Title & Checkbox */}
                                      {editingConceptKey === `${part.id}:${concept.id}` ? (
                                        <div className="bg-zinc-900/80 border border-indigo-500/40 rounded-lg p-3 space-y-2">
                                          <input
                                            type="text"
                                            value={editConceptName}
                                            onChange={(e) => setEditConceptName(e.target.value)}
                                            placeholder="Concept name"
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                                          />
                                          <textarea
                                            rows={2}
                                            value={editConceptSummary}
                                            onChange={(e) => setEditConceptSummary(e.target.value)}
                                            placeholder="Summary..."
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                          />
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                              <Terminal className="w-3 h-3" />
                                              <span>Personal Commands &amp; Study Notes (Ctrl+F &amp; Cheat Sheet ready)</span>
                                            </label>
                                            <textarea
                                              rows={3}
                                              value={editConceptNotes}
                                              onChange={(e) => setEditConceptNotes(e.target.value)}
                                              placeholder="e.g. chmod 4755 /usr/local/bin/tool"
                                              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                                            />
                                          </div>
                                          <div className="flex items-center justify-between pt-1">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteConcept(part.id, concept.id, concept.name)}
                                              className="px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/50 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setEditingConceptKey(null)}
                                                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleSaveConceptEdit(part.id, concept.id)}
                                                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start space-x-2.5 min-w-0">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleConcept(part.id, concept.id)}
                                                className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                                              >
                                                {concept.isCompleted ? (
                                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                  <Circle className="w-4 h-4 text-zinc-600" />
                                                )}
                                              </button>
                                              <div>
                                                <h5 className={`text-xs font-bold ${
                                                  concept.isCompleted ? 'line-through text-zinc-400' : 'text-zinc-100'
                                                }`}>
                                                  {concept.name}
                                                </h5>
                                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                                  {concept.summary}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setAddingVideoConceptId(
                                                    addingVideoConceptId === concept.id ? null : concept.id
                                                  );
                                                  setManualVideoUrl('');
                                                  setManualVideoTitle('');
                                                  setManualVideoDuration('');
                                                  setManualVideoError(null);
                                                }}
                                                title="Attach a custom YouTube tutorial link"
                                                className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-300 border border-zinc-800 text-[10px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                              >
                                                <Link2 className="w-3 h-3" />
                                                <span>+ Video</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingConceptKey(`${part.id}:${concept.id}`);
                                                  setEditConceptName(concept.name);
                                                  setEditConceptSummary(concept.summary || '');
                                                  setEditConceptNotes(concept.additionalNotes || '');
                                                }}
                                                title="Edit concept, personal notes, or CLI commands"
                                                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors cursor-pointer"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {concept.additionalNotes && concept.additionalNotes.trim() && (
                                            <div className="bg-black/50 border border-emerald-900/40 rounded-lg px-3 py-2 flex items-start gap-2">
                                              <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                              <pre className="text-[11px] font-mono text-emerald-300/95 whitespace-pre-wrap leading-relaxed flex-1 min-w-0">
                                                {concept.additionalNotes.trim()}
                                              </pre>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Manual YouTube Link Form */}
                                      {addingVideoConceptId === concept.id && (
                                        <div className="bg-zinc-900/90 border border-indigo-500/40 rounded-lg p-2.5 space-y-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <input
                                              type="url"
                                              value={manualVideoUrl}
                                              onChange={(e) => {
                                                setManualVideoUrl(e.target.value);
                                                setManualVideoError(null);
                                              }}
                                              placeholder="Paste YouTube URL (https://youtube.com/watch?v=...)"
                                              className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                            <input
                                              type="text"
                                              value={manualVideoTitle}
                                              onChange={(e) => setManualVideoTitle(e.target.value)}
                                              placeholder="Optional custom title (auto-fetched if blank)"
                                              className="w-48 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                            />
                                            <input
                                              type="number"
                                              min={1}
                                              value={manualVideoDuration}
                                              onChange={(e) => setManualVideoDuration(e.target.value)}
                                              placeholder="Min"
                                              title="Optional duration override in minutes"
                                              className="w-16 bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 text-center focus:outline-none focus:border-indigo-500"
                                            />
                                            <button
                                              type="button"
                                              disabled={manualVideoBusy}
                                              onClick={() => handleAddManualVideo(part.id, concept.id)}
                                              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                                            >
                                              {manualVideoBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                                              <span>Add &amp; Pin</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setAddingVideoConceptId(null)}
                                              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          {manualVideoError && (
                                            <p className="text-[11px] text-rose-400">{manualVideoError}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Rich Video Recommendations */}
                                      {concept.videoResources.length > 0 && (
                                        <div className="pt-2 border-t border-zinc-900 space-y-1.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                                              Curated Video Tutorials ({visibleVideos.length} shown{hiddenVideosCount > 0 ? ` • ${hiddenVideosCount} hidden` : ''}):
                                            </span>
                                            {hiddenVideosCount > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => handleConceptVideoAction(part.id, concept.id, '', 'unhide_all')}
                                                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                                              >
                                                <Eye className="w-3 h-3" />
                                                <span>Restore {hiddenVideosCount} hidden</span>
                                              </button>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {visibleVideos.map((vid) => {
                                              const pct = vid.isWatched
                                                ? 100
                                                : vid.lastPlayedSeconds && vid.durationMinutes > 0
                                                ? Math.min(98, Math.round((vid.lastPlayedSeconds / (vid.durationMinutes * 60)) * 100))
                                                : 0;

                                              return (
                                                <div
                                                  key={vid.videoId}
                                                  className={`p-2 rounded-lg flex items-center justify-between gap-2 group transition-all border ${
                                                    vid.isPinned
                                                      ? 'bg-amber-950/15 border-amber-700/50 hover:border-amber-600/70'
                                                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                                                  }`}
                                                >
                                                  <div className="flex items-center space-x-2 min-w-0">
                                                    <div className="relative w-12 h-8 rounded overflow-hidden shrink-0 bg-zinc-950">
                                                      <img
                                                        src={vid.thumbnail}
                                                        alt={vid.title}
                                                        className={`w-full h-full object-cover ${vid.isWatched ? 'opacity-70' : ''}`}
                                                      />
                                                      {pct > 0 && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                                                          <div
                                                            className={`h-full ${vid.isWatched ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                                                            style={{ width: `${pct}%` }}
                                                          />
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="flex items-center gap-1">
                                                        {vid.isPinned && (
                                                          <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0 fill-current" />
                                                        )}
                                                        <p className={`text-[11px] font-semibold truncate group-hover:text-white ${vid.isWatched ? 'text-zinc-400' : 'text-zinc-200'}`} title={vid.title}>
                                                          {vid.title}
                                                        </p>
                                                      </div>
                                                      <span className="text-[10px] text-zinc-500 font-mono">
                                                        {vid.durationText || `${vid.durationMinutes}m`} • {vid.channel}
                                                        {vid.isWatched ? ' • Watched' : pct > 0 ? ` • ${pct}%` : ''}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center space-x-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        onPlayVideo({
                                                          id: 'yt_roadmap_' + vid.videoId,
                                                          title: vid.title,
                                                          url: vid.url,
                                                          videoId: vid.videoId,
                                                          durationMinutes: vid.durationMinutes,
                                                          type: 'work',
                                                          notes: `[${activeSubject.name}] Concept: ${concept.name}`,
                                                          isWatched: !!vid.isWatched,
                                                          lastPlayedSeconds: vid.lastPlayedSeconds,
                                                        })
                                                      }
                                                      title="Watch Video Now"
                                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                      <Play className="w-3.5 h-3.5 fill-current" />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleConceptVideoAction(part.id, concept.id, vid.videoId, 'watched')}
                                                      title={vid.isWatched ? 'Mark Unwatched' : 'Mark Watched'}
                                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                                        vid.isWatched
                                                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-300'
                                                      }`}
                                                    >
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleConceptVideoAction(part.id, concept.id, vid.videoId, 'pin')}
                                                      title={vid.isPinned ? 'Unpin suggestion' : 'Pin best tutorial to top'}
                                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                                        vid.isPinned
                                                          ? 'bg-amber-950/60 text-amber-400 border border-amber-700/60'
                                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-300'
                                                      }`}
                                                    >
                                                      <Pin className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleConceptVideoAction(part.id, concept.id, vid.videoId, 'hide')}
                                                      title="Hide unhelpful suggestion"
                                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                                                    >
                                                      <EyeOff className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleScheduleConceptVideoToDay(concept.name, vid, todayStr)}
                                                      title="Schedule to Today"
                                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                                    >
                                                      <Calendar className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleScheduleConceptVideoToDay(concept.name, vid, tomorrowStr)}
                                                      title="Schedule to Tomorrow"
                                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-sky-400 transition-colors cursor-pointer"
                                                    >
                                                      <CalendarPlus className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Section 2: Milestone Practical Work (Target TPs) */}
                              {partTPs.map((tp) => (
                                <div
                                  key={tp.id}
                                  ref={(el) => {
                                    tpRefs.current[tp.id] = el;
                                  }}
                                  className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                                    highlightedTPId === tp.id
                                      ? 'ring-2 ring-indigo-400 border-indigo-400 bg-sky-950/35 shadow-lg shadow-indigo-950/60'
                                      : tp.isCompleted
                                        ? 'bg-sky-950/20 border-sky-700/60'
                                        : 'bg-zinc-950 border-sky-900/40'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex items-start space-x-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTP(part.id, tp.id)}
                                        className="mt-0.5 text-zinc-500 hover:text-sky-400 transition-colors cursor-pointer shrink-0"
                                      >
                                        {tp.isCompleted ? (
                                          <CheckCircle2 className="w-4.5 h-4.5 text-sky-400" />
                                        ) : (
                                          <Circle className="w-4.5 h-4.5 text-zinc-600" />
                                        )}
                                      </button>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <Briefcase className="w-4 h-4 text-sky-400" />
                                          <h5 className={`text-xs font-extrabold font-display ${
                                            tp.isCompleted ? 'line-through text-zinc-400' : 'text-sky-200'
                                          }`}>
                                            {tp.title}
                                          </h5>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                                          {tp.description}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                        ~{formatMinutes(tp.estimatedMinutes)}
                                      </span>
                                      {tp.deadline && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                          Due: {tp.deadline}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const k = `${part.id}:${tp.id}`;
                                          if (editingTPKey === k) {
                                            setEditingTPKey(null);
                                          } else {
                                            setEditingTPKey(k);
                                            setEditTPTitle(tp.title);
                                            setEditTPDesc(tp.description || '');
                                            setEditTPMinutes(tp.estimatedMinutes || 60);
                                            setEditTPDeadline(tp.deadline || '');
                                          }
                                        }}
                                        title="Edit TP title, duration estimate, or deadline"
                                        className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {editingTPKey === `${part.id}:${tp.id}` && (
                                    <div className="bg-zinc-900/90 border border-sky-500/40 rounded-lg p-3 space-y-2">
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                        <input
                                          type="text"
                                          value={editTPTitle}
                                          onChange={(e) => setEditTPTitle(e.target.value)}
                                          placeholder="TP Title"
                                          className="sm:col-span-2 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                                        />
                                        <input
                                          type="number"
                                          min={10}
                                          value={editTPMinutes}
                                          onChange={(e) => setEditTPMinutes(Number(e.target.value) || 60)}
                                          placeholder="Minutes"
                                          title="Estimated minutes"
                                          className="bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                                        />
                                        <input
                                          type="text"
                                          value={editTPDeadline}
                                          onChange={(e) => setEditTPDeadline(e.target.value)}
                                          placeholder="Deadline (e.g. Nov 20)"
                                          className="bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                                        />
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={editTPDesc}
                                        onChange={(e) => setEditTPDesc(e.target.value)}
                                        placeholder="Lab description..."
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingTPKey(null)}
                                          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveTPEdit(part.id, tp.id)}
                                          className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
                                        >
                                          Save TP
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-900 gap-2">
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      Prerequisites: {tp.requiredConceptNames.join(' • ')}
                                    </span>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setActiveTPSession({ partId: part.id, tpId: tp.id })}
                                        className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>
                                          {tp.executionGuide
                                            ? `Continue TP (${tp.executionGuide.exercises.filter((ex) => ex.isCompleted).length}/${tp.executionGuide.exercises.length})`
                                            : 'Start TP'}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleScheduleTPToDay(part.id, tp, todayStr)}
                                        className="px-2.5 py-1 rounded-md bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>+ Schedule to Today</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleScheduleTPToDay(part.id, tp, tomorrowStr)}
                                        className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                                      >
                                        <CalendarPlus className="w-3 h-3" />
                                        <span>+ Tomorrow</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Optional Add Custom TP Card inside Part */}
                              {addingTPPartId === part.id ? (
                                <div className="bg-zinc-900/90 border border-sky-700/50 rounded-xl p-3.5 space-y-2">
                                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-bold block">
                                    New Custom TP Lab in Part {part.partNumber}
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input
                                      type="text"
                                      value={newTPTitle}
                                      onChange={(e) => setNewTPTitle(e.target.value)}
                                      placeholder="TP Title (e.g. TP 04: Shell Scripting)"
                                      className="sm:col-span-2 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                                    />
                                    <input
                                      type="number"
                                      min={15}
                                      value={newTPMinutes}
                                      onChange={(e) => setNewTPMinutes(Number(e.target.value) || 60)}
                                      placeholder="Minutes"
                                      className="bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                                    />
                                    <input
                                      type="text"
                                      value={newTPDeadline}
                                      onChange={(e) => setNewTPDeadline(e.target.value)}
                                      placeholder="Optional deadline"
                                      className="bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={newTPDesc}
                                    onChange={(e) => setNewTPDesc(e.target.value)}
                                    placeholder="Lab exercises & goal summary..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setAddingTPPartId(null)}
                                      className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomTP(part.id)}
                                      className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Add TP
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingTPPartId(part.id);
                                      setNewTPTitle('');
                                      setNewTPDesc('');
                                      setNewTPMinutes(90);
                                      setNewTPDeadline('');
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-sky-300 border border-zinc-800 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add TP to Part {part.partNumber}</span>
                                  </button>
                                </div>
                              )}
                              </>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* Empty State: No Study Plan */
                    <div className="bg-[#18181b] border border-dashed border-zinc-800 rounded-2xl p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 mx-auto">
                        <BookmarkCheck className="w-6 h-6 stroke-[2]" />
                      </div>
                      <h4 className="text-base font-extrabold font-display text-white">
                        No Interactive Study Roadmap Yet
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Synthesize your class lecture transcripts and practical lab sheets (TP) into a sequential, prerequisite-chained learning tree for {activeSubject.name}.
                      </p>
                      {onOpenAIDigest && (
                        <button
                          onClick={() => onOpenAIDigest(activeSubject.id)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold font-display uppercase tracking-wider inline-flex items-center space-x-2 shadow-lg cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Synthesize Roadmap with AI</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SAVED PLAYLISTS & VIDEOS */}
              {activeTab === 'playlists' && activePlaylist && (
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-5">
                  
                  {/* Playlist Tabs Bar */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {activeSubject.playlists.map((pl) => {
                      const isPlSelected = pl.id === activePlaylist?.id;

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
                        className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center space-x-1 px-2 py-1 rounded hover:bg-zinc-800/80 transition-colors cursor-pointer"
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
                      <div className="md:col-span-8">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          YouTube Link *
                        </label>
                        <input
                          type="text"
                          value={addVideoUrl}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
                        />
                      </div>

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
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-zinc-400"
                        />
                      </div>
                    </div>

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
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
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
                          className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
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
                        Click "+ Today" to add any video directly to your study schedule
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
                              <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                                <img
                                  src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
                                  }}
                                />
                                
                                {video.isWatched ? (
                                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold border border-emerald-400/40 flex items-center space-x-1 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Watched</span>
                                  </div>
                                ) : hasResume ? (
                                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-zinc-950 text-[10px] font-mono font-bold border border-amber-300/60 flex items-center space-x-1 shadow-sm">
                                    <span>▶ Resume {formatSeconds(video.lastPlayedSeconds!)}</span>
                                  </div>
                                ) : null}

                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-zinc-100 text-[10px] font-mono font-bold border border-zinc-700/60 flex items-center space-x-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{formatMinutes(video.durationMinutes)}</span>
                                </div>

                                {hasResume && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                                    <div 
                                      className="h-full bg-emerald-500" 
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                )}

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
                                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider inline-flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
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
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
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
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
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
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
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
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
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
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
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
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewPlaylistModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Course Cheat Sheet Compiler Modal */}
      {activeSubject && activeSubject.studyPlan && cheatSheetPartId !== undefined && (
        <CheatSheetModal
          isOpen={true}
          onClose={() => setCheatSheetPartId(undefined)}
          subject={activeSubject}
          initialPartId={cheatSheetPartId}
        />
      )}

      {/* Course Plan Audit Modal */}
      {activeSubject && activeSubject.studyPlan && (
        <CoursePlanAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          subject={activeSubject}
          onUpdateSubjects={onUpdateSubjects}
          onAuditApplied={(summaryMessage) => showToast(summaryMessage)}
        />
      )}

      {/* Interactive Step-by-Step TP Coach Modal */}
      {activeSubject && activeSubject.studyPlan && activeTPSession && (() => {
        const sessionPart = activeSubject.studyPlan.parts.find(
          (p) => p.id === activeTPSession.partId
        );
        const sessionTP = sessionPart
          ? [sessionPart.targetTP, ...(sessionPart.additionalTPs || [])].find(
              (tp) => tp && tp.id === activeTPSession.tpId
            )
          : undefined;
        if (!sessionPart || !sessionTP) return null;

        return (
          <TPExecutionModal
            isOpen={true}
            onClose={() => setActiveTPSession(null)}
            subject={activeSubject}
            part={sessionPart}
            tp={sessionTP}
            onUpdateSubjects={onUpdateSubjects}
            onTPCompleted={(title, completedTp) => {
              const syncedPlan = syncTPCompletionToDayPlan(
                currentPlan.date,
                activeSubject,
                sessionPart.id,
                completedTp || sessionTP,
                true
              );
              if (syncedPlan && currentPlan.date === syncedPlan.date) {
                onUpdatePlan(syncedPlan);
              }
              showToast(`Completed ${title}!`);
            }}
          />
        );
      })()}

    </div>
  );
};
