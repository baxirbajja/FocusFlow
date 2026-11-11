import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Header } from './components/Header';
import { BudgetOverview } from './components/BudgetOverview';
import { ActiveTaskHUD } from './components/ActiveTaskHUD';
import { DayTracker } from './components/DayTracker';
import { DayPlanner } from './components/DayPlanner';
import { HistoryView } from './components/HistoryView';
import { TaskNotesModal } from './components/TaskNotesModal';
import { TaskOverModal } from './components/TaskOverModal';
import { MiniWidget } from './components/MiniWidget';
import { CreateTemplateModal } from './components/CreateTemplateModal';
import { AddTemplateTaskModal } from './components/AddTemplateTaskModal';
import { ScheduleYouTubeModal } from './components/ScheduleYouTubeModal';
import { YouTubePlayerModal } from './components/YouTubePlayerModal';
import { DropVideoModal } from './components/DropVideoModal';
import { DropPlaylistModal } from './components/DropPlaylistModal';
import { StudyLibrary } from './components/StudyLibrary';
import { AIDigestModal } from './components/AIDigestModal';
import { DayReportModal } from './components/DayReportModal';
import { BottomNav } from './components/BottomNav';
import { OfflineCatchupModal, OfflineCatchupData } from './components/OfflineCatchupModal';
import { SettingsModal } from './components/SettingsModal';
import { PostureBreakModal } from './components/PostureBreakModal';
import { GlobalStudySearchModal } from './components/GlobalStudySearchModal';
import { AppView, DayPlan, Task, PriorityLevel, TaskTemplate, YouTubeVideo, StudySubject, StudyNavigationTarget, TaskStudyLink } from './types';
import { 
  getFormattedDate, 
  getTomorrowDate, 
  loadDayPlan, 
  saveDayPlan,
  loadTaskTemplates,
  saveTaskTemplate,
  deleteTaskTemplate,
  loadStudySubjects,
  saveStudySubjects,
  addStudySubject,
  addVideoToSubjectPlaylist,
  addImportedPlaylistToSubject,
  extractYouTubeId,
  extractYouTubePlaylistId,
  updateVideoPlaybackState,
  resolveTaskStudyNavigation,
  setStudyTPCompletedState,
  setStudyPartConceptsCompleted,
} from './utils/storage';
import { soundManager } from './utils/audio';
import { sendDesktopNotification } from './utils/notifications';
import { useTimerEngine } from './hooks/useTimerEngine';
import { Moon, ArrowRight, UploadCloud, Tv } from 'lucide-react';

export function App() {
  const todayStr = getFormattedDate();
  const tomorrowStr = getTomorrowDate();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeView, setActiveView] = useState<AppView>('tracker');
  const [isMiniMode, setIsMiniMode] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<DayPlan>(() => loadDayPlan(todayStr));
  const [noteModalTask, setNoteModalTask] = useState<Task | null>(null);

  // Sync initial Always-On-Top state if running in Electron
  useEffect(() => {
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then(setIsPinned);
    }
  }, []);

  const handleEnterMiniMode = async () => {
    setIsMiniMode(true);
    if (window.electronAPI?.enterMiniMode) {
      await window.electronAPI.enterMiniMode();
      setIsPinned(true);
    }
  };

  const handleExitMiniMode = async () => {
    setIsMiniMode(false);
    if (window.electronAPI?.exitMiniMode) {
      await window.electronAPI.exitMiniMode();
      setIsPinned(false);
    }
  };

  const handleToggleMiniMode = (next: boolean) => {
    if (next) {
      handleEnterMiniMode();
    } else {
      handleExitMiniMode();
    }
  };

  const handleTogglePin = async () => {
    if (window.electronAPI?.toggleAlwaysOnTop) {
      const next = !isPinned;
      const res = await window.electronAPI.toggleAlwaysOnTop(next);
      setIsPinned(res);
    }
  };

  // Task Templates state & modals
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(() => loadTaskTemplates());
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState<boolean>(false);
  const [selectedTemplateForAddition, setSelectedTemplateForAddition] = useState<TaskTemplate | null>(null);

  // YouTube Studio & Player Modals
  const [isScheduleYouTubeModalOpen, setIsScheduleYouTubeModalOpen] = useState<boolean>(false);
  const [activePlayingVideo, setActivePlayingVideo] = useState<YouTubeVideo | null>(null);

  // Study Library Subjects state
  const [studySubjects, setStudySubjects] = useState<StudySubject[]>(() => loadStudySubjects());

  // Day Report Modal State
  const [isDayReportModalOpen, setIsDayReportModalOpen] = useState<boolean>(false);

  // Settings & Accountability Engine Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // AI Lecture & TP Digest Modal
  const [isAIDigestModalOpen, setIsAIDigestModalOpen] = useState<boolean>(false);
  const [aiDigestSubjectId, setAiDigestSubjectId] = useState<string | undefined>(undefined);
  const [pendingStudyNav, setPendingStudyNav] = useState<StudyNavigationTarget | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Drag & Drop State
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const [droppedVideoId, setDroppedVideoId] = useState<string | null>(null);
  const [droppedPlaylistId, setDroppedPlaylistId] = useState<string | null>(null);
  const [isImportPlaylistModalOpen, setIsImportPlaylistModalOpen] = useState<boolean>(false);

  // Offline Time Reconcile Catchup State (When PC was turned off / sleeping)
  const [offlineCatchupData, setOfflineCatchupData] = useState<OfflineCatchupData | null>(null);

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;

  useEffect(() => {
    const loaded = loadDayPlan(selectedDate);
    setCurrentPlan(loaded);
  }, [selectedDate]);

  // Initial startup offline gap detection (if PC was powered off or app was closed)
  useEffect(() => {
    if (!currentPlan.isDayStarted || !currentPlan.lastHeartbeatTimestamp) return;

    const lastBeatMs = new Date(currentPlan.lastHeartbeatTimestamp).getTime();
    const nowMs = Date.now();
    const elapsedSec = Math.floor((nowMs - lastBeatMs) / 1000);

    // If more than 60 seconds elapsed while app/PC was off
    if (elapsedSec >= 60) {
      const activeTask = currentPlan.activeTaskId
        ? currentPlan.tasks.find((t) => t.id === currentPlan.activeTaskId) || null
        : null;

      setOfflineCatchupData({
        elapsedSeconds: elapsedSec,
        lastBeatTime: new Date(lastBeatMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nowTime: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        activeTask,
      });
    }
  }, []);

  // Sleep / Hibernation resume gap detection
  const handleOfflineSleepDetected = (elapsedSec: number) => {
    if (elapsedSec < 45) return;
    const nowMs = Date.now();
    const lastBeatMs = nowMs - (elapsedSec * 1000);
    const activeTask = currentPlan.activeTaskId
      ? currentPlan.tasks.find((t) => t.id === currentPlan.activeTaskId) || null
      : null;

    setOfflineCatchupData({
      elapsedSeconds: elapsedSec,
      lastBeatTime: new Date(lastBeatMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      nowTime: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activeTask,
    });
  };

  const {
    startDay,
    endDay,
    reopenDay,
    startTask,
    pauseTask,
    completeTask,
    extendTaskTime,
    taskOverModalTask,
    setTaskOverModalTask,
    isPostureModalOpen,
    continuousWorkMinutes,
    handleAcknowledgePostureBreak,
    handleSnoozePostureBreak,
    handleTakeStretchBreak,
  } = useTimerEngine({
    currentPlan,
    setCurrentPlan,
    isToday,
    onOfflineSleepDetected: handleOfflineSleepDetected,
    activePlayingVideo,
  });

  const handleEndDay = () => {
    endDay();
    setIsDayReportModalOpen(true);
  };

  const handleMoveTasksToTomorrow = (tasksToCarryOver: Task[]) => {
    const tomorrowPlan = loadDayPlan(tomorrowStr);

    const newCarriedTasks: Task[] = tasksToCarryOver.map((t) => ({
      ...t,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'pending' as const,
      actualDuration: 0,
      completedAt: undefined,
    }));

    const updatedTomorrowPlan: DayPlan = {
      ...tomorrowPlan,
      tasks: [...tomorrowPlan.tasks, ...newCarriedTasks],
    };

    saveDayPlan(updatedTomorrowPlan);
    soundManager.playSuccessChime();
    sendDesktopNotification(
      '📅 Tasks Scheduled for Tomorrow',
      `Moved ${newCarriedTasks.length} task(s) into tomorrow's schedule (${tomorrowStr}).`
    );
  };

  const handleApplyOfflineTime = (appliedSeconds: number, target: 'work' | 'rest' | 'discard') => {
    if (target === 'work' && currentPlan.activeTaskId && appliedSeconds > 0) {
      const activeTaskId = currentPlan.activeTaskId;
      const updatedTasks = currentPlan.tasks.map((t) => {
        if (t.id === activeTaskId) {
          return { ...t, actualDuration: t.actualDuration + appliedSeconds };
        }
        return t;
      });
      const updatedPlan: DayPlan = {
        ...currentPlan,
        tasks: updatedTasks,
        usedWorkSeconds: currentPlan.usedWorkSeconds + appliedSeconds,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      setCurrentPlan(updatedPlan);
      saveDayPlan(updatedPlan);
    } else if (target === 'rest' && appliedSeconds > 0) {
      const updatedPlan: DayPlan = {
        ...currentPlan,
        usedRestSeconds: currentPlan.usedRestSeconds + appliedSeconds,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      setCurrentPlan(updatedPlan);
      saveDayPlan(updatedPlan);
    } else {
      // Discard offline gap, reset heartbeat to now
      const updatedPlan: DayPlan = {
        ...currentPlan,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      setCurrentPlan(updatedPlan);
      saveDayPlan(updatedPlan);
    }
    setOfflineCatchupData(null);
  };

  const handleUpdatePlan = (updated: DayPlan) => {
    setCurrentPlan(updated);
    saveDayPlan(updated);
  };

  const handleQuickAddTask = (title: string, duration: number, priority: PriorityLevel) => {
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      notes: '',
      plannedDuration: duration,
      actualDuration: 0,
      status: 'pending',
      priority,
    };

    const updated: DayPlan = {
      ...currentPlan,
      tasks: [...currentPlan.tasks, newTask],
    };
    setCurrentPlan(updated);
    saveDayPlan(updated);
  };

  const handleSelectTemplateToAdd = (tpl: TaskTemplate) => {
    setSelectedTemplateForAddition(tpl);
  };

  const handleConfirmAddTemplateTask = (customized: Omit<Task, 'id' | 'actualDuration' | 'status'>) => {
    const newTask: Task = {
      ...customized,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      actualDuration: 0,
      status: 'pending',
    };

    const updated: DayPlan = {
      ...currentPlan,
      tasks: [...currentPlan.tasks, newTask],
    };
    setCurrentPlan(updated);
    saveDayPlan(updated);
  };

  const handleSaveTaskAsTemplate = (task: Task) => {
    const newTemplate: TaskTemplate = {
      id: 'template_' + Date.now(),
      title: task.title,
      notes: task.notes,
      plannedDuration: task.plannedDuration,
      priority: task.priority,
      scheduledStartTime: task.scheduledStartTime,
    };
    const updated = saveTaskTemplate(newTemplate);
    setTaskTemplates(updated);
  };

  const handleSaveTemplate = (tpl: TaskTemplate) => {
    const updated = saveTaskTemplate(tpl);
    setTaskTemplates(updated);
  };

  const handleDeleteTemplate = (tplId: string) => {
    const updated = deleteTaskTemplate(tplId);
    setTaskTemplates(updated);
  };

  const handleUpdateSubjects = (updated: StudySubject[]) => {
    setStudySubjects(updated);
    saveStudySubjects(updated);
  };

  const handleSaveNotes = (taskId: string, newNotes: string) => {
    const updatedTasks = currentPlan.tasks.map((t) =>
      t.id === taskId ? { ...t, notes: newNotes } : t
    );
    const updated: DayPlan = {
      ...currentPlan,
      tasks: updatedTasks,
    };
    setCurrentPlan(updated);
    saveDayPlan(updated);
  };

  // Drag and Drop Handler from YouTube / Browser
  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragOver(true);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the window
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsGlobalDragOver(false);
    }
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragOver(false);

    const droppedText = e.dataTransfer.getData('text/uri-list') || 
                        e.dataTransfer.getData('text/plain') || 
                        e.dataTransfer.getData('text/html');

    if (droppedText) {
      // 1. Check if dropped text is a YouTube Playlist (e.g. list=PL... or playlist?list=...)
      const plId = extractYouTubePlaylistId(droppedText);
      if (plId) {
        setDroppedPlaylistId(plId);
        return;
      }

      // 2. Otherwise single video
      const vId = extractYouTubeId(droppedText);
      if (vId) {
        setDroppedVideoId(vId);
      }
    }
  };

  const handleImportPlaylist = (
    subjectId: string,
    playlistTitle: string,
    description: string,
    videos: Array<{ title: string; url: string; videoId: string; durationMinutes: number; notes?: string }>
  ) => {
    const updated = addImportedPlaylistToSubject(subjectId, playlistTitle, description, videos);
    setStudySubjects(updated);
    setActiveView('library');
  };

  const handleCreateSubjectAndImportPlaylist = (
    subjectName: string,
    playlistTitle: string,
    description: string,
    videos: Array<{ title: string; url: string; videoId: string; durationMinutes: number; notes?: string }>
  ) => {
    const withSubject = addStudySubject(subjectName);
    const newSubject = withSubject[withSubject.length - 1];
    const updated = addImportedPlaylistToSubject(newSubject.id, playlistTitle, description, videos);
    setStudySubjects(updated);
    setActiveView('library');
  };

  // Add dropped video to chosen playlist
  const handleAddDroppedVideo = (video: YouTubeVideo) => {
    if (video.type === 'work') {
      const updated: DayPlan = {
        ...currentPlan,
        youtubeWorkVideos: [...(currentPlan.youtubeWorkVideos || []), video],
      };
      setCurrentPlan(updated);
      saveDayPlan(updated);
    } else {
      const updated: DayPlan = {
        ...currentPlan,
        youtubeRestVideos: [...(currentPlan.youtubeRestVideos || []), video],
      };
      setCurrentPlan(updated);
      saveDayPlan(updated);
    }
  };

  const handleSaveDroppedToSubject = (
    subjectId: string,
    playlistId: string,
    video: { title: string; url: string; videoId: string; durationMinutes: number; notes?: string }
  ) => {
    const updated = addVideoToSubjectPlaylist(subjectId, playlistId, video);
    setStudySubjects(updated);
  };

  const handleMarkVideoDone = (video: YouTubeVideo, currentSeconds: number) => {
    const totalDurationSec = Math.max(currentSeconds, (video.durationMinutes || 0) * 60);
    // If work video, calculate remainder of video duration to credit to study/work budget
    const previouslyCredited = video.watchedDurationSeconds || 0;
    const remainderToAdd = video.type === 'work' 
      ? Math.max(0, totalDurationSec - previouslyCredited)
      : 0;

    const { updatedPlan, updatedSubjects } = updateVideoPlaybackState(
      selectedDate,
      video.videoId,
      totalDurationSec,
      true, // isWatched
      remainderToAdd
    );

    setCurrentPlan(updatedPlan);
    setStudySubjects(updatedSubjects);
    setActivePlayingVideo(null);

    soundManager.playSuccessChime();
    sendDesktopNotification(
      '🎉 Study Video Completed!',
      `Finished "${video.title}". Added to completed items and credited ${Math.round(totalDurationSec / 60)}m to study time!`
    );
  };

  const handleCloseVideoModal = (video: YouTubeVideo, currentSeconds: number) => {
    // Save last played timestamp so user can resume exactly where they left off
    const { updatedPlan, updatedSubjects } = updateVideoPlaybackState(
      selectedDate,
      video.videoId,
      currentSeconds,
      false,
      0
    );

    setCurrentPlan(updatedPlan);
    setStudySubjects(updatedSubjects);
    setActivePlayingVideo(null);
  };

  const currentHour = new Date().getHours();
  const isEvening = currentHour >= 19 || currentHour < 4;

  // Global Ctrl+F Search across Study Library Subjects, Concepts, Commands & TPs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        if (isMiniMode) return;
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMiniMode]);

  const activeRunningTask = currentPlan.activeTaskId
    ? currentPlan.tasks.find((t) => t.id === currentPlan.activeTaskId && t.status === 'in_progress') || null
    : null;

  // Complete a Task + two-way sync completion back to linked Study Library TP or Part concepts
  const handleCompleteTask = (taskId: string) => {
    const completedTask = currentPlan.tasks.find((t) => t.id === taskId);
    completeTask(taskId);
    if (!completedTask) return;

    const target = resolveTaskStudyNavigation(completedTask, studySubjects);
    if (target) {
      const updatedSubjects = target.tpId
        ? setStudyTPCompletedState(target.subjectId, target.partId, target.tpId, true)
        : setStudyPartConceptsCompleted(target.subjectId, target.partId, true);
      setStudySubjects(updatedSubjects);
    }
  };

  const handleNavigateStudyTarget = (target: TaskStudyLink) => {
    setPendingStudyNav({ ...target, nonce: Date.now() });
    setActiveView('library');
  };

  const handleClickHeaderActiveTask = (task: Task) => {
    const target = resolveTaskStudyNavigation(task, studySubjects);
    if (target) {
      handleNavigateStudyTarget(target);
    } else {
      setActiveView('tracker');
    }
  };

  if (isMiniMode) {
    return (
      <div className="h-screen w-screen bg-transparent text-zinc-100 flex items-center justify-center p-0 m-0 select-none overflow-hidden">
        <MiniWidget
          plan={currentPlan}
          onExpand={handleExitMiniMode}
          onPauseTask={pauseTask}
          onCompleteTask={handleCompleteTask}
          onExtendTask={extendTaskTime}
          onStartNextTask={() => {
            const nextPending = currentPlan.tasks.find((t) => t.status === 'pending');
            if (nextPending) startTask(nextPending.id);
          }}
          onStartDay={startDay}
          activePlayingVideo={activePlayingVideo}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
          isStandaloneWindow={true}
        />
      </div>
    );
  }

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  const appShellContent = (
    <div 
      className={`${
        isElectron ? 'h-full w-full overflow-y-auto' : 'min-h-screen'
      } bg-[#121214] text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white relative`}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      
      {/* Global Drag-and-Drop Visual Indicator */}
      {isGlobalDragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-black/75 border-2 border-dashed border-zinc-400 m-3 rounded-3xl flex flex-col items-center justify-center text-center p-6 backdrop-blur-xs animate-fade-in">
          <UploadCloud className="w-16 h-16 text-zinc-200 mb-3 animate-bounce" />
          <h3 className="text-xl font-bold font-display text-white">
            Drop YouTube Video to Schedule
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            Release anywhere to auto-fetch details and pick whether to add to Work or Entertainment!
          </p>
        </div>
      )}

      {/* Top Header */}
      <Header
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        activeView={activeView}
        setActiveView={setActiveView}
        isMiniMode={isMiniMode}
        setIsMiniMode={handleToggleMiniMode}
        onOpenAIDigest={() => setIsAIDigestModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isDayStarted={currentPlan.isDayStarted}
        isDayEnded={currentPlan.isDayEnded}
        onEndDay={handleEndDay}
        onOpenDayReport={() => setIsDayReportModalOpen(true)}
        activeTask={activeRunningTask}
        onPauseTask={pauseTask}
        onCompleteTask={handleCompleteTask}
        onClickActiveTask={handleClickHeaderActiveTask}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 pb-24 md:pb-6">
        
        {/* Evening Planning Reminder */}
        {isEvening && activeView === 'tracker' && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3.5 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">
                  Evening Planning
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Ready for tomorrow? Take 2 minutes to plan tomorrow's tasks, notes, and YouTube playlists.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {currentPlan.isDayStarted && !currentPlan.isDayEnded && (
                <button
                  onClick={handleEndDay}
                  className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-white font-bold rounded-lg text-xs border border-purple-800/60 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  <Moon className="w-3 h-3 text-purple-400" />
                  <span>End Day</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedDate(tomorrowStr);
                  setActiveView('planner');
                }}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <span>Plan Tomorrow</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* View 1: Tracker View (Today) */}
        {activeView === 'tracker' && (
          <div>
            <BudgetOverview plan={currentPlan} />

            <ActiveTaskHUD
              plan={currentPlan}
              onStartDay={startDay}
              onEndDay={handleEndDay}
              onOpenDayReport={() => setIsDayReportModalOpen(true)}
              onReopenDay={reopenDay}
              onPauseTask={pauseTask}
              onCompleteTask={handleCompleteTask}
              onExtendTask={extendTaskTime}
              onOpenNotes={setNoteModalTask}
              isToday={isToday}
              onEnterMiniMode={handleEnterMiniMode}
            />

            <DayTracker
              plan={currentPlan}
              onStartTask={(taskId) => {
                startTask(taskId);
                const task = currentPlan.tasks.find((t) => t.id === taskId);
                const target = task ? resolveTaskStudyNavigation(task, studySubjects) : null;
                if (target) {
                  setPendingStudyNav({ ...target, nonce: Date.now() });
                  setActiveView('library');
                }
              }}
              onPauseTask={pauseTask}
              onCompleteTask={handleCompleteTask}
              onOpenNotes={setNoteModalTask}
              onQuickAddTask={handleQuickAddTask}
              onGoToPlanner={() => setActiveView('planner')}
              taskTemplates={taskTemplates}
              onSelectTemplate={handleSelectTemplateToAdd}
              onSaveTaskAsTemplate={handleSaveTaskAsTemplate}
              onOpenScheduleYouTubeModal={() => setIsScheduleYouTubeModalOpen(true)}
              onPlayVideo={(video) => setActivePlayingVideo(video)}
            />
          </div>
        )}

        {/* View 2: Schedule Planner */}
        {activeView === 'planner' && (
          <DayPlanner
            plan={currentPlan}
            onUpdatePlan={handleUpdatePlan}
            onOpenNotes={setNoteModalTask}
            onSwitchToTracker={() => setActiveView('tracker')}
            isTomorrow={isTomorrow}
            taskTemplates={taskTemplates}
            onOpenCreateTemplateModal={() => setIsCreateTemplateModalOpen(true)}
            onSaveTaskAsTemplate={handleSaveTaskAsTemplate}
            onSelectTemplate={handleSelectTemplateToAdd}
            onOpenScheduleYouTubeModal={() => setIsScheduleYouTubeModalOpen(true)}
            onOpenAIDigest={() => setIsAIDigestModalOpen(true)}
          />
        )}

        {/* View 3: Study Library */}
        {activeView === 'library' && (
          <StudyLibrary
            subjects={studySubjects}
            currentPlan={currentPlan}
            onUpdatePlan={handleUpdatePlan}
            onUpdateSubjects={handleUpdateSubjects}
            onPlayVideo={(video) => setActivePlayingVideo(video)}
            onOpenImportPlaylist={() => setIsImportPlaylistModalOpen(true)}
            onOpenAIDigest={(subjectId) => {
              setAiDigestSubjectId(subjectId);
              setIsAIDigestModalOpen(true);
            }}
            navigationTarget={pendingStudyNav}
            onClearNavigationTarget={() => setPendingStudyNav(null)}
          />
        )}

        {/* View 4: History */}
        {activeView === 'history' && (
          <HistoryView
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveView('tracker');
            }}
          />
        )}
      </main>



      {/* Dragged & Dropped Video Destination Modal */}
      <DropVideoModal
        videoId={droppedVideoId}
        isOpen={!!droppedVideoId}
        onClose={() => setDroppedVideoId(null)}
        plan={currentPlan}
        onAddVideoToPlaylist={handleAddDroppedVideo}
        subjects={studySubjects}
        onSaveToSubjectPlaylist={handleSaveDroppedToSubject}
      />

      {/* Dragged & Dropped YouTube Playlist Destination Modal */}
      <DropPlaylistModal
        playlistId={droppedPlaylistId}
        isOpen={!!droppedPlaylistId || isImportPlaylistModalOpen}
        onClose={() => {
          setDroppedPlaylistId(null);
          setIsImportPlaylistModalOpen(false);
        }}
        subjects={studySubjects}
        onImportPlaylist={handleImportPlaylist}
        onCreateSubjectAndImport={handleCreateSubjectAndImportPlaylist}
      />

      {/* 1. Schedule YouTube Playlists Studio Modal */}
      <ScheduleYouTubeModal
        isOpen={isScheduleYouTubeModalOpen}
        onClose={() => setIsScheduleYouTubeModalOpen(false)}
        plan={currentPlan}
        onUpdatePlan={handleUpdatePlan}
        onPlayVideo={(video) => setActivePlayingVideo(video)}
        subjects={studySubjects}
      />

      {/* 2. Distraction-Free Embedded YouTube Player Modal */}
      <YouTubePlayerModal
        video={activePlayingVideo}
        isOpen={!!activePlayingVideo}
        onClose={() => setActivePlayingVideo(null)}
        onMarkDone={handleMarkVideoDone}
        onCloseWithTimestamp={handleCloseVideoModal}
      />

      {/* 3. Review & Customize Template Task Before Adding Modal */}
      <AddTemplateTaskModal
        template={selectedTemplateForAddition}
        isOpen={!!selectedTemplateForAddition}
        onClose={() => setSelectedTemplateForAddition(null)}
        onConfirmAdd={handleConfirmAddTemplateTask}
      />

      {/* 4. Reusable Task Template Creator & Manager Modal */}
      <CreateTemplateModal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        templates={taskTemplates}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* 5. AI Lecture & TP Homework Digest Studio Modal */}
      <AIDigestModal
        isOpen={isAIDigestModalOpen}
        onClose={() => {
          setIsAIDigestModalOpen(false);
          setAiDigestSubjectId(undefined);
        }}
        subjects={studySubjects}
        currentPlan={currentPlan}
        onUpdatePlan={handleUpdatePlan}
        onUpdateSubjects={handleUpdateSubjects}
        onPlayVideo={(video) => setActivePlayingVideo(video)}
        initialSubjectId={aiDigestSubjectId}
        onViewSubjectRoadmap={(subjectId) => {
          setActiveView('library');
          setIsAIDigestModalOpen(false);
          setAiDigestSubjectId(undefined);
        }}
      />

      {/* 5. Notes Modal */}
      <TaskNotesModal
        task={noteModalTask}
        isOpen={!!noteModalTask}
        onClose={() => setNoteModalTask(null)}
        onSaveNotes={handleSaveNotes}
      />

      {/* 6. Task Time-Up Confirmation Modal */}
      <TaskOverModal
        task={taskOverModalTask}
        isOpen={!!taskOverModalTask}
        onComplete={handleCompleteTask}
        onExtend={extendTaskTime}
        onClose={() => setTaskOverModalTask(null)}
      />

      {/* 7. Offline Time Reconcile Catchup Modal (When PC was turned off / sleeping) */}
      <OfflineCatchupModal
        isOpen={!!offlineCatchupData}
        data={offlineCatchupData}
        onApply={handleApplyOfflineTime}
        onClose={() => setOfflineCatchupData(null)}
      />

      {/* 8. Day Performance & Productivity Report Modal */}
      <DayReportModal
        isOpen={isDayReportModalOpen}
        onClose={() => setIsDayReportModalOpen(false)}
        plan={currentPlan}
        onReopenDay={reopenDay}
        onMoveTasksToTomorrow={handleMoveTasksToTomorrow}
      />

      {/* 9. Settings, Strict Mode & Data Backup Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onDataRestored={() => {
          setCurrentPlan(loadDayPlan(selectedDate));
          setStudySubjects(loadStudySubjects());
          setTaskTemplates(loadTaskTemplates());
        }}
      />

      {/* 10. 40-Min Posture & Mind Break Modal */}
      <PostureBreakModal
        isOpen={isPostureModalOpen}
        continuousMinutes={continuousWorkMinutes}
        onTakeBreak={handleTakeStretchBreak}
        onSnooze={handleSnoozePostureBreak}
        onDismiss={handleAcknowledgePostureBreak}
      />

      {/* 11. Global Ctrl+F Study Search Modal */}
      <GlobalStudySearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        subjects={studySubjects}
        onNavigateToTarget={handleNavigateStudyTarget}
      />

      {/* Subtle Minimal Footer */}
      <footer className="border-t border-zinc-800/80 py-3 text-center text-[11px] text-zinc-600 mb-14 md:mb-0">
        FocusFlow • Dynamic Energy & Rest Management
      </footer>

      {/* Native Mobile Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAIDigest={() => setIsAIDigestModalOpen(true)}
      />
    </div>
  );

  if (isElectron) {
    return (
      <div className="h-screen w-screen bg-[#121214] text-zinc-100 flex flex-col overflow-hidden">
        <TitleBar />
        <div
          className="flex-1 min-h-0 relative overflow-hidden"
          style={{ transform: 'translateZ(0)' }}
        >
          {appShellContent}
        </div>
      </div>
    );
  }

  return appShellContent;
}

export default App;
