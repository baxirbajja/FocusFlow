import { useState, useEffect, useRef, useCallback } from 'react';
import { DayPlan, Task, YouTubeVideo } from '../types';
import { saveDayPlan, rebalanceTaskSchedule, getFormattedDate, loadAppSettings } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { sendDesktopNotification } from '../utils/notifications';

interface UseTimerEngineProps {
  currentPlan: DayPlan;
  setCurrentPlan: React.Dispatch<React.SetStateAction<DayPlan>>;
  isToday: boolean;
  onOfflineSleepDetected?: (elapsedSeconds: number) => void;
  activePlayingVideo?: YouTubeVideo | null;
}

export function useTimerEngine({
  currentPlan,
  setCurrentPlan,
  isToday,
  onOfflineSleepDetected,
  activePlayingVideo,
}: UseTimerEngineProps) {
  const [taskOverModalTask, setTaskOverModalTask] = useState<Task | null>(null);
  const [hasAlertedTaskOver, setHasAlertedTaskOver] = useState<Record<string, boolean>>({});
  const hasAlertedScheduledTask = useRef<Record<string, boolean>>({});
  const lastRestWarningTimestamp = useRef<number>(0);
  const lastTickTime = useRef<number>(Date.now());
  const lastDiskSaveTime = useRef<number>(Date.now());

  // Continuous Work & Posture Tracker (e.g. 40 min focus)
  const continuousWorkSecondsRef = useRef<number>(0);
  const continuousRestSecondsRef = useRef<number>(0);
  const hasAlertedPostureRef = useRef<boolean>(false);
  const [isPostureModalOpen, setIsPostureModalOpen] = useState<boolean>(false);
  const [continuousWorkMinutes, setContinuousWorkMinutes] = useState<number>(0);

  // Reference for stable state during 1-sec intervals
  const planRef = useRef<DayPlan>(currentPlan);
  useEffect(() => {
    planRef.current = currentPlan;
  }, [currentPlan]);

  const activePlayingVideoRef = useRef<YouTubeVideo | null | undefined>(activePlayingVideo);
  useEffect(() => {
    activePlayingVideoRef.current = activePlayingVideo;
  }, [activePlayingVideo]);

  // Ensure disk save on window close/unload so no buffered seconds are ever lost
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (planRef.current && planRef.current.isDayStarted && !planRef.current.isDayEnded) {
        saveDayPlan(planRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Main 1-Second Timer Heartbeat
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      const plan = planRef.current;
      const settings = loadAppSettings();
      const nowMs = Date.now();
      const nowDate = new Date(nowMs);

      // Check scheduled task start time reminders (e.g. at 14:30)
      if (settings.taskRemindersEnabled && plan.tasks?.length > 0) {
        const currentHHMM = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;
        plan.tasks.forEach((task) => {
          if (
            task.status === 'pending' &&
            task.scheduledStartTime &&
            task.scheduledStartTime === currentHHMM &&
            !hasAlertedScheduledTask.current[task.id]
          ) {
            hasAlertedScheduledTask.current[task.id] = true;
            soundManager.playStartChime();
            sendDesktopNotification(
              `🔔 Scheduled Task: "${task.title}"`,
              `It's ${task.scheduledStartTime}! Scheduled time for "${task.title}" (${task.plannedDuration}m). Click to start.`,
              'normal'
            );
          }
        });
      }

      // Check Auto-Start at target hour (e.g. 8:00 AM) if day hasn't started yet
      if (!plan.isDayStarted && !plan.isDayEnded && settings.autoStartDay) {
        const [targetHour, targetMin] = (settings.autoStartTime || '08:00').split(':').map(Number);
        const targetTimeToday = new Date(nowDate);
        targetTimeToday.setHours(targetHour || 8, targetMin || 0, 0, 0);

        if (nowMs >= targetTimeToday.getTime()) {
          const elapsedSecSinceAutoStart = Math.max(0, Math.floor((nowMs - targetTimeToday.getTime()) / 1000));
          const burnedRestSec = Math.min(elapsedSecSinceAutoStart, 86400);

          const autoStartedPlan: DayPlan = {
            ...plan,
            isDayStarted: true,
            dayStartedAt: targetTimeToday.toISOString(),
            lastHeartbeatTimestamp: nowDate.toISOString(),
            usedRestSeconds: plan.usedRestSeconds + burnedRestSec,
          };

          planRef.current = autoStartedPlan;
          setCurrentPlan(autoStartedPlan);
          saveDayPlan(autoStartedPlan);
          lastDiskSaveTime.current = nowMs;

          soundManager.playStartChime();
          const burnedMinutes = Math.floor(burnedRestSec / 60);
          sendDesktopNotification(
            '🌅 8:00 AM Auto-Tracker Started!',
            burnedMinutes > 0
              ? `FocusFlow auto-started at ${settings.autoStartTime}. ${burnedMinutes}m burned into your rest budget while idle. Pick your task now!`
              : `8:00 AM arrived! Daily timer has auto-started. Unstarted time counts as rest!`,
            'critical'
          );
          return;
        }
      }

      if (!plan.isDayStarted || plan.isDayEnded) return;

      const deltaMs = nowMs - lastTickTime.current;
      lastTickTime.current = nowMs;

      // If PC woke up from sleep / laptop opened after 45+ seconds of suspension
      if (deltaMs > 45000 && onOfflineSleepDetected) {
        onOfflineSleepDetected(Math.floor(deltaMs / 1000));
        return;
      }

      const restBudgetSec = plan.restHoursBudget * 60;
      const playingVideo = activePlayingVideoRef.current;
      const isWorkingOrWatching = !!plan.activeTaskId || (!!playingVideo && playingVideo.type === 'work');

      // Track continuous work vs rest
      if (isWorkingOrWatching) {
        continuousWorkSecondsRef.current += 1;
        continuousRestSecondsRef.current = 0;

        const postureIntervalMinutes = settings.postureBreakIntervalMinutes || 40;
        const postureIntervalSec = postureIntervalMinutes * 60;
        const isPostureEnabled = settings.postureBreakRemindersEnabled !== false;

        if (isPostureEnabled && continuousWorkSecondsRef.current >= postureIntervalSec && !hasAlertedPostureRef.current) {
          hasAlertedPostureRef.current = true;
          setContinuousWorkMinutes(Math.floor(continuousWorkSecondsRef.current / 60));
          setIsPostureModalOpen(true);
          soundManager.playPostureChime();
          sendDesktopNotification(
            `🧘 ${postureIntervalMinutes}-Min Posture & Mind Break!`,
            `You've been working or watching continuously for ${postureIntervalMinutes} minutes! Stand up, stretch your neck and back, relax your eyes, and give your mind a quick rest.`,
            'critical'
          );
        }
      } else {
        continuousRestSecondsRef.current += 1;
        // If the user rests for at least 90 seconds (a genuine break), reset the continuous work counter!
        if (continuousRestSecondsRef.current >= 90) {
          continuousWorkSecondsRef.current = 0;
          hasAlertedPostureRef.current = false;
        }
      }

      // Case 1: Active Task is running
      if (plan.activeTaskId) {
        const activeTaskId = plan.activeTaskId;
        let triggeredOver = false;
        let currentTaskObj: Task | null = null;

        const updatedTasks = plan.tasks.map((task) => {
          if (task.id === activeTaskId && task.status === 'in_progress') {
            const newActual = task.actualDuration + 1;
            const targetSec = task.plannedDuration * 60;
            currentTaskObj = { ...task, actualDuration: newActual };

            // Check if duration reached and hasn't alerted yet
            if (newActual >= targetSec && !hasAlertedTaskOver[task.id]) {
              triggeredOver = true;
            }

            return currentTaskObj;
          }
          return task;
        });

        const updatedPlan: DayPlan = {
          ...plan,
          tasks: updatedTasks,
          usedWorkSeconds: plan.usedWorkSeconds + 1,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        // Real-time seconds in memory
        setCurrentPlan(updatedPlan);

        // Write to disk every 1 minute (60,000ms)
        if (nowMs - lastDiskSaveTime.current >= 60000) {
          lastDiskSaveTime.current = nowMs;
          saveDayPlan(updatedPlan);
        }

        if (triggeredOver && currentTaskObj) {
          setHasAlertedTaskOver((prev) => ({ ...prev, [activeTaskId]: true }));
          soundManager.playTaskOverChime();
          sendDesktopNotification(
            '⏰ Time is Up!',
            `Scheduled time for "${(currentTaskObj as Task).title}" has ended. Did you finish, or need more time?`,
            'critical'
          );
          setTaskOverModalTask(currentTaskObj);
        }
      } 
      // Case 2: Study/Work Video is playing (Rest budget is frozen, counts toward work time)
      else if (playingVideo && playingVideo.type === 'work') {
        const updatedPlan: DayPlan = {
          ...plan,
          usedWorkSeconds: plan.usedWorkSeconds + 1,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        setCurrentPlan(updatedPlan);

        // Write to disk every 1 minute
        if (nowMs - lastDiskSaveTime.current >= 60000) {
          lastDiskSaveTime.current = nowMs;
          saveDayPlan(updatedPlan);
        }
      }
      // Case 3: IDLE / REST MODE (Day started, no task and no study video running)
      else {
        const newUsedRest = plan.usedRestSeconds + 1;
        const updatedPlan: DayPlan = {
          ...plan,
          usedRestSeconds: newUsedRest,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        setCurrentPlan(updatedPlan);

        // Write to disk every 1 minute
        if (nowMs - lastDiskSaveTime.current >= 60000) {
          lastDiskSaveTime.current = nowMs;
          saveDayPlan(updatedPlan);
        }

        // Check if rest budget is exceeded
        if (newUsedRest > restBudgetSec) {
          const now = Date.now();
          const warningIntervalMs = settings.strictModeEnabled ? 90000 : 180000;
          if (now - lastRestWarningTimestamp.current > warningIntervalMs) {
            lastRestWarningTimestamp.current = now;
            soundManager.playRestExceededSiren();
            sendDesktopNotification(
              settings.strictModeEnabled ? '🚨 STRICT ALERT: Rest Budget Exceeded!' : '⚠️ Rest Budget Exceeded!',
              `You have used all planned rest time for today (${Math.floor(newUsedRest / 60)}m used). Start your next task now to stop wasting time!`,
              'critical'
            );
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isToday, hasAlertedTaskOver, setCurrentPlan, onOfflineSleepDetected]);

  // Actions
  const startDay = useCallback(() => {
    setCurrentPlan((prev) => {
      const updated: DayPlan = {
        ...prev,
        isDayStarted: true,
        dayStartedAt: new Date().toISOString(),
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();
      soundManager.playStartChime();
      sendDesktopNotification(
        '🌅 Day Started!',
        'Your daily clock is active. Pick your first task or remember that your rest budget is counting down!'
      );
      return updated;
    });
  }, [setCurrentPlan]);

  const startTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: 'in_progress' as const };
        }
        // Pause any previously in_progress task
        if (t.status === 'in_progress') {
          return { ...t, status: 'pending' as const };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: taskId,
        tasks: updatedTasks,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();
      soundManager.playStartChime();
      if (task) {
        sendDesktopNotification('🚀 Task Started', `Now tracking: "${task.title}". Focus mode engaged!`);
      }
      return updated;
    });
  }, [setCurrentPlan]);

  const pauseTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: 'pending' as const };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: null,
        tasks: updatedTasks,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();
      return updated;
    });
  }, [setCurrentPlan]);

  const completeTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
          };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: prev.activeTaskId === taskId ? null : prev.activeTaskId,
        tasks: updatedTasks,
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();

      // Play subtle success chime
      soundManager.playSuccessChime();

      if (task) {
        sendDesktopNotification('Completed Task', `Finished "${task.title}".`);
      }

      return updated;
    });
    setTaskOverModalTask(null);
  }, [setCurrentPlan]);

  const extendTaskTime = useCallback((taskId: string, extraMinutes: number) => {
    setCurrentPlan((prev) => {
      // Rebalance schedule dynamically so subsequent tasks adapt
      const rebalancedTasks = rebalanceTaskSchedule(prev.tasks, taskId, extraMinutes);

      const updated: DayPlan = {
        ...prev,
        tasks: rebalancedTasks,
      };
      saveDayPlan(updated);

      // Reset alert for this task so it can alert again when new time is reached
      setHasAlertedTaskOver((a) => ({ ...a, [taskId]: false }));
      soundManager.playStartChime();

      sendDesktopNotification(
        '⏳ Task Extended',
        `Added +${extraMinutes}m. Remaining schedule automatically shifted to stay in sync.`
      );

      return updated;
    });
    setTaskOverModalTask(null);
  }, [setCurrentPlan]);

  const endDay = useCallback(() => {
    setCurrentPlan((prev) => {
      // Pause any running task
      const updatedTasks = prev.tasks.map((t) => {
        if (t.status === 'in_progress') {
          return { ...t, status: 'pending' as const };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        isDayEnded: true,
        dayEndedAt: new Date().toISOString(),
        activeTaskId: null,
        tasks: updatedTasks,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();
      soundManager.playSuccessChime();
      sendDesktopNotification(
        '🌙 Day Completed',
        'Daily tracking stopped. Here is your Day Summary & Productivity Report.'
      );
      return updated;
    });
  }, [setCurrentPlan]);

  const reopenDay = useCallback(() => {
    setCurrentPlan((prev) => {
      const updated: DayPlan = {
        ...prev,
        isDayEnded: false,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      lastDiskSaveTime.current = Date.now();
      soundManager.playStartChime();
      sendDesktopNotification('🔄 Day Tracking Resumed', 'Daily clock restarted.');
      return updated;
    });
  }, [setCurrentPlan]);

  const handleAcknowledgePostureBreak = useCallback(() => {
    continuousWorkSecondsRef.current = 0;
    hasAlertedPostureRef.current = false;
    setIsPostureModalOpen(false);
  }, []);

  const handleSnoozePostureBreak = useCallback(() => {
    const postureIntervalMinutes = loadAppSettings().postureBreakIntervalMinutes || 40;
    const postureIntervalSec = postureIntervalMinutes * 60;
    continuousWorkSecondsRef.current = Math.max(0, postureIntervalSec - 300);
    hasAlertedPostureRef.current = false;
    setIsPostureModalOpen(false);
  }, []);

  const handleTakeStretchBreak = useCallback(() => {
    setCurrentPlan((prev) => {
      if (!prev.activeTaskId) return prev;
      const updatedTasks = prev.tasks.map((t) =>
        t.id === prev.activeTaskId ? { ...t, status: 'pending' as const } : t
      );
      const updated = {
        ...prev,
        activeTaskId: null,
        tasks: updatedTasks,
      };
      saveDayPlan(updated);
      return updated;
    });

    continuousWorkSecondsRef.current = 0;
    hasAlertedPostureRef.current = false;
    setIsPostureModalOpen(false);
    soundManager.playStartChime();
    sendDesktopNotification(
      '🌿 Stretch Break Started',
      'Task paused. Take 3 minutes to walk around, stretch, and hydrate!'
    );
  }, [setCurrentPlan]);

  return {
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
    setIsPostureModalOpen,
    continuousWorkMinutes,
    handleAcknowledgePostureBreak,
    handleSnoozePostureBreak,
    handleTakeStretchBreak,
  };
}
